import OpenAI from 'openai';
import type { ProcessedArticle } from './content-preprocessor';

interface SwipeCardContent {
  headline: string;
  summary: string;
  affectedGroups: Array<{
    group: string;
    count: string;
    impact: string;
    urgency: 'critical' | 'high' | 'moderate';
  }>;
  keyNeeds: Array<{
    need: string;
    description: string;
    icon: string;
  }>;
  emotionalHook: string;
  sourcesUsed: string[];
  contentWarnings: string[];
}

interface DetailedViewContent {
  extendedSummary: string;
  timeline: Array<{
    date: string;
    event: string;
    significance: string;
  }>;
  currentSituation: {
    overview: string;
    recentDevelopments: string[];
    outlook: string;
  };
  howOrganizationsHelp: Array<{
    interventionType: string;
    description: string;
    impactExample: string;
    gaps: string;
  }>;
  contextBackground: {
    rootCauses: string;
    keyActors: string;
    regionalImpact: string;
  };
  waysToHelp: {
    donationImpact: string;
    urgentNeeds: string[];
    longTermSupport: string;
  };
}

interface GenerationResult<T> {
  content: T;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  rawResponse: string;
}

export class OpenAIService {
  private client: OpenAI;
  private model = 'gpt-4o-2024-11-20'; // Latest model with structured outputs

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate swipe card content from preprocessed articles
   */
  async generateSwipeCard(
    conflictData: {
      country: string;
      region: string;
    },
    articles: ProcessedArticle[]
  ): Promise<GenerationResult<SwipeCardContent>> {
    // Prepare context from articles
    const context = this.prepareContext(articles, 5000);

    const systemPrompt = `You are a humanitarian content writer creating engaging, accurate content for a donation app.

TONE GUIDELINES:
- Empathetic but not exploitative
- Factual and grounded in sources
- Human-centered (focus on people, not politics)
- Hopeful but honest
- Avoid sensationalism or "poverty porn"
- Use active voice and clear language

CRITICAL RULES:
1. Every statistic must come from the sources provided
2. Use "people" and "families" language, not just numbers
3. Focus on impact and needs, not the political conflict
4. Include hope: mention ongoing aid efforts
5. Keep it digestible: users will read this in 10-15 seconds`;

    const userPrompt = `Create a brief profile card for ${conflictData.country} humanitarian crisis.

SOURCE MATERIAL:
${context}

Generate a swipe card with:
- Headline (40-60 characters): Brief, impactful title
- Summary (150-200 words): 2-3 sentence overview that hooks without sensationalism
- Affected groups (3-5): Specific groups with concrete numbers and impacts
- Key needs (3-5): Critical humanitarian needs with context
- Emotional hook: One sentence that makes this personal and relatable
- Content warnings: Any sensitive content (violence, death, etc.)

Example of good vs bad:
❌ BAD: "Devastating war leaves millions suffering"
✅ GOOD: "2.3 million families need shelter after displacement"

❌ BAD: "Children are dying from lack of medical care"
✅ GOOD: "Medical facilities need support to treat 50,000 children"`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Low temperature for factual content
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'swipe_card',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                headline: { type: 'string' },
                summary: { type: 'string' },
                affectedGroups: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      group: { type: 'string' },
                      count: { type: 'string' },
                      impact: { type: 'string' },
                      urgency: { type: 'string', enum: ['critical', 'high', 'moderate'] }
                    },
                    required: ['group', 'count', 'impact', 'urgency'],
                    additionalProperties: false
                  }
                },
                keyNeeds: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      need: { type: 'string' },
                      description: { type: 'string' },
                      icon: { type: 'string' }
                    },
                    required: ['need', 'description', 'icon'],
                    additionalProperties: false
                  }
                },
                emotionalHook: { type: 'string' },
                sourcesUsed: {
                  type: 'array',
                  items: { type: 'string' }
                },
                contentWarnings: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['headline', 'summary', 'affectedGroups', 'keyNeeds', 'emotionalHook', 'sourcesUsed', 'contentWarnings'],
              additionalProperties: false
            }
          }
        }
      });

      const rawResponse = response.choices[0].message.content || '{}';
      const content = JSON.parse(rawResponse) as SwipeCardContent;

      // Validate the generated content
      const validation = this.validateSwipeCard(content, articles);

      return {
        content,
        validation,
        rawResponse
      };
    } catch (error) {
      console.error('Error generating swipe card:', error);
      throw new Error(`Failed to generate swipe card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate detailed view content
   */
  async generateDetailedView(
    conflictData: {
      country: string;
      region: string;
    },
    articles: ProcessedArticle[],
    cardContent: SwipeCardContent
  ): Promise<GenerationResult<DetailedViewContent>> {
    const context = this.prepareContext(articles, 10000);

    const systemPrompt = `You are writing an in-depth profile for users who want to learn more before donating.

Maintain the same tone as the swipe card:
- Empathetic, factual, human-centered
- Hopeful but honest
- Avoid sensationalism`;

    const userPrompt = `Create a detailed view for ${conflictData.country} humanitarian crisis.

PREVIOUSLY GENERATED CARD:
${JSON.stringify(cardContent, null, 2)}

FULL SOURCE MATERIAL:
${context}

Generate comprehensive content including:
- Extended summary (300-500 words)
- Timeline of key events
- Current situation analysis
- How organizations are helping
- Background context (root causes, key actors, regional impact)
- Ways to help (donation impact, urgent needs)`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'detailed_view',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                extendedSummary: { type: 'string' },
                timeline: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      event: { type: 'string' },
                      significance: { type: 'string' }
                    },
                    required: ['date', 'event', 'significance'],
                    additionalProperties: false
                  }
                },
                currentSituation: {
                  type: 'object',
                  properties: {
                    overview: { type: 'string' },
                    recentDevelopments: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    outlook: { type: 'string' }
                  },
                  required: ['overview', 'recentDevelopments', 'outlook'],
                  additionalProperties: false
                },
                howOrganizationsHelp: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      interventionType: { type: 'string' },
                      description: { type: 'string' },
                      impactExample: { type: 'string' },
                      gaps: { type: 'string' }
                    },
                    required: ['interventionType', 'description', 'impactExample', 'gaps'],
                    additionalProperties: false
                  }
                },
                contextBackground: {
                  type: 'object',
                  properties: {
                    rootCauses: { type: 'string' },
                    keyActors: { type: 'string' },
                    regionalImpact: { type: 'string' }
                  },
                  required: ['rootCauses', 'keyActors', 'regionalImpact'],
                  additionalProperties: false
                },
                waysToHelp: {
                  type: 'object',
                  properties: {
                    donationImpact: { type: 'string' },
                    urgentNeeds: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    longTermSupport: { type: 'string' }
                  },
                  required: ['donationImpact', 'urgentNeeds', 'longTermSupport'],
                  additionalProperties: false
                }
              },
              required: ['extendedSummary', 'timeline', 'currentSituation', 'howOrganizationsHelp', 'contextBackground', 'waysToHelp'],
              additionalProperties: false
            }
          }
        }
      });

      const rawResponse = response.choices[0].message.content || '{}';
      const content = JSON.parse(rawResponse) as DetailedViewContent;

      const validation = this.validateDetailedView(content);

      return {
        content,
        validation,
        rawResponse
      };
    } catch (error) {
      console.error('Error generating detailed view:', error);
      throw new Error(`Failed to generate detailed view: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare context from articles for AI processing
   */
  private prepareContext(articles: ProcessedArticle[], maxLength: number): string {
    let context = '';
    
    for (const article of articles) {
      const articleText = `
SOURCE: ${article.source}
TITLE: ${article.title}
DATE: ${article.date || 'Unknown'}
CREDIBILITY: ${article.credibility}
CONTENT: ${article.body}
KEY ENTITIES: ${JSON.stringify(article.entities)}
---
`;
      
      if ((context + articleText).length > maxLength) {
        break;
      }
      
      context += articleText;
    }
    
    return context;
  }

  /**
   * Validate swipe card content
   */
  private validateSwipeCard(
    content: SwipeCardContent,
    articles: ProcessedArticle[]
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check headline length
    if (content.headline.length < 40 || content.headline.length > 60) {
      warnings.push(`Headline length (${content.headline.length}) should be 40-60 characters`);
    }

    // Check summary length
    const summaryWordCount = content.summary.split(/\s+/).length;
    if (summaryWordCount < 30 || summaryWordCount > 80) {
      warnings.push(`Summary word count (${summaryWordCount}) should be 30-80 words`);
    }

    // Check affected groups
    if (content.affectedGroups.length < 3 || content.affectedGroups.length > 5) {
      warnings.push(`Should have 3-5 affected groups, got ${content.affectedGroups.length}`);
    }

    // Check key needs
    if (content.keyNeeds.length < 3 || content.keyNeeds.length > 5) {
      warnings.push(`Should have 3-5 key needs, got ${content.keyNeeds.length}`);
    }

    // Check for sources
    if (content.sourcesUsed.length === 0) {
      errors.push('No sources referenced');
    }

    const isValid = errors.length === 0;

    return { isValid, errors, warnings };
  }

  /**
   * Validate detailed view content
   */
  private validateDetailedView(
    content: DetailedViewContent
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check extended summary length
    const summaryWordCount = content.extendedSummary.split(/\s+/).length;
    if (summaryWordCount < 300 || summaryWordCount > 500) {
      warnings.push(`Extended summary word count (${summaryWordCount}) should be 300-500 words`);
    }

    // Check timeline has events
    if (content.timeline.length === 0) {
      warnings.push('Timeline should have at least some events');
    }

    // Check organization interventions
    if (content.howOrganizationsHelp.length === 0) {
      warnings.push('Should describe how organizations are helping');
    }

    const isValid = errors.length === 0;

    return { isValid, errors, warnings };
  }
}
