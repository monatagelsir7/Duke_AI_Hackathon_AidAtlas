import { ContentPreprocessor, type ScrapedArticle, type ProcessedArticle } from './content-preprocessor';
import { OpenAIService } from './openai-service';
import type { IStorage } from './storage';

interface PipelineConfig {
  openaiApiKey?: string;
  enableQualityControl: boolean;
  minArticlesRequired: number;
}

interface PipelineResult {
  success: boolean;
  country: string;
  conflictId?: string;
  errors: string[];
  warnings: string[];
  qualityScore?: number;
}

interface QualityControlResult {
  biasScore: number;
  emotionalToneScore: number;
  factCheckWarnings: string[];
  overallScore: number;
  passed: boolean;
}

export class ContentPipeline {
  private preprocessor: ContentPreprocessor;
  private openaiService?: OpenAIService;
  private storage: IStorage;
  private config: PipelineConfig;

  constructor(storage: IStorage, config: PipelineConfig) {
    this.storage = storage;
    this.config = config;
    this.preprocessor = new ContentPreprocessor();
    
    // Initialize OpenAI service if API key is provided
    if (config.openaiApiKey) {
      this.openaiService = new OpenAIService(config.openaiApiKey);
    }
  }

  /**
   * Process scraped content for a specific country
   */
  async processCountry(
    country: string,
    region: string,
    rawArticles: Array<{
      title: string;
      body: string;
      source: string;
      url?: string;
      date?: string;
    }>
  ): Promise<PipelineResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check minimum articles requirement
      if (rawArticles.length < this.config.minArticlesRequired) {
        errors.push(`Insufficient articles: ${rawArticles.length} (minimum: ${this.config.minArticlesRequired})`);
        return {
          success: false,
          country,
          errors,
          warnings,
        };
      }

      // Step 1: Preprocess articles
      console.log(`[Pipeline] Preprocessing ${rawArticles.length} articles for ${country}`);
      const scrapedArticles: ScrapedArticle[] = rawArticles.map(article => ({
        ...article,
        credibility: this.determineCredibility(article.source),
      }));

      const processedArticles = this.preprocessor.preprocessArticles(scrapedArticles);

      // Get aggregated context
      const context = this.preprocessor.aggregateArticles(processedArticles);

      // Check if we have enough quality content
      if (context.totalWordCount < 500) {
        warnings.push('Low total word count - may result in thin content');
      }

      // Step 2: Generate AI content (if OpenAI is configured)
      if (!this.openaiService) {
        errors.push('OpenAI service not configured - cannot generate content');
        return {
          success: false,
          country,
          errors,
          warnings,
        };
      }

      console.log(`[Pipeline] Generating swipe card for ${country}`);
      const swipeCardResult = await this.openaiService.generateSwipeCard(
        { country, region },
        processedArticles
      );

      // Check validation
      if (!swipeCardResult.validation.isValid) {
        errors.push(...swipeCardResult.validation.errors);
      }
      warnings.push(...swipeCardResult.validation.warnings);

      console.log(`[Pipeline] Generating detailed view for ${country}`);
      const detailedViewResult = await this.openaiService.generateDetailedView(
        { country, region },
        processedArticles,
        swipeCardResult.content
      );

      warnings.push(...detailedViewResult.validation.warnings);

      // Step 3: Quality control (if enabled)
      let qualityScore = 100;
      if (this.config.enableQualityControl) {
        console.log(`[Pipeline] Running quality control for ${country}`);
        const qualityResult = await this.runQualityControl(
          swipeCardResult.content,
          detailedViewResult.content,
          processedArticles
        );

        qualityScore = qualityResult.overallScore;
        warnings.push(...qualityResult.factCheckWarnings);

        if (!qualityResult.passed) {
          errors.push(`Quality control failed: score ${qualityResult.overallScore}/100`);
        }
      }

      // Step 4: Auto-publish conflict directly (bypass approval queue)
      console.log(`[Pipeline] Auto-publishing conflict for ${country}`);
      
      const conflict = await this.storage.createConflict({
        country,
        region,
        title: swipeCardResult.content.headline,
        summary: swipeCardResult.content.summary,
        severityLevel: this.determineSeverity(swipeCardResult.content.affectedGroups),
        affectedGroups: swipeCardResult.content.affectedGroups.map(g => g.group),
        imageUrl: null, // Will be generated separately or use default
        source: 'reliefweb',
        needsReview: qualityScore < 70, // Flag low-quality content for review
        sourceData: {
          qualityScore,
          warnings,
          swipeCard: swipeCardResult.content,
          detailedView: detailedViewResult.content,
          preprocessing: {
            entities: context.allEntities,
            readability: context.avgReadability,
            sentiment: context.sentimentDistribution,
          },
          sourceUrls: context.sources,
        },
      });

      console.log(`[Pipeline] ✓ Published conflict ${conflict.id} for ${country} (quality: ${qualityScore}/100)`);

      return {
        success: true,
        country,
        conflictId: conflict.id,
        errors,
        warnings,
        qualityScore,
      };
    } catch (error) {
      console.error(`[Pipeline] Error processing ${country}:`, error);
      errors.push(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        country,
        errors,
        warnings,
      };
    }
  }

  /**
   * Run quality control checks on generated content
   */
  private async runQualityControl(
    swipeCard: any,
    detailedView: any,
    articles: ProcessedArticle[]
  ): Promise<QualityControlResult> {
    const warnings: string[] = [];
    
    // Bias detection
    const biasScore = this.detectBias(swipeCard, detailedView, articles);
    
    // Emotional tone analysis
    const emotionalToneScore = this.analyzeEmotionalTone(swipeCard);
    
    // Fact-checking (basic)
    const factCheckWarnings = this.checkFacts(swipeCard, detailedView, articles);
    warnings.push(...factCheckWarnings);
    
    // Calculate overall score
    const overallScore = Math.round((biasScore + emotionalToneScore) / 2);
    
    return {
      biasScore,
      emotionalToneScore,
      factCheckWarnings,
      overallScore,
      passed: overallScore >= 70, // Threshold for approval
    };
  }

  /**
   * Detect bias in generated content
   */
  private detectBias(swipeCard: any, detailedView: any, articles: ProcessedArticle[]): number {
    let score = 100;
    const issues: string[] = [];
    
    // Check sentiment distribution in source articles
    const sentiments = articles.map(a => a.sentiment);
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const neutralCount = sentiments.filter(s => s === 'neutral').length;
    
    // If sources are heavily negative but generated content doesn't acknowledge severity
    if (negativeCount > positiveCount * 2 && negativeCount > neutralCount) {
      // Check if generated content uses appropriate tone
      const combinedText = `${swipeCard.summary} ${detailedView.extendedSummary}`.toLowerCase();
      const positiveWords = ['hope', 'improving', 'better', 'progress', 'recovery'];
      const hasPositiveBias = positiveWords.some(word => combinedText.includes(word));
      
      if (hasPositiveBias) {
        score -= 15;
        issues.push('Overly positive tone given negative source sentiment');
      }
    }
    
    // Check for political bias keywords that should be avoided
    const politicalBiasKeywords = [
      'terrorist', 'regime', 'dictator', 'enemy', 'radical',
      'extremist', 'militant', 'insurgent'
    ];
    const combinedText = `${swipeCard.summary} ${detailedView.extendedSummary}`.toLowerCase();
    
    politicalBiasKeywords.forEach(keyword => {
      if (combinedText.includes(keyword)) {
        score -= 8;
        issues.push(`Political bias keyword detected: "${keyword}"`);
      }
    });
    
    // Check for one-sided narrative (should mention multiple perspectives)
    const hasBalancedLanguage = [
      'according to', 'reported by', 'sources indicate', 
      'organizations state', 'data shows'
    ].some(phrase => combinedText.includes(phrase));
    
    if (!hasBalancedLanguage) {
      score -= 10;
      issues.push('Lacks attribution or source references');
    }
    
    if (issues.length > 0) {
      console.warn(`[QC] Bias issues found: ${issues.join('; ')}`);
    }
    
    return Math.max(0, score);
  }

  /**
   * Analyze emotional tone (avoid exploitation, maintain empathy)
   */
  private analyzeEmotionalTone(swipeCard: any): number {
    let score = 100;
    const issues: string[] = [];
    
    const text = `${swipeCard.headline} ${swipeCard.summary} ${swipeCard.emotionalHook}`.toLowerCase();
    
    // Exploitative language to avoid
    const exploitativeTerms = [
      'devastating', 'horrific', 'tragic', 'nightmare', 
      'catastrophic', 'apocalyptic', 'hellish', 'terrible',
      'awful', 'dire', 'desperate'
    ];
    
    let exploitativeCount = 0;
    exploitativeTerms.forEach(term => {
      if (text.includes(term)) {
        exploitativeCount++;
        score -= 8;
        issues.push(`Exploitative term: "${term}"`);
      }
    });
    
    // Multiple exploitative terms is worse
    if (exploitativeCount > 2) {
      score -= 10;
      issues.push('Excessive sensationalism');
    }
    
    // Check for "poverty porn" patterns (focusing on suffering without agency)
    const povertyPornPatterns = [
      { pattern: /starving children/i, name: 'starving children' },
      { pattern: /dying (babies|infants)/i, name: 'dying babies' },
      { pattern: /hopeless/i, name: 'hopeless' },
      { pattern: /helpless victims/i, name: 'helpless victims' },
      { pattern: /suffering (children|families)/i, name: 'suffering focus' },
    ];
    
    povertyPornPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        score -= 15;
        issues.push(`Poverty porn pattern: "${name}"`);
      }
    });
    
    // Check for agency and hope balance
    const agencyWords = ['families', 'communities', 'people', 'residents', 'survivors'];
    const hasAgency = agencyWords.some(word => text.includes(word));
    
    const victimWords = ['victims', 'displaced', 'refugees', 'crisis'];
    const victimCount = victimWords.filter(word => text.includes(word)).length;
    
    // If all victims and no agency, penalize
    if (victimCount >= 2 && !hasAgency) {
      score -= 12;
      issues.push('Lacks agency - focuses only on victimhood');
    }
    
    // Check for solution-oriented language
    const solutionWords = ['support', 'help', 'aid', 'assistance', 'relief', 'organizations'];
    const hasSolutionFocus = solutionWords.some(word => text.includes(word));
    
    if (!hasSolutionFocus) {
      score -= 8;
      issues.push('Lacks solution-oriented language');
    }
    
    if (issues.length > 0) {
      console.warn(`[QC] Emotional tone issues: ${issues.join('; ')}`);
    }
    
    return Math.max(0, score);
  }

  /**
   * Fact-checking - verify claims against source material
   */
  private checkFacts(swipeCard: any, detailedView: any, articles: ProcessedArticle[]): string[] {
    const warnings: string[] = [];
    
    // Combine all source text for checking
    const sourceText = articles.map(a => a.body.toLowerCase()).join(' ');
    const combinedGenerated = `${swipeCard.summary} ${detailedView.extendedSummary}`;
    
    // Extract numbers from generated content
    const numbersInGenerated = combinedGenerated.match(/\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:million|thousand|billion|k|m))?/gi) || [];
    
    if (numbersInGenerated.length === 0) {
      warnings.push('No specific statistics provided - content may be too vague');
    } else {
      // Check if at least some numbers appear in source material
      const numbersInSources = sourceText.match(/\d+(?:,\d+)*(?:\.\d+)?/g) || [];
      
      if (numbersInSources.length === 0 && numbersInGenerated.length > 0) {
        warnings.push('Generated content contains statistics not found in source material');
      }
    }
    
    // Check if affected groups are mentioned in sources
    swipeCard.affectedGroups.forEach((group: any) => {
      const groupName = group.group.toLowerCase();
      if (!sourceText.includes(groupName) && !sourceText.includes(groupName.slice(0, -1))) { // Check singular too
        warnings.push(`Affected group "${group.group}" not found in source articles`);
      }
      
      // Check if the impact described makes sense given source tone
      const impactText = group.impact.toLowerCase();
      if (impactText.includes('million') || impactText.includes('thousand')) {
        // Verify large numbers are plausible
        const hasLargeScale = sourceText.includes('million') || sourceText.includes('thousand') || 
                              sourceText.includes('hundreds') || sourceText.includes('many');
        if (!hasLargeScale) {
          warnings.push(`Large-scale impact for "${group.group}" not supported by source material`);
        }
      }
    });
    
    // Check for unsupported claims
    const criticalClaims = [
      { pattern: /genocide/i, claim: 'genocide' },
      { pattern: /war crime/i, claim: 'war crime' },
      { pattern: /massacre/i, claim: 'massacre' },
      { pattern: /ethnic cleansing/i, claim: 'ethnic cleansing' },
    ];
    
    criticalClaims.forEach(({ pattern, claim }) => {
      if (pattern.test(combinedGenerated) && !pattern.test(sourceText)) {
        warnings.push(`Critical claim "${claim}" not supported by source material`);
      }
    });
    
    // Check timeline consistency if provided
    if (detailedView.timeline && detailedView.timeline.length > 0) {
      const timelineEvents = detailedView.timeline.map((t: any) => t.event.toLowerCase());
      
      // Verify at least some timeline events match source content
      const matchedEvents = timelineEvents.filter((event: string) => {
        // Check if event description appears in sources
        const eventWords = event.split(' ').filter(w => w.length > 4); // Key words only
        return eventWords.some(word => sourceText.includes(word));
      });
      
      if (matchedEvents.length < timelineEvents.length / 2) {
        warnings.push('Timeline events not well-supported by source material');
      }
    }
    
    // Log warnings for debugging
    if (warnings.length > 0) {
      console.warn(`[QC] Fact-check warnings: ${warnings.join('; ')}`);
    }
    
    return warnings;
  }

  /**
   * Determine credibility level from source name
   */
  private determineCredibility(source: string): 'verified_un' | 'verified_academic' | 'news_media' {
    const lowerSource = source.toLowerCase();
    
    if (lowerSource.includes('un ') || lowerSource.includes('ocha') || lowerSource.includes('unhcr') || lowerSource.includes('unicef')) {
      return 'verified_un';
    }
    
    if (lowerSource.includes('acled') || lowerSource.includes('icrc') || lowerSource.includes('research')) {
      return 'verified_academic';
    }
    
    return 'news_media';
  }

  /**
   * Determine severity level from affected groups
   */
  private determineSeverity(affectedGroups: Array<{ urgency: string }>): 'Critical' | 'High' | 'Moderate' {
    const urgencies = affectedGroups.map(g => g.urgency);
    
    if (urgencies.includes('critical')) {
      return 'Critical';
    }
    
    if (urgencies.includes('high')) {
      return 'High';
    }
    
    return 'Moderate';
  }

  /**
   * Process multiple countries in batch
   */
  async processBatch(
    countries: Array<{
      country: string;
      region: string;
      articles: Array<{
        title: string;
        body: string;
        source: string;
        url?: string;
        date?: string;
      }>;
    }>
  ): Promise<PipelineResult[]> {
    console.log(`[Pipeline] Processing batch of ${countries.length} countries`);
    
    const results: PipelineResult[] = [];
    
    // Process sequentially to avoid rate limits
    for (const countryData of countries) {
      const result = await this.processCountry(
        countryData.country,
        countryData.region,
        countryData.articles
      );
      results.push(result);
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}
