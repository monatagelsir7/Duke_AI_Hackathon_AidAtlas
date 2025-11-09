import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, jsonb, boolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  preferences: jsonb("preferences").$type<{
    causes: string[];
    regions: string[];
    donationRange: string;
  }>(),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conflicts = pgTable("conflicts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  country: text("country").notNull(),
  region: text("region").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  severityLevel: text("severity_level").notNull(),
  affectedGroups: jsonb("affected_groups").$type<string[]>().notNull(),
  imageUrl: text("image_url"),
  source: text("source").default('manual'), // Track data source: reliefweb, acled, icrc, manual
  needsReview: boolean("needs_review").default(false), // Flag for admin review
  sourceData: jsonb("source_data"), // Store original source metadata
  
  // Detailed statistics (populated via OpenAI extraction from ReliefWeb)
  peopleAffected: text("people_affected"), // e.g., "8.3 million" or null
  internallyDisplaced: text("internally_displaced"), // e.g., "2 million" or null
  refugeesAbroad: text("refugees_abroad"), // e.g., "1.5 million" or null
  crisisStartYear: text("crisis_start_year"), // e.g., "2009" or null
  primaryNeeds: jsonb("primary_needs").$type<string[]>(), // ["Food Security", "Medical Care", "Shelter"]
  detailsLastUpdated: timestamp("details_last_updated"), // When statistics were last updated
  
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  ein: varchar("ein", { length: 20 }), // Tax ID for US nonprofits
  website: text("website"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  country: varchar("country", { length: 100 }).default('USA'),
  
  // Legacy rating field (kept for backwards compatibility)
  rating: decimal("rating", { precision: 2, scale: 1 }),
  verified: integer("verified").notNull().default(1),
  
  // Causes and countries
  causes: jsonb("causes").$type<string[]>().notNull(),
  countriesActive: jsonb("countries_active").$type<string[]>().notNull(),
  
  // Verification status
  verificationStatus: varchar("verification_status", { length: 50 }).notNull().default('pending'),
  verificationLevel: integer("verification_level").notNull().default(0), // 0=unverified, 1-3=verified levels
  verificationData: jsonb("verification_data"),
  lastVerified: timestamp("last_verified"),
  verifiedBy: varchar("verified_by"), // References admin user
  
  // Third-party ratings
  charityNavigatorRating: decimal("charity_navigator_rating", { precision: 2, scale: 1 }),
  charityNavigatorId: varchar("charity_navigator_id", { length: 255 }),
  financialRating: decimal("financial_rating", { precision: 2, scale: 1 }),
  accountabilityRating: decimal("accountability_rating", { precision: 2, scale: 1 }),
  
  guidestarVerified: boolean("guidestar_verified").default(false),
  guidestarSeal: varchar("guidestar_seal", { length: 50 }),
  
  bbbAccredited: boolean("bbb_accredited").default(false),
  
  // Financial data
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }),
  programExpenses: decimal("program_expenses", { precision: 15, scale: 2 }),
  administrativeExpenses: decimal("administrative_expenses", { precision: 15, scale: 2 }),
  fundraisingExpenses: decimal("fundraising_expenses", { precision: 15, scale: 2 }),
  programExpensePercentage: decimal("program_expense_percentage", { precision: 5, scale: 2 }),
  overheadPercentage: decimal("overhead_percentage", { precision: 5, scale: 2 }),
  fiscalYearEnd: timestamp("fiscal_year_end"),
  
  // Trust score
  trustScore: integer("trust_score"), // 0-100
  trustScoreUpdated: timestamp("trust_score_updated"),
  
  // Risk assessment
  riskLevel: varchar("risk_level", { length: 20 }), // low, medium, high
  riskScore: decimal("risk_score", { precision: 3, scale: 2 }), // 0.0-1.0
  riskAssessment: jsonb("risk_assessment"),
  
  // Operational
  yearsOperating: integer("years_operating"),
  consistent990Filing: boolean("consistent_990_filing"),
  lastImpactUpdate: timestamp("last_impact_update"),
  
  // Stripe Connect (for payment processing)
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeOnboardingCompleted: boolean("stripe_onboarding_completed").default(false),
  stripeChargesEnabled: boolean("stripe_charges_enabled").default(false),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").default(false),
  
  // Status
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verification documents
export const verificationDocuments = pgTable("verification_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  documentType: varchar("document_type", { length: 100 }).notNull(), // irs_determination_letter, form_990, etc.
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  
  // OCR results
  ocrText: text("ocr_text"),
  
  // AI analysis
  analysis: jsonb("analysis"),
  verified: boolean("verified").default(false),
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.0-1.0
  extractedData: jsonb("extracted_data"),
  
  // Review
  reviewedBy: varchar("reviewed_by"), // References admin user
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Trust scores history
export const organizationTrustScores = pgTable("organization_trust_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  totalScore: integer("total_score").notNull(), // 0-100
  breakdown: jsonb("breakdown").$type<{
    ratings: number;
    financial: number;
    history: number;
    verification: number;
    impact_reporting: number;
    user_feedback: number;
  }>(), // Score breakdown by category
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

// Verification history (audit log)
export const verificationHistory = pgTable("verification_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  action: varchar("action", { length: 100 }), // submitted, verified, rejected, etc.
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  
  performedBy: varchar("performed_by"), // References admin user
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// User-reported issues
export const organizationReports = pgTable("organization_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  reportType: varchar("report_type", { length: 100 }), // fraud, misinformation, poor_service, etc.
  description: text("description"),
  evidenceUrls: jsonb("evidence_urls").$type<string[]>(),
  
  status: varchar("status", { length: 50 }).notNull().default('pending'), // pending, investigating, resolved, dismissed
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by"), // References admin user
  resolvedAt: timestamp("resolved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Donation feedback (for trust scoring)
export const donationFeedback = pgTable("donation_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donationId: varchar("donation_id").notNull().references(() => donations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  userSatisfied: boolean("user_satisfied"),
  rating: integer("rating"), // 1-5 stars
  feedbackText: text("feedback_text"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  conflictId: varchar("conflict_id").notNull().references(() => conflicts.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(),
  donorCountry: text("donor_country"), // Track where donation originated from
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
});

export const insertConflictSchema = createInsertSchema(conflicts).omit({
  id: true,
  lastUpdated: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
}).extend({
  donorCountry: z.string().default('United States'), // Default to US for simplicity in MVP
});

export const insertVerificationDocumentSchema = createInsertSchema(verificationDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertOrganizationTrustScoreSchema = createInsertSchema(organizationTrustScores).omit({
  id: true,
  calculatedAt: true,
});

export const insertVerificationHistorySchema = createInsertSchema(verificationHistory).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationReportSchema = createInsertSchema(organizationReports).omit({
  id: true,
  createdAt: true,
});

export const insertDonationFeedbackSchema = createInsertSchema(donationFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertConflict = z.infer<typeof insertConflictSchema>;
export type Conflict = typeof conflicts.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;
export type InsertVerificationDocument = z.infer<typeof insertVerificationDocumentSchema>;
export type VerificationDocument = typeof verificationDocuments.$inferSelect;
export type InsertOrganizationTrustScore = z.infer<typeof insertOrganizationTrustScoreSchema>;
export type OrganizationTrustScore = typeof organizationTrustScores.$inferSelect;
export type InsertVerificationHistory = z.infer<typeof insertVerificationHistorySchema>;
export type VerificationHistory = typeof verificationHistory.$inferSelect;
export type InsertOrganizationReport = z.infer<typeof insertOrganizationReportSchema>;
export type OrganizationReport = typeof organizationReports.$inferSelect;
export type InsertDonationFeedback = z.infer<typeof insertDonationFeedbackSchema>;
export type DonationFeedback = typeof donationFeedback.$inferSelect;

// Behavioral Tracking Schema
export const userEvents = pgTable("user_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  conflictId: varchar("conflict_id").references(() => conflicts.id, { onDelete: 'cascade' }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  eventType: text("event_type").notNull(), // swipe_up, swipe_pass, swipe_down, view_details, donate, etc.
  eventData: jsonb("event_data").$type<{
    timeSpent?: number; // seconds
    swipeDirection?: string;
    donationAmount?: number;
    metadata?: Record<string, any>;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User preference vector (behavioral learning)
export const userPreferenceVectors = pgTable("user_preference_vectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  
  // Geographic preferences (learned weights)
  geoPreferences: jsonb("geo_preferences").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
  
  // Cause preferences (learned weights)
  causePreferences: jsonb("cause_preferences").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
  
  // Demographic preferences
  demographicPreferences: jsonb("demographic_preferences").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
  
  // Urgency preference (0-1 scale)
  urgencyPreference: decimal("urgency_preference", { precision: 3, scale: 2 }).notNull().default('0.5'),
  
  // Interaction count (for weight calculation)
  interactionCount: integer("interaction_count").notNull().default(0),
  
  // Last updated
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content sources tracking (for automated pipeline)
export const contentSources = pgTable("content_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceName: text("source_name").notNull(), // reliefweb, acled, unhcr, etc.
  sourceType: text("source_type").notNull(), // authoritative, news, academic
  apiEndpoint: text("api_endpoint"),
  credibilityScore: decimal("credibility_score", { precision: 2, scale: 1 }).notNull().default('5.0'),
  lastScraped: timestamp("last_scraped"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scraped content (raw data before processing)
export const scrapedContent = pgTable("scraped_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").notNull().references(() => contentSources.id, { onDelete: 'cascade' }),
  contentType: text("content_type").notNull(), // report, news_article, statistical_data
  rawData: jsonb("raw_data").notNull(), // Original scraped data
  countryCode: text("country_code"),
  extractedAt: timestamp("extracted_at").defaultNow(),
  processed: boolean("processed").notNull().default(false),
});

// Conflict approval queue (admin review)
export const conflictApprovals = pgTable("conflict_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conflictId: varchar("conflict_id").references(() => conflicts.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default('pending'), // pending, approved, rejected
  generatedContent: jsonb("generated_content"), // AI-generated content awaiting approval
  reviewedBy: varchar("reviewed_by"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertUserEventSchema = createInsertSchema(userEvents).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferenceVectorSchema = createInsertSchema(userPreferenceVectors).omit({
  id: true,
  updatedAt: true,
});

export const insertContentSourceSchema = createInsertSchema(contentSources).omit({
  id: true,
  createdAt: true,
});

export const insertScrapedContentSchema = createInsertSchema(scrapedContent).omit({
  id: true,
  extractedAt: true,
});

export const insertConflictApprovalSchema = createInsertSchema(conflictApprovals).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export type InsertUserEvent = z.infer<typeof insertUserEventSchema>;
export type UserEvent = typeof userEvents.$inferSelect;
export type InsertUserPreferenceVector = z.infer<typeof insertUserPreferenceVectorSchema>;
export type UserPreferenceVector = typeof userPreferenceVectors.$inferSelect;
export type InsertContentSource = z.infer<typeof insertContentSourceSchema>;
export type ContentSource = typeof contentSources.$inferSelect;
export type InsertScrapedContent = z.infer<typeof insertScrapedContentSchema>;
export type ScrapedContent = typeof scrapedContent.$inferSelect;
export type InsertConflictApproval = z.infer<typeof insertConflictApprovalSchema>;
export type ConflictApproval = typeof conflictApprovals.$inferSelect;

// Actions Schema (Protests, Petitions, Advocacy)
export const actions = pgTable("actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // External tracking
  externalId: text("external_id"), // ID from source platform
  source: text("source"), // eventbrite, change_org, manual, etc.
  
  // Type and basic info
  type: text("type").notNull(), // protest, petition, advocacy
  title: text("title").notNull(),
  description: text("description"),
  shortDescription: text("short_description"), // AI-generated summary
  
  // Location (for protests/events)
  locationName: text("location_name"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Timing
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  timezone: text("timezone"),
  
  // Organizer
  organizerName: text("organizer_name"),
  organizerDescription: text("organizer_description"),
  organizerUrl: text("organizer_url"),
  
  // Petition-specific
  target: text("target"), // Who petition is addressed to
  signatureCount: integer("signature_count"),
  signatureGoal: integer("signature_goal"),
  
  // Advocacy-specific
  representatives: jsonb("representatives").$type<Array<{
    name: string;
    chamber: string;
    party: string;
    phone?: string;
    contactForm?: string;
  }>>(),
  talkingPoints: jsonb("talking_points").$type<string[]>(),
  
  // Conflict relevance
  relatedConflicts: jsonb("related_conflicts").$type<string[]>(), // Array of conflict IDs
  relatedCountry: text("related_country"), // ISO country code
  tags: jsonb("tags").$type<string[]>(), // humanitarian, refugee, medical, etc.
  
  // Engagement
  url: text("url").notNull(),
  isFree: boolean("is_free").notNull().default(true),
  capacity: integer("capacity"),
  currentAttendance: integer("current_attendance"),
  
  // AI-enhanced content
  enhancedDescription: jsonb("enhanced_description").$type<{
    shortDescription?: string;
    whyAttend?: string;
    whySign?: string;
    whatToExpect?: string;
    whatToBring?: string[];
    howItHelps?: string;
    impact?: string;
  }>(),
  
  // Status
  status: text("status").notNull().default('active'), // active, completed, cancelled
  verificationStatus: text("verification_status").notNull().default('unverified'), // verified, unverified, flagged
  
  // Metadata
  scrapedAt: timestamp("scraped_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User action participation tracking
export const userActionParticipation = pgTable("user_action_participation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  actionId: varchar("action_id").notNull().references(() => actions.id, { onDelete: 'cascade' }),
  
  // Participation type
  participationType: text("participation_type"), // attended, signed, contacted, shared, interested
  
  // User contribution
  personalMessage: text("personal_message"), // For advocacy: their customized message
  
  // Status
  status: text("status").notNull().default('interested'), // interested, committed, completed
  reminded: boolean("reminded").notNull().default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// User reminders for actions
export const actionReminders = pgTable("action_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  actionId: varchar("action_id").notNull().references(() => actions.id, { onDelete: 'cascade' }),
  
  reminderTime: timestamp("reminder_time").notNull(),
  reminderType: text("reminder_type"), // 1_day_before, 1_hour_before, custom
  sent: boolean("sent").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Action reports/flags
export const actionReports = pgTable("action_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionId: varchar("action_id").notNull().references(() => actions.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  reportType: text("report_type"), // spam, inappropriate, misinformation, cancelled
  description: text("description"),
  
  status: text("status").notNull().default('pending'), // pending, reviewed, resolved
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas and types for actions
export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  scrapedAt: true,
  lastUpdated: true,
  createdAt: true,
});

export const insertUserActionParticipationSchema = createInsertSchema(userActionParticipation).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertActionReminderSchema = createInsertSchema(actionReminders).omit({
  id: true,
  createdAt: true,
});

export const insertActionReportSchema = createInsertSchema(actionReports).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export type InsertAction = z.infer<typeof insertActionSchema>;
export type Action = typeof actions.$inferSelect;
export type InsertUserActionParticipation = z.infer<typeof insertUserActionParticipationSchema>;
export type UserActionParticipation = typeof userActionParticipation.$inferSelect;
export type InsertActionReminder = z.infer<typeof insertActionReminderSchema>;
export type ActionReminder = typeof actionReminders.$inferSelect;
export type InsertActionReport = z.infer<typeof insertActionReportSchema>;
export type ActionReport = typeof actionReports.$inferSelect;

// ===== GAMIFICATION SCHEMA =====

// Monthly Reports
export const monthlyReports = pgTable("monthly_reports", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM format
  reportData: jsonb("report_data").$type<{
    monthlyTotal: number;
    donationCount: number;
    momChange: number;
    newBadges: any[];
    streak: any;
    donationsByCountry: any[];
    donationsByCause: any[];
    timeline: any[];
    comparison: any;
    suggestions: string[];
  }>().notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.month] })
}));

// User Badges
export const userBadges = pgTable("user_badges", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeType: varchar("badge_type", { length: 100 }).notNull(),
  badgeName: varchar("badge_name", { length: 255 }),
  badgeIcon: varchar("badge_icon", { length: 50 }),
  badgeDescription: text("badge_description"),
  earnedAt: timestamp("earned_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.badgeType] })
}));

// User Points
export const userPoints = pgTable("user_points", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  totalPoints: integer("total_points").notNull().default(0),
  pointsThisMonth: integer("points_this_month").notNull().default(0),
  level: integer("level").notNull().default(1),
  nextLevelPoints: integer("next_level_points").notNull().default(100),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Points History
export const pointsHistory = pgTable("points_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  pointsEarned: integer("points_earned").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly Challenges
export const monthlyChallenges = pgTable("monthly_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  goal: integer("goal"),
  reward: text("reward"),
  displayOrder: integer("display_order"),
  isActive: boolean("is_active").notNull().default(true),
});

// User Challenge Progress
export const userChallenges = pgTable("user_challenges", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  challengeId: varchar("challenge_id").notNull().references(() => monthlyChallenges.id, { onDelete: 'cascade' }),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.challengeId] })
}));

// Impact Stories
export const impactStories = pgTable("impact_stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  conflictId: varchar("conflict_id").references(() => conflicts.id, { onDelete: 'set null' }),
  title: varchar("title", { length: 500 }),
  storyText: text("story_text").notNull(),
  imageUrl: text("image_url"),
  beneficiaryType: varchar("beneficiary_type", { length: 100 }), // individual, family, community
  impactMetric: varchar("impact_metric", { length: 255 }), // "100 families housed"
  publishedAt: timestamp("published_at").defaultNow(),
  isFeatured: boolean("is_featured").notNull().default(false),
});

// CharityWatch Nonprofit Cache (for Support page)
export const charitywatchCache = pgTable("charitywatch_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  country: text("country").notNull(),
  nonprofits: jsonb("nonprofits").$type<Array<{
    name: string;
    charityWatchRating: string; // A+, A, A-, B+, B
    programPercent: number; // 85, 92, etc.
    logoUrl: string;
    donateUrl: string;
    website: string;
    ein?: string;
    founded?: string;
    description: string[];
  }>>().notNull(),
  cachedAt: timestamp("cached_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Donation Tracking (external donations via Every.org/CharityWatch)
export const externalDonations = pgTable("external_donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  conflictId: varchar("conflict_id").references(() => conflicts.id, { onDelete: 'set null' }),
  conflictCountry: text("conflict_country").notNull(),
  nonprofitName: text("nonprofit_name").notNull(),
  nonprofitEin: text("nonprofit_ein"),
  donateUrl: text("donate_url").notNull(),
  status: varchar("status", { length: 50 }).notNull().default('initiated'), // initiated, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for gamification
export const insertMonthlyReportSchema = createInsertSchema(monthlyReports).omit({
  generatedAt: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  earnedAt: true,
});

export const insertUserPointsSchema = createInsertSchema(userPoints).omit({
  updatedAt: true,
});

export const insertPointsHistorySchema = createInsertSchema(pointsHistory).omit({
  id: true,
  createdAt: true,
});

export const insertMonthlyChallengeSchema = createInsertSchema(monthlyChallenges).omit({
  id: true,
});

export const insertUserChallengeSchema = createInsertSchema(userChallenges).omit({
  completedAt: true,
});

export const insertImpactStorySchema = createInsertSchema(impactStories).omit({
  id: true,
  publishedAt: true,
});

export const insertCharitywatchCacheSchema = createInsertSchema(charitywatchCache).omit({
  id: true,
  cachedAt: true,
});

export const insertExternalDonationSchema = createInsertSchema(externalDonations).omit({
  id: true,
  createdAt: true,
});

// Types for gamification
export type InsertMonthlyReport = z.infer<typeof insertMonthlyReportSchema>;
export type MonthlyReport = typeof monthlyReports.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserPoints = z.infer<typeof insertUserPointsSchema>;
export type UserPoints = typeof userPoints.$inferSelect;
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type PointsHistory = typeof pointsHistory.$inferSelect;
export type InsertMonthlyChallenge = z.infer<typeof insertMonthlyChallengeSchema>;
export type MonthlyChallenge = typeof monthlyChallenges.$inferSelect;
export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;
export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertImpactStory = z.infer<typeof insertImpactStorySchema>;
export type ImpactStory = typeof impactStories.$inferSelect;
export type InsertCharitywatchCache = z.infer<typeof insertCharitywatchCacheSchema>;
export type CharitywatchCache = typeof charitywatchCache.$inferSelect;
export type InsertExternalDonation = z.infer<typeof insertExternalDonationSchema>;
export type ExternalDonation = typeof externalDonations.$inferSelect;
