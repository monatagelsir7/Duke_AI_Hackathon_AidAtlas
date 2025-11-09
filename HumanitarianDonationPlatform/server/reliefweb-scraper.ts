/**
 * ReliefWeb API Scraper
 * Fetches verified humanitarian crisis data from UN OCHA ReliefWeb
 */

export interface ReliefWebReport {
  id: string;
  title: string;
  body: string;
  date: {
    created: string;
  };
  primary_country: {
    name: string;
    iso3: string;
  };
  country: Array<{
    name: string;
    iso3: string;
  }>;
  disaster?: Array<{
    name: string;
    type: string;
  }>;
  vulnerable_groups?: Array<{
    name: string;
  }>;
  theme?: Array<{
    name: string;
  }>;
  source: Array<{
    name: string;
  }>;
  url: string;
}

export interface ConflictData {
  countryName: string;
  countryCode: string;
  reports: Array<{
    title: string;
    body: string;
    url: string;
    date: string;
    source: string;
  }>;
  disasters: string[];
  themes: string[];
  vulnerableGroups: string[];
  sources: string[];
}

export class ReliefWebScraper {
  private static readonly BASE_URL = 'https://api.reliefweb.int/v1/reports';
  private static readonly APP_NAME = 'aidatlas-humanitarian-app';

  /**
   * Fetch recent humanitarian reports from ReliefWeb
   * @param daysBack Number of days to look back (default: 7)
   */
  async fetchRecentReports(daysBack: number = 7): Promise<ReliefWebReport[]> {
    // Minimal request to avoid API rejection
    const requestBody = {
      appname: ReliefWebScraper.APP_NAME,
      limit: 100,
    };

    try {
      const response = await fetch(ReliefWebScraper.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`ReliefWeb API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.fields);
    } catch (error) {
      console.error('Error fetching from ReliefWeb:', error);
      throw error;
    }
  }

  /**
   * Extract and aggregate conflict data by country
   */
  extractConflicts(reports: ReliefWebReport[]): Map<string, ConflictData> {
    const conflictsByCountry = new Map<string, ConflictData>();

    for (const report of reports) {
      if (!report.primary_country) continue;

      const countryCode = report.primary_country.iso3;
      const countryName = report.primary_country.name;

      if (!conflictsByCountry.has(countryCode)) {
        conflictsByCountry.set(countryCode, {
          countryName,
          countryCode,
          reports: [],
          disasters: [],
          themes: [],
          vulnerableGroups: [],
          sources: [],
        });
      }

      const conflict = conflictsByCountry.get(countryCode)!;

      // Add report
      conflict.reports.push({
        title: report.title || '',
        body: report.body || '',
        url: report.url || '',
        date: report.date?.created || '',
        source: report.source?.[0]?.name || 'Unknown',
      });

      // Aggregate metadata (deduplicated)
      if (report.disaster) {
        for (const disaster of report.disaster) {
          if (!conflict.disasters.includes(disaster.name)) {
            conflict.disasters.push(disaster.name);
          }
        }
      }

      if (report.theme) {
        for (const theme of report.theme) {
          if (!conflict.themes.includes(theme.name)) {
            conflict.themes.push(theme.name);
          }
        }
      }

      if (report.vulnerable_groups) {
        for (const group of report.vulnerable_groups) {
          if (!conflict.vulnerableGroups.includes(group.name)) {
            conflict.vulnerableGroups.push(group.name);
          }
        }
      }

      if (report.source) {
        for (const source of report.source) {
          if (!conflict.sources.includes(source.name)) {
            conflict.sources.push(source.name);
          }
        }
      }
    }

    return conflictsByCountry;
  }

  /**
   * Run complete scraping process
   */
  async scrape(daysBack: number = 7): Promise<Map<string, ConflictData>> {
    console.log(`[ReliefWeb] Fetching reports from last ${daysBack} days...`);
    const reports = await this.fetchRecentReports(daysBack);
    console.log(`[ReliefWeb] Fetched ${reports.length} reports`);

    const conflicts = this.extractConflicts(reports);
    console.log(`[ReliefWeb] Identified ${conflicts.size} countries with humanitarian crises`);

    return conflicts;
  }
}
