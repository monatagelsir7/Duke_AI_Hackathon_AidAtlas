/**
 * Direct test of CharityWatch scraper to see full diagnostic output
 * Run with: tsx server/test-charitywatch.ts
 */

import { CharityWatchScraper } from './charitywatch-scraper';

async function testCharityWatchScraper() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 CharityWatch Scraper Diagnostic Test');
  console.log('='.repeat(70) + '\n');

  const country = 'Sudan';
  console.log(`Testing for country: ${country}\n`);

  const scraper = new CharityWatchScraper();
  
  try {
    const result = await scraper.scrapeNonprofitsForCountry(country);
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESULTS SUMMARY');
    console.log('='.repeat(70));
    console.log(`Nonprofits found with ratings: ${result.nonprofits.length}/3`);
    console.log(`Total logs generated: ${result.logs.length}`);
    console.log(`Total errors encountered: ${result.errors.length}`);
    
    console.log('\n' + '-'.repeat(70));
    console.log('📋 NONPROFITS FOUND:');
    console.log('-'.repeat(70));
    
    if (result.nonprofits.length === 0) {
      console.log('❌ No nonprofits found with CharityWatch ratings');
    } else {
      result.nonprofits.forEach((nonprofit, index) => {
        console.log(`\n${index + 1}. ${nonprofit.name}`);
        console.log(`   Rating: ${nonprofit.charityWatchRating || 'N/A'}`);
        console.log(`   Program %: ${nonprofit.programPercent || 'N/A'}%`);
        console.log(`   URL: ${nonprofit.charityWatchUrl || 'N/A'}`);
      });
    }

    console.log('\n' + '-'.repeat(70));
    console.log('📝 FULL DIAGNOSTIC LOGS:');
    console.log('-'.repeat(70));
    result.logs.forEach(log => console.log(log));

    if (result.errors.length > 0) {
      console.log('\n' + '-'.repeat(70));
      console.log('❌ ERRORS:');
      console.log('-'.repeat(70));
      result.errors.forEach(error => console.log(error));
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testCharityWatchScraper()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
