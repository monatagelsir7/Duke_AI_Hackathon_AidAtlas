import { db } from './db';
import { users, conflicts, organizations, donations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const donorCountries = [
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Canada',
  'Australia',
  'Japan',
  'Netherlands',
  'Sweden',
  'Norway',
  'Denmark',
  'Switzerland',
];

async function seedDonationGeography() {
  console.log('🌍 Starting donation geography seed...');

  // Create or find a demo user
  const email = 'demo@aidatlas.org';
  let user = (await db.select().from(users).where(eq(users.email, email)))[0];
  
  if (!user) {
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const result = await db.insert(users).values({
      name: 'Demo User',
      email,
      passwordHash: hashedPassword,
    }).returning();
    user = result[0];
    console.log(`✅ Created demo user: ${email}`);
  } else {
    console.log(`ℹ️  Using existing demo user: ${email}`);
  }

  // Get all conflicts and organizations
  const allConflicts = await db.select().from(conflicts);
  const allOrganizations = await db.select().from(organizations);

  if (allConflicts.length === 0 || allOrganizations.length === 0) {
    console.error('❌ No conflicts or organizations found. Run the main seed script first.');
    return;
  }

  console.log(`Found ${allConflicts.length} conflicts and ${allOrganizations.length} organizations`);

  // Create 20-30 donations from various donor countries to various conflict countries
  const numDonations = 25;
  const donationsToCreate = [];

  for (let i = 0; i < numDonations; i++) {
    const randomConflict = allConflicts[Math.floor(Math.random() * allConflicts.length)];
    const randomOrg = allOrganizations[Math.floor(Math.random() * allOrganizations.length)];
    const randomDonorCountry = donorCountries[Math.floor(Math.random() * donorCountries.length)];
    const randomAmount = (Math.random() * 200 + 10).toFixed(2); // $10 - $210
    
    // Create donations from past 6 months
    const daysAgo = Math.floor(Math.random() * 180); // 0-180 days
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    donationsToCreate.push({
      userId: user.id,
      conflictId: randomConflict.id,
      organizationId: randomOrg.id,
      amount: randomAmount,
      type: 'one-time',
      donorCountry: randomDonorCountry,
      createdAt,
    });
  }

  // Insert all donations
  await db.insert(donations).values(donationsToCreate);
  
  console.log(`✅ Created ${numDonations} donations with geographic data`);
  console.log('📊 Donation distribution:');
  
  // Show distribution by donor country
  const countryDistribution = donationsToCreate.reduce((acc, d) => {
    acc[d.donorCountry] = (acc[d.donorCountry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(countryDistribution)
    .sort(([, a], [, b]) => b - a)
    .forEach(([country, count]) => {
      console.log(`   ${country}: ${count} donations`);
    });

  console.log('\n🎉 Donation geography seed complete!');
  console.log(`📧 Demo user credentials: ${email} / demo123`);
}

seedDonationGeography()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
