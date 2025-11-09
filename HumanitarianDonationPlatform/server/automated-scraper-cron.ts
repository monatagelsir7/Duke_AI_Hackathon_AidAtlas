/**
 * Automated Daily Conflict Scraping
 * Runs at midnight UTC to update conflict database from trusted sources
 */

import type { IStorage } from './storage';

interface ScraperConfig {
  daysBack: number;
  processLimit: number;
  enableQualityControl: boolean;
}

export class AutomatedScraper {
  private storage: IStorage;
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;
  private cronInterval: NodeJS.Timeout | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Start automated daily scraping at midnight UTC
   */
  startDailyScraping() {
    console.log('[AutoScraper] Starting automated daily scraping job');
    
    // Calculate milliseconds until next midnight UTC
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    // Schedule first run at next midnight
    setTimeout(() => {
      this.runDailyScrape();
      
      // Then run every 24 hours
      this.cronInterval = setInterval(() => {
        this.runDailyScrape();
      }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    }, msUntilMidnight);

    console.log(`[AutoScraper] Next scrape scheduled for ${nextMidnight.toISOString()}`);
  }

  /**
   * Stop automated scraping
   */
  stopDailyScraping() {
    if (this.cronInterval) {
      clearInterval(this.cronInterval);
      this.cronInterval = null;
      console.log('[AutoScraper] Stopped automated scraping');
    }
  }

  /**
   * Run the daily scraping workflow
   */
  async runDailyScrape() {
    if (this.isRunning) {
      console.warn('[AutoScraper] Scrape already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    console.log(`[AutoScraper] Starting daily scrape at ${startTime.toISOString()}`);

    try {
      await this.executeScrape();

      this.lastRunTime = new Date();
      const duration = (this.lastRunTime.getTime() - startTime.getTime()) / 1000;

      console.log(`[AutoScraper] ✓ Daily scrape completed in ${duration}s`);

    } catch (error) {
      console.error('[AutoScraper] Daily scrape failed:', error);
      
      // Clear flag before retrying
      this.isRunning = false;
      
      // Retry logic: wait 5 minutes and try again (max 3 retries)
      await this.retryWithBackoff(3);
      return; // Exit early, don't clear flag again
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute the scraping process (internal worker method)
   */
  private async executeScrape() {
    const config: ScraperConfig = {
      daysBack: 7, // Look back 7 days for daily updates
      processLimit: 50,
      enableQualityControl: true,
    };

    // 1. Scrape from ReliefWeb
    const reliefWebResults = await this.scrapeReliefWeb(config);
    
    // 2. TODO: Add ACLED API scraping
    // 3. TODO: Add UNHCR Data API scraping
    // 4. TODO: Add ICRC RSS scraping

    const totalScraped = reliefWebResults.scraped;
    const totalPublished = reliefWebResults.published;

    console.log(`[AutoScraper] Results: ${totalScraped} scraped, ${totalPublished} published`);
  }

  /**
   * Scrape from ReliefWeb API
   */
  private async scrapeReliefWeb(config: ScraperConfig): Promise<{ scraped: number; published: number }> {
    try {
      const { ReliefWebScraper } = await import('./reliefweb-scraper');
      const scraper = new ReliefWebScraper();
      
      console.log('[AutoScraper] Fetching from ReliefWeb...');
      const conflicts = await scraper.scrape(config.daysBack);
      
      const scraped = conflicts.size;
      let published = 0;

      // Process each country's reports
      for (const [, conflictData] of Array.from(conflicts)) {
        try {
          // Create simplified conflict profile (no AI processing for now)
          const conflict = await this.storage.createConflict({
            country: conflictData.countryName,
            region: this.determineRegion(conflictData.countryName),
            title: `${conflictData.countryName} Humanitarian Situation`,
            summary: conflictData.reports[0]?.title || 'Humanitarian needs identified',
            severityLevel: this.determineSeverity(conflictData.reports.length),
            affectedGroups: conflictData.vulnerableGroups,
            imageUrl: null,
            source: 'reliefweb',
            needsReview: false,
            sourceData: {
              reportCount: conflictData.reports.length,
              sources: conflictData.sources,
              themes: conflictData.themes,
              disasters: conflictData.disasters,
            },
          });

          published++;
          console.log(`[AutoScraper] ✓ Published conflict: ${conflict.country}`);

        } catch (error) {
          console.error(`[AutoScraper] Failed to publish ${conflictData.countryName}:`, error);
        }
      }

      return { scraped, published };

    } catch (error: any) {
      // Handle known ReliefWeb API 400 errors (pending API approval)
      if (error?.message?.includes('400 Bad Request') || error?.message?.includes('ReliefWeb API error')) {
        console.log('[AutoScraper] ReliefWeb API access pending approval - skipping ReliefWeb scraper');
        console.log('[AutoScraper] Action required: Apply for ReliefWeb API approval at https://reliefweb.int/help/api');
        return { scraped: 0, published: 0 };
      }
      
      console.error('[AutoScraper] ReliefWeb scraping failed:', error);
      throw error; // Re-throw for retry logic
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff(maxRetries: number) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[AutoScraper] Retry attempt ${attempt}/${maxRetries} in 5 minutes...`);
      
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes
      
      try {
        // Call internal scrape worker directly (isRunning already cleared by caller)
        await this.executeScrape();
        console.log(`[AutoScraper] Retry ${attempt} succeeded`);
        this.lastRunTime = new Date();
        return;
      } catch (error) {
        console.error(`[AutoScraper] Retry ${attempt} failed:`, error);
      }
    }
    
    console.error('[AutoScraper] All retry attempts exhausted');
  }

  /**
   * Determine region from country name
   */
  private determineRegion(countryName: string): string {
    const lowerName = countryName.toLowerCase();
    
    if (lowerName.includes('syria') || lowerName.includes('yemen') || lowerName.includes('iraq') || lowerName.includes('lebanon') || lowerName.includes('gaza') || lowerName.includes('palestine')) {
      return 'Middle East';
    }
    if (lowerName.includes('somalia') || lowerName.includes('ethiopia') || lowerName.includes('kenya') || lowerName.includes('sudan') || lowerName.includes('south sudan') || lowerName.includes('uganda')) {
      return 'Africa';
    }
    if (lowerName.includes('ukraine') || lowerName.includes('poland') || lowerName.includes('belarus')) {
      return 'Eastern Europe';
    }
    if (lowerName.includes('afghanistan') || lowerName.includes('pakistan') || lowerName.includes('bangladesh')) {
      return 'South Asia';
    }
    if (lowerName.includes('myanmar') || lowerName.includes('philippines')) {
      return 'Southeast Asia';
    }
    if (lowerName.includes('nigeria') || lowerName.includes('cameroon') || lowerName.includes('mali') || lowerName.includes('burkina') || lowerName.includes('niger') || lowerName.includes('chad')) {
      return 'Africa';
    }
    if (lowerName.includes('haiti') || lowerName.includes('venezuela') || lowerName.includes('colombia')) {
      return 'Caribbean & Latin America';
    }
    if (lowerName.includes('tajikistan') || lowerName.includes('kyrgyzstan')) {
      return 'Central Asia';
    }
    if (lowerName.includes('congo') || lowerName.includes('drc') || lowerName.includes('central african')) {
      return 'Africa';
    }
    
    return 'Other';
  }

  /**
   * Determine severity from report count
   */
  private determineSeverity(reportCount: number): 'Critical' | 'High' | 'Moderate' {
    if (reportCount >= 10) return 'Critical';
    if (reportCount >= 5) return 'High';
    return 'Moderate';
  }

  /**
   * Get last run status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.cronInterval ? this.calculateNextMidnight() : null,
    };
  }

  private calculateNextMidnight(): Date {
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
  }
}
