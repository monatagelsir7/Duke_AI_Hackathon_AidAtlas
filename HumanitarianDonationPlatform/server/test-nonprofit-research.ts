/**
 * Test AI-powered nonprofit research
 * Run with: tsx server/test-nonprofit-research.ts
 */

import { NonprofitResearcher } from './nonprofit-researcher';

async function testNonprofitResearch() {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 AI-Powered Nonprofit Research Test');
  console.log('='.repeat(70) + '\n');

  const countries = ['Sudan', 'Ukraine', 'Myanmar'];

  for (const country of countries) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Testing: ${country}`);
    console.log('─'.repeat(70));

    try {
      const researcher = new NonprofitResearcher();
      const nonprofits = await researcher.researchNonprofits(country);

      console.log(`\n✅ Found ${nonprofits.length} nonprofits for ${country}:\n`);

      nonprofits.forEach((np, i) => {
        console.log(`${i + 1}. ${np.name}`);
        console.log(`   Rating: ${np.rating} | Program %: ${np.programPercent}%`);
        console.log(`   Founded: ${np.founded || 'Unknown'}`);
        console.log(`   Logo: ${np.logoUrl.substring(0, 60)}...`);
        console.log(`   Donate: ${np.donateUrl}`);
        console.log(`   Description:`);
        np.description.forEach((desc, j) => {
          console.log(`     ${j + 1}) ${desc}`);
        });
        console.log('');
      });

    } catch (error) {
      console.error(`❌ Test failed for ${country}:`, error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
    }

    // Wait 2 seconds between countries to avoid rate limits
    if (countries.indexOf(country) < countries.length - 1) {
      console.log('\nWaiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ All tests complete');
  console.log('='.repeat(70) + '\n');
}

// Run the test
testNonprofitResearch()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
