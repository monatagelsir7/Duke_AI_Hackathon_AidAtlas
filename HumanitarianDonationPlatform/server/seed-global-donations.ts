import { storage } from "./storage";

const DONOR_COUNTRIES = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Canada',
  'Australia', 'Japan', 'Netherlands', 'Sweden', 'Norway', 
  'Denmark', 'Switzerland', 'Spain', 'Italy', 'Belgium'
];

const DONATION_AMOUNTS = [10, 15, 20, 25, 30, 50, 75, 100, 150, 200, 250, 500];

async function seedGlobalDonations() {
  console.log('🌍 Seeding global donations for globe visualization...');

  // Get existing conflicts
  const allConflicts = await storage.getConflicts();
  if (allConflicts.length === 0) {
    console.log('⚠️  No conflicts found, please run main seed first');
    return;
  }

  // Get existing organizations
  const allOrgs = await storage.getOrganizations();
  if (allOrgs.length === 0) {
    console.log('⚠️  No organizations found');
    return;
  }

  // Check if we already have global donations by getting all donation geography
  const existingDonations = await storage.getAllDonationGeography();
  if (existingDonations.length > 30) {
    console.log('✅ Global donations already seeded');
    return;
  }

  console.log(`📊 Creating 50 global donations across ${DONOR_COUNTRIES.length} countries...`);

  // Create demo user if not exists
  const demoUser = await storage.getUserByEmail('demo@aidatlas.org');
  if (!demoUser) {
    console.log('⚠️  Demo user not found, skipping global donations');
    return;
  }

  // Create 50 diverse donations from various countries
  for (let i = 0; i < 50; i++) {
    const randomConflict = allConflicts[Math.floor(Math.random() * allConflicts.length)];
    const randomOrg = allOrgs[Math.floor(Math.random() * allOrgs.length)];
    const randomDonorCountry = DONOR_COUNTRIES[Math.floor(Math.random() * DONOR_COUNTRIES.length)];
    const randomAmount = DONATION_AMOUNTS[Math.floor(Math.random() * DONATION_AMOUNTS.length)];

    await storage.createDonation({
      userId: demoUser.id,
      conflictId: randomConflict.id,
      organizationId: randomOrg.id,
      amount: randomAmount.toString(),
      type: 'one-time',
      donorCountry: randomDonorCountry,
    });
  }

  console.log('✅ Successfully seeded 50 global donations!');
  console.log(`🌍 Donations from: ${DONOR_COUNTRIES.join(', ')}`);
  console.log(`🎯 Donations to: ${allConflicts.length} different conflict regions`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGlobalDonations()
    .then(() => {
      console.log('✅ Seed complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedGlobalDonations };
