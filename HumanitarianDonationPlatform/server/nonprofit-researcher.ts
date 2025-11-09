/**
 * AI-Powered Nonprofit Research Service
 * Uses web search + OpenAI to find and curate nonprofits working in specific countries
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface NonprofitProfile {
  name: string;
  description: string[];
  rating: string;
  programPercent: number;
  logoUrl: string;
  donateUrl: string;
  website: string;
  ein?: string;
  founded?: string;
}

export class NonprofitResearcher {
  /**
   * Research nonprofits for a specific country using AI
   */
  async researchNonprofits(country: string): Promise<NonprofitProfile[]> {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔍 Researching nonprofits for ${country} using AI`);
    console.log('='.repeat(70));

    try {
      // Use OpenAI to generate nonprofit recommendations based on well-known organizations
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a humanitarian aid expert. Your task is to recommend 3 highly-rated US-based humanitarian nonprofits that work in specific countries.

For each nonprofit you recommend:
1. It must be a real, well-established organization
2. It should be known to work in humanitarian relief
3. Prefer organizations with high ratings and transparency

Return ONLY valid JSON in this exact format:
{
  "nonprofits": [
    {
      "name": "Organization Name",
      "website": "organizationname.org",
      "founded": "1971",
      "estimatedRating": "A+",
      "estimatedProgramPercent": 92,
      "workDescription": [
        "First key activity (10-15 words)",
        "Second key activity (10-15 words)",
        "Third key activity (10-15 words)"
      ]
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Recommend 3 top-rated US humanitarian nonprofits that work in ${country}. Focus on organizations known for crisis response, medical aid, refugee support, or food security.`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      console.log(`✅ AI recommended ${result.nonprofits?.length || 0} nonprofits`);

      if (!result.nonprofits || result.nonprofits.length === 0) {
        throw new Error('AI did not return any nonprofits');
      }

      // Enrich with logos and donation URLs
      const enrichedNonprofits: NonprofitProfile[] = [];
      
      for (const nonprofit of result.nonprofits.slice(0, 3)) {
        console.log(`📝 Processing: ${nonprofit.name}`);
        
        const profile: NonprofitProfile = {
          name: nonprofit.name,
          description: nonprofit.workDescription || [],
          rating: nonprofit.estimatedRating || 'A',
          programPercent: nonprofit.estimatedProgramPercent || 85,
          logoUrl: await this.getLogoUrl(nonprofit.name, nonprofit.website),
          donateUrl: await this.getDonateUrl(nonprofit.name, nonprofit.website),
          website: `https://${nonprofit.website}`,
          founded: nonprofit.founded,
        };

        enrichedNonprofits.push(profile);
        console.log(`✅ Added ${nonprofit.name}`);
      }

      console.log(`\n✅ Research complete: ${enrichedNonprofits.length}/3 nonprofits\n`);
      return enrichedNonprofits;

    } catch (error) {
      console.error('❌ Research failed:', error);
      
      // Fallback to curated list
      console.log('⚠️  Using fallback curated nonprofits');
      return this.getFallbackNonprofits(country);
    }
  }

  /**
   * Get logo URL from Every.org or Clearbit
   */
  private async getLogoUrl(name: string, website: string): Promise<string> {
    try {
      // Try Every.org API first
      const everyOrgUrl = await this.searchEveryOrg(name);
      if (everyOrgUrl) return everyOrgUrl;

      // Fallback to Clearbit
      const domain = website.replace(/^https?:\/\//, '').split('/')[0];
      return `https://logo.clearbit.com/${domain}`;
    } catch (error) {
      // Ultimate fallback: placeholder
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=2563EB&color=fff`;
    }
  }

  /**
   * Search Every.org for nonprofit
   */
  private async searchEveryOrg(name: string): Promise<string | null> {
    try {
      const apiKey = process.env.EVERYORG_API_KEY;
      if (!apiKey) return null;

      const response = await fetch(`https://partners.every.org/v0.2/search/${encodeURIComponent(name)}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.nonprofits && data.nonprofits.length > 0) {
          return data.nonprofits[0].logoUrl || data.nonprofits[0].logoCloudinaryId 
            ? `https://res.cloudinary.com/everydotorg/image/upload/c_lfill,w_200,h_200,dpr_2/${data.nonprofits[0].logoCloudinaryId}.jpg`
            : null;
        }
      }

      return null;
    } catch (error) {
      console.warn('Every.org search failed:', error);
      return null;
    }
  }

  /**
   * Get donation URL from Every.org or organization website
   */
  private async getDonateUrl(name: string, website: string): Promise<string> {
    try {
      const apiKey = process.env.EVERYORG_API_KEY;
      if (!apiKey) {
        return `https://${website}/donate`;
      }

      const response = await fetch(`https://partners.every.org/v0.2/search/${encodeURIComponent(name)}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.nonprofits && data.nonprofits.length > 0) {
          const nonprofit = data.nonprofits[0];
          return `https://www.every.org/${nonprofit.slug}`;
        }
      }

      return `https://${website}/donate`;
    } catch (error) {
      return `https://${website}/donate`;
    }
  }

  /**
   * Fallback curated nonprofits for when AI fails
   */
  private getFallbackNonprofits(country: string): NonprofitProfile[] {
    return [
      {
        name: 'International Rescue Committee',
        description: [
          'Provides emergency humanitarian assistance in crisis zones worldwide',
          'Delivers medical care, clean water, and shelter to displaced families',
          'Supports refugee resettlement and integration programs'
        ],
        rating: 'A+',
        programPercent: 92,
        logoUrl: 'https://logo.clearbit.com/rescue.org',
        donateUrl: 'https://www.rescue.org/donate',
        website: 'https://www.rescue.org',
        founded: '1933'
      },
      {
        name: 'Save the Children',
        description: [
          'Provides emergency relief and long-term development support for children',
          'Delivers healthcare, education, and nutrition programs in crisis areas',
          'Protects children in conflict zones and disaster-affected regions'
        ],
        rating: 'A',
        programPercent: 88,
        logoUrl: 'https://logo.clearbit.com/savethechildren.org',
        donateUrl: 'https://www.savethechildren.org/donate',
        website: 'https://www.savethechildren.org',
        founded: '1919'
      },
      {
        name: 'CARE International',
        description: [
          'Fights global poverty with focus on women and girls empowerment',
          'Provides emergency food, water, and shelter in humanitarian crises',
          'Supports long-term community development and resilience programs'
        ],
        rating: 'A',
        programPercent: 86,
        logoUrl: 'https://logo.clearbit.com/care.org',
        donateUrl: 'https://www.care.org/donate',
        website: 'https://www.care.org',
        founded: '1945'
      }
    ];
  }
}
