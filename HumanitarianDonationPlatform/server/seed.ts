import { storage } from "./storage";
import { REAL_CONFLICTS_2025 } from "./real-conflicts-seed";

export async function seedDatabase() {
  console.log("Seeding database with 32 verified humanitarian conflicts...");

  // Only seed if database is empty or has fewer than 10 conflicts
  // This prevents duplication on server restart while allowing manual cleanup
  const existingConflicts = await storage.getConflicts();
  if (existingConflicts.length >= 10) {
    console.log(`Database already has ${existingConflicts.length} conflicts, skipping seed`);
    return;
  }
  
  console.log(`Database has ${existingConflicts.length} conflicts, proceeding with seed...`);

  // Use real conflict data from verified sources
  const conflicts = REAL_CONFLICTS_2025.map(conflict => ({
    ...conflict,
    imageUrl: null, // Will use colored severity cards
    needsReview: false,
    sourceData: {
      source: conflict.source,
      verified: true,
      lastUpdated: new Date().toISOString(),
    },
  }));

  const createdConflicts = await Promise.all(
    conflicts.map((conflict) => storage.createConflict(conflict))
  );

  console.log(`Created ${createdConflicts.length} conflicts`);

  // Seed organizations with realistic verification data
  const organizations = [
    {
      name: "Doctors Without Borders",
      description: "Provides emergency medical care in conflict zones and areas affected by endemic diseases.",
      website: "https://www.msf.org",
      ein: "13-3433452",
      rating: "4.8",
      causes: ["Medical aid", "Emergency response"],
      countriesActive: ["Syria", "Yemen", "Sudan", "Afghanistan", "Somalia"],
      verified: 1,
      verificationStatus: "verified",
      verificationLevel: 3,
      charityNavigatorRating: "4.0",
      guidestarSeal: "platinum",
      financialTransparency: "Excellent",
      verificationData: {
        audit_available: true,
        irs_990_public: true,
        third_party_evaluations: ["Charity Navigator", "GuideStar", "BBB Wise Giving"],
      },
    },
    {
      name: "International Rescue Committee",
      description: "Helps people whose lives have been shattered by conflict and disaster to survive, recover and rebuild.",
      website: "https://www.rescue.org",
      ein: "13-5660870",
      rating: "4.7",
      causes: ["Refugee assistance", "Education", "Healthcare"],
      countriesActive: ["Syria", "Yemen", "Somalia", "Afghanistan", "Ukraine"],
      verified: 1,
      verificationStatus: "verified",
      verificationLevel: 3,
      charityNavigatorRating: "4.0",
      guidestarSeal: "platinum",
      financialTransparency: "Excellent",
      verificationData: {
        audit_available: true,
        irs_990_public: true,
        third_party_evaluations: ["Charity Navigator", "GuideStar"],
      },
    },
    {
      name: "UNICEF",
      description: "Works in over 190 countries to save children's lives, defend their rights, and help them fulfill their potential.",
      website: "https://www.unicef.org",
      ein: "13-1760110",
      rating: "4.9",
      causes: ["Children's welfare", "Education", "Healthcare", "Nutrition"],
      countriesActive: ["Syria", "Yemen", "Sudan", "Somalia", "Afghanistan", "Ukraine"],
      verified: 1,
      verificationStatus: "verified",
      verificationLevel: 3,
      charityNavigatorRating: "4.0",
      guidestarSeal: "platinum",
      financialTransparency: "Excellent",
      verificationData: {
        audit_available: true,
        irs_990_public: true,
        third_party_evaluations: ["Charity Navigator", "GuideStar", "BBB Wise Giving"],
        un_accredited: true,
      },
    },
    {
      name: "World Food Programme",
      description: "The world's largest humanitarian organization fighting hunger worldwide, delivering food assistance in emergencies.",
      website: "https://www.wfp.org",
      rating: "4.8",
      causes: ["Food security", "Emergency response"],
      countriesActive: ["Yemen", "Sudan", "Somalia", "Syria", "Afghanistan"],
      verified: 1,
      verificationStatus: "verified",
      verificationLevel: 3,
      charityNavigatorRating: "4.0",
      financialTransparency: "Excellent",
      verificationData: {
        un_agency: true,
        audit_available: true,
        third_party_evaluations: ["UN oversight"],
      },
    },
    {
      name: "Save the Children",
      description: "Works in 120 countries to help children survive, learn and be protected from harm.",
      website: "https://www.savethechildren.org",
      ein: "06-0726487",
      rating: "4.6",
      causes: ["Children's welfare", "Education", "Protection"],
      countriesActive: ["Syria", "Yemen", "Sudan", "Somalia", "Afghanistan", "Ukraine"],
      verified: 1,
      verificationStatus: "verified",
      verificationLevel: 2,
      charityNavigatorRating: "3.8",
      guidestarSeal: "gold",
      financialTransparency: "Good",
      verificationData: {
        audit_available: true,
        irs_990_public: true,
        third_party_evaluations: ["Charity Navigator"],
      },
    },
    {
      name: "International Medical Corps",
      description: "Provides medical relief and healthcare training to those affected by disaster, disease and conflict.",
      website: "https://internationalmedicalcorps.org",
      ein: "95-3949646",
      rating: "4.7",
      causes: ["Medical aid", "Healthcare", "Mental health"],
      countriesActive: ["Syria", "Yemen", "Sudan", "Ukraine"],
      verified: 1,
      verificationStatus: "verified",
      verificationLevel: 2,
      charityNavigatorRating: "3.9",
      guidestarSeal: "gold",
      financialTransparency: "Good",
      verificationData: {
        audit_available: true,
        irs_990_public: true,
      },
    },
    {
      name: "Oxfam International",
      description: "Works to end the injustice of poverty by providing clean water, food, and protection to communities in crisis.",
      website: "https://www.oxfam.org",
      rating: "4.5",
      causes: ["Water & sanitation", "Food security", "Women's rights"],
      countriesActive: ["Yemen", "Sudan", "Somalia", "Syria"],
      verified: 1,
      verificationStatus: "verified",
      verificationLevel: 2,
      charityNavigatorRating: "3.7",
      guidestarSeal: "silver",
      financialTransparency: "Good",
      verificationData: {
        audit_available: true,
        third_party_evaluations: ["Charity Navigator"],
      },
    },
    {
      name: "Norwegian Refugee Council",
      description: "Provides assistance to millions of people forced to flee their homes due to conflict and natural disasters.",
      website: "https://www.nrc.no",
      rating: "4.8",
      causes: ["Refugee assistance", "Shelter", "Education"],
      countriesActive: ["Syria", "Yemen", "Sudan", "Somalia", "Ukraine"],
      verified: 1,
      verificationStatus: "verified",
      verificationLevel: 3,
      charityNavigatorRating: "4.0",
      financialTransparency: "Excellent",
      verificationData: {
        audit_available: true,
        third_party_evaluations: ["International evaluations"],
      },
    },
  ];

  const createdOrganizations = await Promise.all(
    organizations.map((org) => storage.createOrganization(org))
  );

  console.log(`Created ${createdOrganizations.length} organizations`);

  // Create admin user
  console.log("Creating admin user...");
  const existingAdmin = await storage.getUserByEmail("admin@aidatlas.org");
  if (!existingAdmin) {
    const adminUser = await storage.createUser(
      {
        name: "Admin User",
        email: "admin@aidatlas.org",
        preferences: {
          causes: [],
          regions: [],
          donationRange: "any",
        },
        onboardingCompleted: true,
      },
      "admin123"
    );
    
    // Set admin flag directly
    await storage.updateUser(adminUser.id, { isAdmin: true });
    console.log("✓ Admin user created: admin@aidatlas.org / admin123");
  } else {
    console.log("✓ Admin user already exists");
  }

  console.log("Database seeded successfully!");

  return {
    conflicts: createdConflicts,
    organizations: createdOrganizations,
  };
}
