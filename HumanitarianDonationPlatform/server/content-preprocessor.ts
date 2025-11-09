import nlp from 'compromise';
// @ts-ignore - No type definitions available for sentiment
import Sentiment from 'sentiment';

export interface ScrapedArticle {
  title: string;
  body: string;
  source: string;
  url?: string;
  date?: string;
  credibility: 'verified_un' | 'verified_academic' | 'news_media';
}

export interface ProcessedArticle extends ScrapedArticle {
  entities: {
    locations: string[];
    organizations: string[];
    persons: string[];
    dates: string[];
  };
  readability: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  wordCount: number;
  keyPhrases: string[];
}

export class ContentPreprocessor {
  private sentiment: typeof Sentiment;

  constructor() {
    this.sentiment = new Sentiment();
  }

  /**
   * Preprocess a single article: clean, analyze, extract entities
   */
  preprocessArticle(article: ScrapedArticle): ProcessedArticle {
    // Clean HTML and excessive whitespace
    const cleanedBody = this.cleanText(article.body);
    
    // Extract entities using compromise
    const entities = this.extractEntities(cleanedBody);
    
    // Calculate readability score
    const readability = this.calculateReadability(cleanedBody);
    
    // Analyze sentiment
    const sentimentScore = this.analyzeSentiment(cleanedBody);
    
    // Extract key phrases
    const keyPhrases = this.extractKeyPhrases(cleanedBody);
    
    // Count words
    const wordCount = cleanedBody.split(/\s+/).length;

    return {
      ...article,
      body: cleanedBody,
      entities,
      readability,
      sentiment: sentimentScore,
      wordCount,
      keyPhrases,
    };
  }

  /**
   * Preprocess multiple articles
   */
  preprocessArticles(articles: ScrapedArticle[]): ProcessedArticle[] {
    return articles.map(article => this.preprocessArticle(article));
  }

  /**
   * Clean text: remove HTML, excessive whitespace
   */
  private cleanText(text: string): string {
    // Remove HTML tags (basic)
    let cleaned = text.replace(/<[^>]*>/g, ' ');
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    
    return cleaned;
  }

  /**
   * Extract named entities using compromise
   */
  private extractEntities(text: string) {
    const doc = nlp(text);
    
    // Extract locations (places, countries, cities)
    const locations = doc.places().out('array') as string[];
    
    // Extract organizations
    const organizations = doc.organizations().out('array') as string[];
    
    // Extract people
    const persons = doc.people().out('array') as string[];
    
    // Extract dates (compromise doesn't have .dates() method, use custom extraction)
    const dateMatches = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}/gi) || [];
    
    return {
      locations: Array.from(new Set(locations)).slice(0, 10), // Dedupe and limit
      organizations: Array.from(new Set(organizations)).slice(0, 10),
      persons: Array.from(new Set(persons)).slice(0, 10),
      dates: Array.from(new Set(dateMatches)).slice(0, 5),
    };
  }

  /**
   * Calculate Flesch Reading Ease score
   */
  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    
    if (sentences.length === 0 || words.length === 0) {
      return 0;
    }
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    // Clamp between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length === 0) return 0;
    
    const vowels = 'aeiouy';
    let syllableCount = 0;
    let previousWasVowel = false;
    
    for (const char of word) {
      const isVowel = vowels.includes(char);
      if (isVowel && !previousWasVowel) {
        syllableCount++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent 'e'
    if (word.endsWith('e') && syllableCount > 1) {
      syllableCount--;
    }
    
    return Math.max(1, syllableCount);
  }

  /**
   * Analyze sentiment using sentiment library
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // Limit text length for performance
    const limitedText = text.slice(0, 5000);
    
    const result = this.sentiment.analyze(limitedText);
    const score = result.score;
    
    if (score > 1) {
      return 'positive';
    } else if (score < -1) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  /**
   * Extract key phrases using compromise
   */
  private extractKeyPhrases(text: string): string[] {
    const doc = nlp(text);
    
    // Extract noun phrases
    const nounPhrases = doc.nouns().out('array') as string[];
    
    // Extract important terms (people, places, orgs)
    const terms = doc.terms().out('array') as string[];
    
    // Combine and dedupe
    const allPhrases = [...nounPhrases, ...terms];
    const uniquePhrases = Array.from(new Set(allPhrases));
    
    // Filter out common words and sort by length (longer phrases often more meaningful)
    const filtered = uniquePhrases
      .filter(phrase => phrase.length > 3 && phrase.split(' ').length <= 4)
      .sort((a, b) => b.length - a.length)
      .slice(0, 20);
    
    return filtered;
  }

  /**
   * Aggregate multiple articles into a context summary
   */
  aggregateArticles(articles: ProcessedArticle[]): {
    allEntities: ProcessedArticle['entities'];
    avgReadability: number;
    sentimentDistribution: Record<string, number>;
    totalWordCount: number;
    topKeyPhrases: string[];
    sources: string[];
  } {
    // Combine all entities
    const allEntities = {
      locations: [] as string[],
      organizations: [] as string[],
      persons: [] as string[],
      dates: [] as string[],
    };
    
    articles.forEach(article => {
      allEntities.locations.push(...article.entities.locations);
      allEntities.organizations.push(...article.entities.organizations);
      allEntities.persons.push(...article.entities.persons);
      allEntities.dates.push(...article.entities.dates);
    });
    
    // Deduplicate and limit
    allEntities.locations = Array.from(new Set(allEntities.locations)).slice(0, 20);
    allEntities.organizations = Array.from(new Set(allEntities.organizations)).slice(0, 15);
    allEntities.persons = Array.from(new Set(allEntities.persons)).slice(0, 15);
    allEntities.dates = Array.from(new Set(allEntities.dates)).slice(0, 10);
    
    // Calculate average readability
    const avgReadability = articles.length > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.readability, 0) / articles.length)
      : 0;
    
    // Sentiment distribution
    const sentimentDistribution = {
      positive: articles.filter(a => a.sentiment === 'positive').length,
      negative: articles.filter(a => a.sentiment === 'negative').length,
      neutral: articles.filter(a => a.sentiment === 'neutral').length,
    };
    
    // Total word count
    const totalWordCount = articles.reduce((sum, a) => sum + a.wordCount, 0);
    
    // Aggregate key phrases
    const allKeyPhrases = articles.flatMap(a => a.keyPhrases);
    const phraseFrequency = allKeyPhrases.reduce((acc, phrase) => {
      acc[phrase] = (acc[phrase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topKeyPhrases = Object.entries(phraseFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([phrase]) => phrase);
    
    // List of sources
    const sources = Array.from(new Set(articles.map(a => a.source)));
    
    return {
      allEntities,
      avgReadability,
      sentimentDistribution,
      totalWordCount,
      topKeyPhrases,
      sources,
    };
  }
}
