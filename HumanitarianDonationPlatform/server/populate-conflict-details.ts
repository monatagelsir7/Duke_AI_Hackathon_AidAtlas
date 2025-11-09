import OpenAI from 'openai';
import { db } from './db';
import { conflicts } from '../shared/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Priority conflicts to populate first (12 most critical)
const PRIORITY_COUNTRIES = [
  'Sudan', 'Yemen', 'Syria', 'Gaza/Palestine', 'Ukraine', 'Nigeria',
  'Democratic Republic of the Congo', 'Myanmar', 'Haiti', 'Afghanistan', 'Somalia', 'Ethiopia'
];

// Approved humanitarian needs categories
const APPROVED_NEEDS = [
  'Food Security', 'Medical Care', 'Shelter', 'Clean Water', 'Education', 'Protection'
];

interface ExtractedStats {
  peopleAffected: string | null;
  internallyDisplaced: string | null;
  refugeesAbroad: string | null;
  crisisStartYear: string | null;
  primaryNeeds: string[];
  sources: string[];
}

async function fetchReliefWebReports(country: string, limit = 5) {
  try {
    const response = await fetch('https://api.reliefweb.int/v1/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appname: 'aidatlas-humanitarian-app',
        profile: 'full',
        query: {
          value: country,
          operator: 'AND',
          fields: ['title', 'body', 'country.name']
        },
        fields: {
          include: ['title', 'body', 'date', 'theme', 'vulnerable_groups', 'country', 'disaster', 'source']
        },
        limit,
        sort: ['date:desc']
      })
    });

    if (!response.ok) {
      console.error(`ReliefWeb API error for ${country}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch ReliefWeb reports for ${country}:`, error);
    return null;
  }
}

function extractReportText(reliefWebData: any): string {
  if (!reliefWebData?.data || reliefWebData.data.length === 0) {
    return '';
  }

  const reports = reliefWebData.data.slice(0, 3); // Use top 3 most recent reports
  const textSections = reports.map((report: any) => {
    const title = report.fields?.title || '';
    const body = report.fields?.body || '';
    const summary = report.fields?.body_html || report.fields?.body || '';
    
    // Truncate to avoid token limits (max ~4000 chars per report)
    const truncatedBody = summary.substring(0, 4000);
    return `### Report: ${title}\n${truncatedBody}\n\n`;
  }).join('\n');

  return textSections;
}

function validateExtractedStats(stats: any, originalText: string): boolean {
  // Validate peopleAffected format if present
  if (stats.peopleAffected && !/\d+(\.\d+)?\s*(million|thousand|billion|M|K|B)/i.test(stats.peopleAffected)) {
    console.warn('Invalid peopleAffected format:', stats.peopleAffected);
    return false;
  }

  // Validate crisisStartYear if present
  if (stats.crisisStartYear && !/^\d{4}$/.test(stats.crisisStartYear)) {
    console.warn('Invalid crisisStartYear format:', stats.crisisStartYear);
    return false;
  }

  // Validate primaryNeeds array
  if (stats.primaryNeeds && Array.isArray(stats.primaryNeeds)) {
    const invalidNeeds = stats.primaryNeeds.filter((need: string) => !APPROVED_NEEDS.includes(need));
    if (invalidNeeds.length > 0) {
      console.warn('Invalid needs detected:', invalidNeeds);
      stats.primaryNeeds = stats.primaryNeeds.filter((need: string) => APPROVED_NEEDS.includes(need));
    }
  }

  return true;
}

async function extractStatsWithOpenAI(country: string, reportText: string, retryCount = 0): Promise<ExtractedStats | null> {
  if (!reportText.trim()) {
    console.log(`No report text for ${country}, skipping OpenAI extraction`);
    return null;
  }

  const prompt = `Extract humanitarian statistics from these UN OCHA ReliefWeb reports about ${country}:

${reportText}

Extract ONLY facts explicitly stated in the reports. Return valid JSON only with this exact structure:
{
  "peopleAffected": "number with unit (e.g. '8.3 million') or null",
  "internallyDisplaced": "number with unit or null", 
  "refugeesAbroad": "number with unit or null",
  "crisisStartYear": "YYYY or null",
  "primaryNeeds": ["array of: Food Security, Medical Care, Shelter, Clean Water, Education, Protection"],
  "sources": ["which report each fact came from"]
}

CRITICAL RULES:
- Only extract numbers explicitly stated in reports
- If not mentioned, return null (don't estimate or assume)
- Include the unit (million, thousand, etc.)
- Cite which report each statistic came from
- Your ENTIRE response must be valid JSON, nothing else
- Only use needs from this list: Food Security, Medical Care, Shelter, Clean Water, Education, Protection`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      temperature: 0.1,
      messages: [
        { 
          role: 'system', 
          content: 'You are a humanitarian data analyst. Extract only factual statistics explicitly stated in source documents. Never estimate or infer. Return valid JSON only.' 
        },
        { role: 'user', content: prompt }
      ]
    });

    let content = completion.choices[0].message.content || '';
    
    // Strip markdown code blocks if OpenAI wraps JSON
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const stats = JSON.parse(content) as ExtractedStats;
    
    // Validate extracted stats
    if (!validateExtractedStats(stats, reportText)) {
      console.warn(`Validation failed for ${country}, extracted:`, stats);
      if (retryCount < 1) {
        console.log(`Retrying extraction for ${country}...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay before retry
        return extractStatsWithOpenAI(country, reportText, retryCount + 1);
      }
      return null;
    }

    console.log(`✓ Extracted stats for ${country}:`, {
      peopleAffected: stats.peopleAffected || 'none',
      displaced: stats.internallyDisplaced || 'none',
      refugees: stats.refugeesAbroad || 'none',
      startYear: stats.crisisStartYear || 'none',
      needsCount: stats.primaryNeeds?.length || 0
    });

    return stats;
  } catch (error: any) {
    console.error(`OpenAI extraction failed for ${country}:`, error.message);
    
    // Retry once on parsing errors
    if (retryCount < 1 && (error instanceof SyntaxError || error.message?.includes('JSON'))) {
      console.log(`Retrying extraction for ${country} due to JSON parse error...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return extractStatsWithOpenAI(country, reportText, retryCount + 1);
    }
    
    return null;
  }
}

async function updateConflictDetails(conflictId: string, stats: ExtractedStats, sourceData: any) {
  try {
    await db.update(conflicts)
      .set({
        peopleAffected: stats.peopleAffected,
        internallyDisplaced: stats.internallyDisplaced,
        refugeesAbroad: stats.refugeesAbroad,
        crisisStartYear: stats.crisisStartYear,
        primaryNeeds: stats.primaryNeeds && stats.primaryNeeds.length > 0 ? stats.primaryNeeds : null,
        detailsLastUpdated: new Date(),
        sourceData: sourceData // Store ReliefWeb response for traceability
      })
      .where(eq(conflicts.id, conflictId));

    return true;
  } catch (error) {
    console.error(`Failed to update conflict ${conflictId}:`, error);
    return false;
  }
}

export async function populateConflictDetails(priorityOnly = false, dryRun = false) {
  console.log('🔄 Starting conflict details population...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}, Priority only: ${priorityOnly}`);

  // Fetch all conflicts
  const allConflicts = await db.select().from(conflicts);
  
  // Separate priority and non-priority conflicts
  const priorityConflicts = allConflicts.filter(c => 
    PRIORITY_COUNTRIES.some(pc => c.country.toLowerCase().includes(pc.toLowerCase()))
  );
  const otherConflicts = allConflicts.filter(c => 
    !PRIORITY_COUNTRIES.some(pc => c.country.toLowerCase().includes(pc.toLowerCase()))
  );

  const conflictsToProcess = priorityOnly ? priorityConflicts : [...priorityConflicts, ...otherConflicts];
  
  console.log(`📊 Processing ${conflictsToProcess.length} conflicts (${priorityConflicts.length} priority, ${otherConflicts.length} others)`);

  const results = {
    total: conflictsToProcess.length,
    processed: 0,
    updated: 0,
    failed: 0,
    skipped: 0
  };

  // Process in batches of 4 with throttling to respect rate limits
  const BATCH_SIZE = 4;
  const BATCH_DELAY = 15000; // 15s between batches

  for (let i = 0; i < conflictsToProcess.length; i += BATCH_SIZE) {
    const batch = conflictsToProcess.slice(i, i + BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(conflictsToProcess.length / BATCH_SIZE)}`);
    
    await Promise.all(batch.map(async (conflict) => {
      try {
        console.log(`\n🌍 Processing: ${conflict.country}`);
        results.processed++;

        // Fetch ReliefWeb reports
        const reliefWebData = await fetchReliefWebReports(conflict.country);
        if (!reliefWebData || !reliefWebData.data || reliefWebData.data.length === 0) {
          console.log(`  ⚠️  No ReliefWeb data found for ${conflict.country}`);
          results.skipped++;
          return;
        }

        // Extract text from reports
        const reportText = extractReportText(reliefWebData);
        if (!reportText) {
          console.log(`  ⚠️  No report text extracted for ${conflict.country}`);
          results.skipped++;
          return;
        }

        // Extract stats using OpenAI
        const stats = await extractStatsWithOpenAI(conflict.country, reportText);
        if (!stats) {
          console.log(`  ❌ Failed to extract stats for ${conflict.country}`);
          results.failed++;
          return;
        }

        // Update database (unless dry run)
        if (!dryRun) {
          const updated = await updateConflictDetails(conflict.id, stats, reliefWebData);
          if (updated) {
            console.log(`  ✅ Updated ${conflict.country}`);
            results.updated++;
          } else {
            console.log(`  ❌ Failed to update database for ${conflict.country}`);
            results.failed++;
          }
        } else {
          console.log(`  🔍 DRY RUN - Would update ${conflict.country} with:`, stats);
          results.updated++;
        }

      } catch (error: any) {
        console.error(`  ❌ Error processing ${conflict.country}:`, error.message);
        results.failed++;
      }
    }));

    // Throttle between batches (except for last batch)
    if (i + BATCH_SIZE < conflictsToProcess.length) {
      console.log(`\n⏸️  Waiting ${BATCH_DELAY / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log('\n✨ Population complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total conflicts: ${results.total}`);
  console.log(`Successfully updated: ${results.updated}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped (no data): ${results.skipped}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const priorityOnly = args.includes('--priority');
  const dryRun = args.includes('--dry-run');
  
  populateConflictDetails(priorityOnly, dryRun)
    .then((results) => {
      console.log('\n📊 Final results:', results);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}
