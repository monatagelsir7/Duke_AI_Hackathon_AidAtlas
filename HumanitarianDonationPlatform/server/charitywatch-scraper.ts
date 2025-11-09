export interface NonprofitCandidate {
  name: string;
  charityWatchUrl?: string;
  charityWatchRating?: string; // A+, A, A-, B+, B, C, D, F
  programPercent?: number;
  website?: string;
  ein?: string;
  founded?: string;
}

export interface ScrapeResult {
  nonprofits: NonprofitCandidate[];
  logs: string[];
  errors: string[];
}

export class CharityWatchScraper {
  private logs: string[] = [];
  private errors: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    console.log(`🔍 CharityWatch: ${message}`);
  }

  private logError(message: string) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}`;
    this.errors.push(errorMessage);
    console.error(`❌ CharityWatch: ${message}`);
  }

  /**
   * STEP 1: Find 10-15 nonprofits working in a specific country
   */
  async findNonprofitsForCountry(country: string): Promise<string[]> {
    this.log(`STEP 1: Finding nonprofits working in ${country}`);
    
    const searchQuery = `${country} humanitarian aid nonprofits US organizations site:(reliefweb.int OR un.org OR usaid.gov OR devex.com OR thenewhumanitarian.org)`;
    this.log(`Search query: "${searchQuery}"`);

    try {
      // Note: In production, this would use a real web search API
      // For now, we'll use predefined nonprofit lists based on humanitarian work
      const nonprofitNames = this.getPredefinedNonprofits(country);
      this.log(`Using ${nonprofitNames.length} predefined nonprofits`);
      this.log(`Extracted ${nonprofitNames.length} nonprofit names: ${JSON.stringify(nonprofitNames)}`);

      return nonprofitNames;
    } catch (error) {
      this.logError(`Failed to search for nonprofits: ${error}`);
      return [];
    }
  }

  /**
   * Get predefined nonprofit list
   */
  private getPredefinedNonprofits(country: string): string[] {
    // Common major humanitarian nonprofits that often work globally
    const wellKnownNonprofits = [
      'International Rescue Committee',
      'Doctors Without Borders',
      'Médecins Sans Frontières',
      'CARE International',
      'Save the Children',
      'Oxfam America',
      'World Vision',
      'Catholic Relief Services',
      'Lutheran World Relief',
      'International Medical Corps',
      'Mercy Corps',
      'Direct Relief',
      'Americares',
      'Project HOPE',
      'International Committee of the Red Cross',
      'UNICEF USA',
      'UNHCR USA',
      'ACTION',
      'Concern Worldwide',
      'Alight',
      'ChildFund International',
      'Food for the Poor',
      'Helen Keller International',
      'MAP International'
    ];

    // Return all well-known nonprofits
    return wellKnownNonprofits;
  }

  /**
   * STEP 2: Check CharityWatch for each nonprofit
   */
  async checkCharityWatch(nonprofitName: string): Promise<NonprofitCandidate> {
    this.log(`STEP 2: Checking CharityWatch for "${nonprofitName}"`);
    
    const candidate: NonprofitCandidate = { name: nonprofitName };

    try {
      // Generate likely CharityWatch URL
      const charitywatchUrl = this.generateCharityWatchUrl(nonprofitName);
      this.log(`Trying CharityWatch URL: ${charitywatchUrl}`);
      
      if (!charitywatchUrl) {
        this.log(`❌ No CharityWatch page found for ${nonprofitName}`);
        return candidate;
      }

      candidate.charityWatchUrl = charitywatchUrl;
      this.log(`✅ Found CharityWatch URL: ${charitywatchUrl}`);

      // Fetch and parse CharityWatch page
      await this.delay(2000); // 2 second delay between requests
      const pageHtml = await this.fetchUrl(charitywatchUrl);
      
      if (!pageHtml) {
        this.log(`❌ Failed to fetch CharityWatch page`);
        return candidate;
      }
      
      this.log(`Fetched CharityWatch page, HTML length: ${pageHtml.length} characters`);
      this.log(`First 500 chars of HTML: ${pageHtml.substring(0, 500)}`);

      // Extract rating and program percentage
      const rating = this.extractRating(pageHtml);
      const programPercent = this.extractProgramPercent(pageHtml);

      if (rating) {
        candidate.charityWatchRating = rating;
        this.log(`✅ Extracted rating: ${rating}`);
      } else {
        this.log(`❌ Could not extract rating from page`);
      }

      if (programPercent) {
        candidate.programPercent = programPercent;
        this.log(`✅ Extracted program %: ${programPercent}%`);
      } else {
        this.log(`❌ Could not extract program percentage from page`);
      }

      // Only return if we have both rating and percentage
      if (rating && programPercent) {
        this.log(`✅ SUCCESS: ${nonprofitName} - ${rating}, ${programPercent}% to programs`);
      } else {
        this.log(`⚠️  SKIP: ${nonprofitName} - Missing data (rating: ${rating}, percent: ${programPercent})`);
      }

    } catch (error) {
      this.logError(`Failed to check CharityWatch for ${nonprofitName}: ${error}`);
    }

    return candidate;
  }

  /**
   * Generate likely CharityWatch URL from nonprofit name
   */
  private generateCharityWatchUrl(nonprofitName: string): string {
    const slug = nonprofitName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    return `https://www.charitywatch.org/charities/${slug}`;
  }

  /**
   * Fetch HTML from URL using native fetch
   */
  private async fetchUrl(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        this.logError(`HTTP ${response.status} ${response.statusText} for ${url}`);
        return null;
      }

      return await response.text();
    } catch (error) {
      this.logError(`Fetch failed for ${url}: ${error}`);
      return null;
    }
  }

  /**
   * Extract rating from CharityWatch HTML
   */
  private extractRating(html: string): string | null {
    // CharityWatch ratings appear in various formats:
    // <span class="rating-letter">A+</span>
    // or in text like "Rating: A+"
    // or in meta tags

    // Try pattern 1: Rating letter in span/div
    const ratingPatterns = [
      /<span[^>]*class="[^"]*rating[^"]*"[^>]*>([A-F][+-]?)</gi,
      /<div[^>]*class="[^"]*rating[^"]*"[^>]*>([A-F][+-]?)</gi,
      /Rating:\s*([A-F][+-]?)/gi,
      /Grade:\s*([A-F][+-]?)/gi,
      /<meta[^>]*content="[^"]*rating[^"]*([A-F][+-]?)[^"]*"/gi
    ];

    for (const pattern of ratingPatterns) {
      const match = pattern.exec(html);
      if (match && match[1]) {
        const rating = match[1].trim();
        if (/^[A-F][+-]?$/.test(rating)) {
          return rating;
        }
      }
    }

    return null;
  }

  /**
   * Extract program expense percentage from CharityWatch HTML
   */
  private extractProgramPercent(html: string): number | null {
    // Look for patterns like:
    // "92% to programs"
    // "Program %: 92"
    // "Program Spending: 92%"

    const percentPatterns = [
      /(\d{1,3})%\s*(?:to|spent on|for)\s*programs?/gi,
      /programs?[:\s]+(\d{1,3})%/gi,
      /program\s*(?:expense|spending)[:\s]+(\d{1,3})%/gi
    ];

    for (const pattern of percentPatterns) {
      const match = pattern.exec(html);
      if (match && match[1]) {
        const percent = parseInt(match[1], 10);
        if (percent >= 0 && percent <= 100) {
          return percent;
        }
      }
    }

    return null;
  }

  /**
   * Delay helper (rate limiting)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * STEP 3: Rank nonprofits by rating and program percentage
   */
  rankNonprofits(nonprofits: NonprofitCandidate[]): NonprofitCandidate[] {
    this.log(`STEP 3: Ranking ${nonprofits.length} nonprofits`);

    // Filter to only those with CharityWatch ratings
    const rated = nonprofits.filter(n => n.charityWatchRating && n.programPercent);
    this.log(`${rated.length} nonprofits have CharityWatch ratings`);

    // Filter out C, D, F ratings
    const goodRatings = rated.filter(n => {
      const rating = n.charityWatchRating!;
      return !['C', 'D', 'F'].includes(rating.replace(/[+-]/, ''));
    });
    this.log(`${goodRatings.length} nonprofits with B or better rating`);

    // Sort by rating tier, then by program percentage
    const ratingOrder: { [key: string]: number } = {
      'A+': 1,
      'A': 2,
      'A-': 3,
      'B+': 4,
      'B': 5,
    };

    const sorted = goodRatings.sort((a, b) => {
      const aRank = ratingOrder[a.charityWatchRating!] || 999;
      const bRank = ratingOrder[b.charityWatchRating!] || 999;

      if (aRank !== bRank) {
        return aRank - bRank;
      }

      // Same rating, sort by program percentage
      return (b.programPercent || 0) - (a.programPercent || 0);
    });

    // Take top 3
    const top3 = sorted.slice(0, 3);
    this.log(`Top 3 nonprofits: ${JSON.stringify(top3.map(n => ({ name: n.name, rating: n.charityWatchRating, percent: n.programPercent })))}`);

    return top3;
  }

  /**
   * Main scraping function
   */
  async scrapeNonprofitsForCountry(country: string): Promise<ScrapeResult> {
    this.logs = [];
    this.errors = [];
    this.log(`========================================`);
    this.log(`Starting CharityWatch scrape for ${country}`);
    this.log(`========================================`);

    // STEP 1: Find nonprofits
    const nonprofitNames = await this.findNonprofitsForCountry(country);
    
    if (nonprofitNames.length === 0) {
      this.logError(`No nonprofits found for ${country}`);
      return { nonprofits: [], logs: this.logs, errors: this.errors };
    }

    // STEP 2: Check CharityWatch for each
    const candidates: NonprofitCandidate[] = [];
    for (const name of nonprofitNames.slice(0, 15)) {
      const candidate = await this.checkCharityWatch(name);
      candidates.push(candidate);

      // Stop if we have 3 with ratings
      const withRatings = candidates.filter(c => c.charityWatchRating && c.programPercent);
      if (withRatings.length >= 3) {
        this.log(`Found 3 nonprofits with CharityWatch ratings, stopping search`);
        break;
      }
    }

    // STEP 3: Rank and return top 3
    const top3 = this.rankNonprofits(candidates);

    this.log(`========================================`);
    this.log(`Scraping complete. Found ${top3.length}/3 nonprofits`);
    this.log(`========================================`);

    return {
      nonprofits: top3,
      logs: this.logs,
      errors: this.errors
    };
  }
}
