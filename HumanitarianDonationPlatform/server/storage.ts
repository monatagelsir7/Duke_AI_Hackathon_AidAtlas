import { 
  type User, 
  type InsertUser,
  type Conflict,
  type InsertConflict,
  type Organization,
  type InsertOrganization,
  type Donation,
  type InsertDonation,
  type UserEvent,
  type InsertUserEvent,
  type UserPreferenceVector,
  type InsertUserPreferenceVector,
  type ContentSource,
  type InsertContentSource,
  type ScrapedContent,
  type InsertScrapedContent,
  type ConflictApproval,
  type InsertConflictApproval,
  type Action,
  type InsertAction,
  type UserActionParticipation,
  type InsertUserActionParticipation,
  type ActionReminder,
  type InsertActionReminder,
  type ActionReport,
  type InsertActionReport,
  type MonthlyReport,
  type InsertMonthlyReport,
  type UserBadge,
  type InsertUserBadge,
  type UserPoints,
  type InsertUserPoints,
  type PointsHistory,
  type InsertPointsHistory,
  type MonthlyChallenge,
  type InsertMonthlyChallenge,
  type UserChallenge,
  type InsertUserChallenge,
  type ImpactStory,
  type InsertImpactStory,
  type InsertOrganizationReport,
  type OrganizationReport,
  type InsertVerificationHistory,
  type VerificationHistory,
  charitywatchCache,
  externalDonations,
  users,
  conflicts,
  organizations,
  donations,
  userEvents,
  userPreferenceVectors,
  contentSources,
  scrapedContent,
  conflictApprovals,
  actions,
  userActionParticipation,
  actionReminders,
  actionReports,
  monthlyReports,
  userBadges,
  userPoints,
  pointsHistory,
  monthlyChallenges,
  userChallenges,
  impactStories,
  organizationReports,
  verificationHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, inArray, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser, password: string): Promise<User>;
  updateUser(id: string, user: Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>): Promise<User | undefined>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  
  // Conflict operations
  getConflicts(): Promise<Conflict[]>;
  getConflict(id: string): Promise<Conflict | undefined>;
  getConflictsByRegion(region: string): Promise<Conflict[]>;
  createConflict(conflict: InsertConflict): Promise<Conflict>;
  
  // Organization operations
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationsByConflict(conflictId: string): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  
  // Donation operations
  getDonations(userId: string): Promise<Donation[]>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  getDonationGeography(userId: string): Promise<Array<{
    id: string;
    fromCountry: string;
    toCountry: string;
    amount: string;
    createdAt: string;
  }>>;
  getAllDonationGeography(): Promise<Array<{
    id: string;
    fromCountry: string;
    toCountry: string;
    amount: string;
    createdAt: string;
  }>>;
  getUserImpactStats(userId: string): Promise<{
    totalDonated: number;
    peopleHelped: number;
    organizationsSupported: number;
    conflictsSupported: number;
  }>;
  
  // Behavioral tracking operations
  createUserEvent(event: InsertUserEvent): Promise<UserEvent>;
  getUserEvents(userId: string, limit?: number): Promise<UserEvent[]>;
  
  // Preference vector operations
  getUserPreferenceVector(userId: string): Promise<UserPreferenceVector | undefined>;
  createUserPreferenceVector(vector: InsertUserPreferenceVector): Promise<UserPreferenceVector>;
  updateUserPreferenceVector(userId: string, updates: Partial<UserPreferenceVector>): Promise<UserPreferenceVector | undefined>;
  
  // Content source operations
  getContentSources(activeOnly?: boolean): Promise<ContentSource[]>;
  createContentSource(source: InsertContentSource): Promise<ContentSource>;
  updateContentSource(id: string, updates: Partial<ContentSource>): Promise<ContentSource | undefined>;
  
  // Scraped content operations
  createScrapedContent(content: InsertScrapedContent): Promise<ScrapedContent>;
  getUnprocessedContent(limit?: number): Promise<ScrapedContent[]>;
  markContentProcessed(id: string): Promise<void>;
  storeScrapedContent(conflicts: Map<string, any>): Promise<number>;
  processScrapedContent(limit?: number): Promise<number>;
  
  // Conflict approval operations
  createConflictApproval(approval: InsertConflictApproval): Promise<ConflictApproval>;
  getPendingApprovals(): Promise<ConflictApproval[]>;
  approveConflict(id: string, reviewedBy: string, notes?: string): Promise<ConflictApproval | undefined>;
  rejectConflict(id: string, reviewedBy: string, notes?: string): Promise<ConflictApproval | undefined>;
  
  // Action operations
  getActions(filters?: { type?: string; status?: string; conflictId?: string; limit?: number }): Promise<Action[]>;
  getAction(id: string): Promise<Action | undefined>;
  getActionsByConflict(conflictId: string, limit?: number): Promise<Action[]>;
  getActionsByLocation(latitude: number, longitude: number, radiusMiles?: number, limit?: number): Promise<Action[]>;
  createAction(action: InsertAction): Promise<Action>;
  updateAction(id: string, updates: Partial<Action>): Promise<Action | undefined>;
  
  // User action participation operations
  getUserActionParticipation(userId: string, actionId: string): Promise<UserActionParticipation | undefined>;
  createUserActionParticipation(participation: InsertUserActionParticipation): Promise<UserActionParticipation>;
  updateUserActionParticipation(id: string, updates: Partial<UserActionParticipation>): Promise<UserActionParticipation | undefined>;
  getUserParticipatedActions(userId: string, limit?: number): Promise<Action[]>;
  
  // Action reminder operations
  createActionReminder(reminder: InsertActionReminder): Promise<ActionReminder>;
  getUserActionReminders(userId: string): Promise<ActionReminder[]>;
  deleteActionReminder(id: string): Promise<void>;
  
  // Action report operations
  createActionReport(report: InsertActionReport): Promise<ActionReport>;
  getActionReports(actionId?: string): Promise<ActionReport[]>;
  
  // Gamification - Monthly Reports
  getMonthlyReport(userId: string, month: string): Promise<MonthlyReport | undefined>;
  createMonthlyReport(report: InsertMonthlyReport): Promise<MonthlyReport>;
  getUserMonthlyReports(userId: string, limit?: number): Promise<MonthlyReport[]>;
  
  // Gamification - Badges
  getUserBadges(userId: string): Promise<UserBadge[]>;
  awardBadge(badge: InsertUserBadge): Promise<UserBadge>;
  hasBadge(userId: string, badgeType: string): Promise<boolean>;
  
  // Gamification - Points
  getUserPoints(userId: string): Promise<UserPoints | undefined>;
  createUserPoints(points: InsertUserPoints): Promise<UserPoints>;
  addPoints(userId: string, activityType: string, pointsEarned: number, description?: string): Promise<UserPoints>;
  getPointsHistory(userId: string, limit?: number): Promise<PointsHistory[]>;
  
  // Gamification - Challenges
  getActiveChallenges(month: string): Promise<MonthlyChallenge[]>;
  createChallenge(challenge: InsertMonthlyChallenge): Promise<MonthlyChallenge>;
  getUserChallengeProgress(userId: string, challengeId: string): Promise<UserChallenge | undefined>;
  updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<UserChallenge>;
  getUserChallenges(userId: string): Promise<Array<UserChallenge & { challenge: MonthlyChallenge }>>;
  
  // Gamification - Impact Stories
  getImpactStories(filters?: { organizationId?: string; conflictId?: string; featured?: boolean; limit?: number }): Promise<ImpactStory[]>;
  createImpactStory(story: InsertImpactStory): Promise<ImpactStory>;
  
  // Verification operations
  createOrganizationReport(report: any): Promise<void>;
  getPendingVerifications(): Promise<Organization[]>;
  approveOrganization(id: string, data: { verificationLevel: number; verifiedBy: string; notes?: string }): Promise<void>;
  rejectOrganization(id: string, data: { reason: string; rejectedBy: string; notes?: string }): Promise<void>;
  requestOrganizationInfo(id: string, data: { requestedItems: string[]; requestedBy: string; notes?: string }): Promise<void>;
  
  // Nonprofit cache operations
  getCharitywatchCache(country: string): Promise<typeof charitywatchCache.$inferSelect | undefined>;
  cacheCharitywatchData(country: string, nonprofits: any[], expiresAt: Date): Promise<void>;
  
  // External donation tracking
  trackExternalDonation(data: {
    userId: string;
    conflictId?: string;
    conflictCountry: string;
    nonprofitName: string;
    nonprofitEin?: string;
    donateUrl: string;
  }): Promise<typeof externalDonations.$inferSelect>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await db.insert(users).values({
      name: insertUser.name,
      email: insertUser.email,
      passwordHash,
      preferences: insertUser.preferences ?? null,
      onboardingCompleted: false,
    }).returning();
    
    return result[0];
  }

  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>): Promise<User | undefined> {
    const updateData: any = {};
    
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.preferences !== undefined) updateData.preferences = userData.preferences;
    if (userData.onboardingCompleted !== undefined) updateData.onboardingCompleted = userData.onboardingCompleted;
    
    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    
    return user;
  }

  // Conflict operations
  async getConflicts(): Promise<Conflict[]> {
    return await db.select().from(conflicts);
  }

  async getConflict(id: string): Promise<Conflict | undefined> {
    const result = await db.select().from(conflicts).where(eq(conflicts.id, id));
    return result[0];
  }

  async getConflictsByRegion(region: string): Promise<Conflict[]> {
    return await db.select().from(conflicts).where(sql`lower(${conflicts.region}) = lower(${region})`);
  }

  async createConflict(insertConflict: InsertConflict): Promise<Conflict> {
    const result = await db.insert(conflicts).values(insertConflict).returning();
    return result[0];
  }

  // Organization operations
  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id));
    return result[0];
  }

  async getOrganizationsByConflict(conflictId: string): Promise<Organization[]> {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) return [];
    
    const allOrgs = await this.getOrganizations();
    return allOrgs.filter((org) => org.countriesActive.includes(conflict.country));
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const result = await db.insert(organizations).values(insertOrg).returning();
    return result[0];
  }

  // Donation operations
  async getDonations(userId: string): Promise<Donation[]> {
    return await db.select().from(donations).where(eq(donations.userId, userId));
  }

  async createDonation(insertDonation: InsertDonation): Promise<Donation> {
    const result = await db.insert(donations).values(insertDonation).returning();
    return result[0];
  }

  async getDonationGeography(userId: string): Promise<Array<{
    id: string;
    fromCountry: string;
    toCountry: string;
    amount: string;
    createdAt: string;
  }>> {
    const userDonations = await db
      .select({
        id: donations.id,
        donorCountry: donations.donorCountry,
        conflictCountry: conflicts.country,
        amount: donations.amount,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .innerJoin(conflicts, eq(donations.conflictId, conflicts.id))
      .where(eq(donations.userId, userId));

    return userDonations.map((d) => ({
      id: d.id,
      fromCountry: d.donorCountry || 'United States',
      toCountry: d.conflictCountry,
      amount: d.amount,
      createdAt: d.createdAt?.toISOString() || new Date().toISOString(),
    }));
  }

  async getAllDonationGeography(): Promise<Array<{
    id: string;
    fromCountry: string;
    toCountry: string;
    amount: string;
    createdAt: string;
  }>> {
    const allDonations = await db
      .select({
        id: donations.id,
        donorCountry: donations.donorCountry,
        conflictCountry: conflicts.country,
        amount: donations.amount,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .innerJoin(conflicts, eq(donations.conflictId, conflicts.id));

    return allDonations.map((d) => ({
      id: d.id,
      fromCountry: d.donorCountry || 'United States',
      toCountry: d.conflictCountry,
      amount: d.amount,
      createdAt: d.createdAt?.toISOString() || new Date().toISOString(),
    }));
  }

  async getUserImpactStats(userId: string): Promise<{
    totalDonated: number;
    peopleHelped: number;
    organizationsSupported: number;
    conflictsSupported: number;
  }> {
    const userDonations = await this.getDonations(userId);
    
    const totalDonated = userDonations.reduce(
      (sum, donation) => sum + parseFloat(donation.amount as string), 
      0
    );
    
    const uniqueOrgs = new Set(userDonations.map(d => d.organizationId));
    const uniqueConflicts = new Set(
      userDonations.filter(d => d.conflictId).map(d => d.conflictId)
    );
    
    // Estimate people helped: $10 per person (rough humanitarian aid estimate)
    const peopleHelped = Math.floor(totalDonated / 10);
    
    return {
      totalDonated,
      peopleHelped,
      organizationsSupported: uniqueOrgs.size,
      conflictsSupported: uniqueConflicts.size,
    };
  }

  // Behavioral tracking operations
  async createUserEvent(event: InsertUserEvent): Promise<UserEvent> {
    const result = await db.insert(userEvents).values(event).returning();
    return result[0];
  }

  async getUserEvents(userId: string, limit: number = 100): Promise<UserEvent[]> {
    return await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, userId))
      .orderBy(sql`${userEvents.createdAt} DESC`)
      .limit(limit);
  }

  // Preference vector operations
  async getUserPreferenceVector(userId: string): Promise<UserPreferenceVector | undefined> {
    const result = await db
      .select()
      .from(userPreferenceVectors)
      .where(eq(userPreferenceVectors.userId, userId));
    return result[0];
  }

  async createUserPreferenceVector(vector: InsertUserPreferenceVector): Promise<UserPreferenceVector> {
    const result = await db.insert(userPreferenceVectors).values(vector).returning();
    return result[0];
  }

  async updateUserPreferenceVector(
    userId: string, 
    updates: Partial<UserPreferenceVector>
  ): Promise<UserPreferenceVector | undefined> {
    const updateData: any = { updatedAt: sql`NOW()` };
    
    if (updates.geoPreferences !== undefined) updateData.geoPreferences = updates.geoPreferences;
    if (updates.causePreferences !== undefined) updateData.causePreferences = updates.causePreferences;
    if (updates.demographicPreferences !== undefined) updateData.demographicPreferences = updates.demographicPreferences;
    if (updates.urgencyPreference !== undefined) updateData.urgencyPreference = updates.urgencyPreference;
    if (updates.interactionCount !== undefined) updateData.interactionCount = updates.interactionCount;
    
    const result = await db
      .update(userPreferenceVectors)
      .set(updateData)
      .where(eq(userPreferenceVectors.userId, userId))
      .returning();
    
    return result[0];
  }

  // Content source operations
  async getContentSources(activeOnly: boolean = true): Promise<ContentSource[]> {
    if (activeOnly) {
      return await db.select().from(contentSources).where(eq(contentSources.isActive, true));
    }
    return await db.select().from(contentSources);
  }

  async createContentSource(source: InsertContentSource): Promise<ContentSource> {
    const result = await db.insert(contentSources).values(source).returning();
    return result[0];
  }

  async updateContentSource(
    id: string, 
    updates: Partial<ContentSource>
  ): Promise<ContentSource | undefined> {
    const updateData: any = {};
    
    if (updates.sourceName !== undefined) updateData.sourceName = updates.sourceName;
    if (updates.sourceType !== undefined) updateData.sourceType = updates.sourceType;
    if (updates.apiEndpoint !== undefined) updateData.apiEndpoint = updates.apiEndpoint;
    if (updates.credibilityScore !== undefined) updateData.credibilityScore = updates.credibilityScore;
    if (updates.lastScraped !== undefined) updateData.lastScraped = updates.lastScraped;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    const result = await db
      .update(contentSources)
      .set(updateData)
      .where(eq(contentSources.id, id))
      .returning();
    
    return result[0];
  }

  // Scraped content operations
  async createScrapedContent(content: InsertScrapedContent): Promise<ScrapedContent> {
    const result = await db.insert(scrapedContent).values(content).returning();
    return result[0];
  }

  async getUnprocessedContent(limit: number = 50): Promise<ScrapedContent[]> {
    return await db
      .select()
      .from(scrapedContent)
      .where(eq(scrapedContent.processed, false))
      .orderBy(sql`${scrapedContent.extractedAt} ASC`)
      .limit(limit);
  }

  async markContentProcessed(id: string): Promise<void> {
    await db
      .update(scrapedContent)
      .set({ processed: true })
      .where(eq(scrapedContent.id, id));
  }

  async storeScrapedContent(conflicts: Map<string, any>): Promise<number> {
    let storedCount = 0;
    
    // Get or create ReliefWeb source
    let source = await db
      .select()
      .from(contentSources)
      .where(eq(contentSources.sourceName, 'reliefweb'))
      .limit(1);
    
    if (source.length === 0) {
      const newSource = await db.insert(contentSources).values({
        sourceName: 'reliefweb',
        sourceType: 'authoritative',
        apiEndpoint: 'https://api.reliefweb.int/v1/reports',
        credibilityScore: '9.0',
        isActive: true,
      }).returning();
      source = newSource;
    }

    const sourceId = source[0].id;

    for (const [countryCode, conflictData] of conflicts.entries()) {
      await db.insert(scrapedContent).values({
        sourceId,
        contentType: 'humanitarian_report',
        rawData: conflictData,
        countryCode,
        processed: false,
      });
      storedCount++;
    }

    // Update last scraped timestamp
    await db
      .update(contentSources)
      .set({ lastScraped: sql`NOW()` })
      .where(eq(contentSources.id, sourceId));

    return storedCount;
  }

  async processScrapedContent(limit: number = 10): Promise<number> {
    // Get unprocessed content
    const unprocessed = await this.getUnprocessedContent(limit);
    
    if (unprocessed.length === 0) {
      return 0;
    }

    // For now, create placeholder approvals
    // LLM processing will be added when OpenAI key is available
    for (const content of unprocessed) {
      const rawData = content.rawData as any;
      
      // Create approval with placeholder generated content
      await this.createConflictApproval({
        status: 'pending',
        generatedContent: {
          country: rawData.countryName,
          region: this.getRegionFromCountryCode(rawData.countryCode),
          title: `${rawData.countryName} Humanitarian Crisis`,
          summary: `Ongoing humanitarian situation in ${rawData.countryName}. Based on ${rawData.reports?.length || 0} recent reports.`,
          severityLevel: 'moderate',
          affectedGroups: rawData.vulnerableGroups || [],
          source: 'reliefweb',
          rawContentId: content.id,
        },
      });

      await this.markContentProcessed(content.id);
    }

    return unprocessed.length;
  }

  private getRegionFromCountryCode(countryCode: string): string {
    // Simple region mapping - can be expanded
    const regionMap: Record<string, string> = {
      // Middle East
      'SYR': 'Middle East', 'YEM': 'Middle East', 'IRQ': 'Middle East',
      'PSE': 'Middle East', 'LBN': 'Middle East', 'JOR': 'Middle East',
      // Africa
      'ETH': 'Africa', 'SOM': 'Africa', 'SSD': 'Africa', 'SDN': 'Africa',
      'COD': 'Africa', 'CAF': 'Africa', 'NGA': 'Africa', 'MLI': 'Africa',
      // Asia
      'AFG': 'Asia', 'MMR': 'Asia', 'BGD': 'Asia', 'PAK': 'Asia',
      // Europe
      'UKR': 'Europe',
      // Latin America
      'VEN': 'Latin America', 'COL': 'Latin America', 'HTI': 'Latin America',
    };
    
    return regionMap[countryCode] || 'Other';
  }

  // Conflict approval operations
  async createConflictApproval(approval: InsertConflictApproval): Promise<ConflictApproval> {
    const result = await db.insert(conflictApprovals).values(approval).returning();
    return result[0];
  }

  async getPendingApprovals(): Promise<ConflictApproval[]> {
    return await db
      .select()
      .from(conflictApprovals)
      .where(eq(conflictApprovals.status, 'pending'))
      .orderBy(sql`${conflictApprovals.createdAt} ASC`);
  }

  async approveConflict(
    id: string, 
    reviewedBy: string, 
    notes?: string
  ): Promise<ConflictApproval | undefined> {
    const result = await db
      .update(conflictApprovals)
      .set({
        status: 'approved',
        reviewedBy,
        reviewNotes: notes || null,
        reviewedAt: sql`NOW()`,
      })
      .where(eq(conflictApprovals.id, id))
      .returning();
    
    return result[0];
  }

  async rejectConflict(
    id: string, 
    reviewedBy: string, 
    notes?: string
  ): Promise<ConflictApproval | undefined> {
    const result = await db
      .update(conflictApprovals)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewNotes: notes || null,
        reviewedAt: sql`NOW()`,
      })
      .where(eq(conflictApprovals.id, id))
      .returning();
    
    return result[0];
  }

  // Action operations
  async getActions(filters?: { 
    type?: string; 
    status?: string; 
    conflictId?: string; 
    limit?: number 
  }): Promise<Action[]> {
    let query = db.select().from(actions);
    
    const conditions = [];
    if (filters?.type) {
      conditions.push(eq(actions.type, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(actions.status, filters.status));
    }
    if (filters?.conflictId) {
      conditions.push(sql`${filters.conflictId} = ANY(${actions.relatedConflicts})`);
    }
    
    if (conditions.length > 0) {
      query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
    }
    
    const limit = filters?.limit || 50;
    return await query.limit(limit).orderBy(sql`${actions.createdAt} DESC`);
  }

  async getAction(id: string): Promise<Action | undefined> {
    const result = await db.select().from(actions).where(eq(actions.id, id));
    return result[0];
  }

  async getActionsByConflict(conflictId: string, limit = 20): Promise<Action[]> {
    return await db
      .select()
      .from(actions)
      .where(sql`${conflictId} = ANY(${actions.relatedConflicts})`)
      .limit(limit)
      .orderBy(sql`${actions.startTime} ASC NULLS LAST`);
  }

  async getActionsByLocation(
    latitude: number, 
    longitude: number, 
    radiusMiles = 50, 
    limit = 20
  ): Promise<Action[]> {
    // Using simple distance calculation (this could be optimized with PostGIS)
    // For now, we'll use a bounding box approach
    const latDelta = radiusMiles / 69; // 1 degree latitude ≈ 69 miles
    const lonDelta = radiusMiles / (69 * Math.cos(latitude * Math.PI / 180));
    
    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLon = longitude - lonDelta;
    const maxLon = longitude + lonDelta;
    
    return await db
      .select()
      .from(actions)
      .where(sql`
        ${actions.latitude} IS NOT NULL 
        AND ${actions.longitude} IS NOT NULL
        AND ${actions.latitude} BETWEEN ${minLat} AND ${maxLat}
        AND ${actions.longitude} BETWEEN ${minLon} AND ${maxLon}
        AND ${actions.status} = 'active'
      `)
      .limit(limit);
  }

  async createAction(action: InsertAction): Promise<Action> {
    const result = await db.insert(actions).values(action).returning();
    return result[0];
  }

  async updateAction(id: string, updates: Partial<Action>): Promise<Action | undefined> {
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.signatureCount !== undefined) updateData.signatureCount = updates.signatureCount;
    if (updates.currentAttendance !== undefined) updateData.currentAttendance = updates.currentAttendance;
    
    if (Object.keys(updateData).length === 0) {
      return this.getAction(id);
    }
    
    updateData.lastUpdated = sql`NOW()`;
    
    const result = await db
      .update(actions)
      .set(updateData)
      .where(eq(actions.id, id))
      .returning();
    
    return result[0];
  }

  // User action participation operations
  async getUserActionParticipation(
    userId: string, 
    actionId: string
  ): Promise<UserActionParticipation | undefined> {
    const result = await db
      .select()
      .from(userActionParticipation)
      .where(sql`${userActionParticipation.userId} = ${userId} AND ${userActionParticipation.actionId} = ${actionId}`);
    
    return result[0];
  }

  async createUserActionParticipation(
    participation: InsertUserActionParticipation
  ): Promise<UserActionParticipation> {
    const result = await db
      .insert(userActionParticipation)
      .values(participation)
      .returning();
    
    return result[0];
  }

  async updateUserActionParticipation(
    id: string, 
    updates: Partial<UserActionParticipation>
  ): Promise<UserActionParticipation | undefined> {
    const updateData: any = {};
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.participationType !== undefined) updateData.participationType = updates.participationType;
    if (updates.personalMessage !== undefined) updateData.personalMessage = updates.personalMessage;
    if (updates.reminded !== undefined) updateData.reminded = updates.reminded;
    
    if (updates.status === 'completed') {
      updateData.completedAt = sql`NOW()`;
    }
    
    const result = await db
      .update(userActionParticipation)
      .set(updateData)
      .where(eq(userActionParticipation.id, id))
      .returning();
    
    return result[0];
  }

  async getUserParticipatedActions(userId: string, limit = 50): Promise<Action[]> {
    const result = await db
      .select({
        action: actions,
      })
      .from(userActionParticipation)
      .innerJoin(actions, eq(userActionParticipation.actionId, actions.id))
      .where(eq(userActionParticipation.userId, userId))
      .limit(limit)
      .orderBy(sql`${userActionParticipation.createdAt} DESC`);
    
    return result.map(r => r.action);
  }

  // Action reminder operations
  async createActionReminder(reminder: InsertActionReminder): Promise<ActionReminder> {
    const result = await db.insert(actionReminders).values(reminder).returning();
    return result[0];
  }

  async getUserActionReminders(userId: string): Promise<ActionReminder[]> {
    return await db
      .select()
      .from(actionReminders)
      .where(eq(actionReminders.userId, userId))
      .orderBy(sql`${actionReminders.reminderTime} ASC`);
  }

  async deleteActionReminder(id: string): Promise<void> {
    await db.delete(actionReminders).where(eq(actionReminders.id, id));
  }

  // Action report operations
  async createActionReport(report: InsertActionReport): Promise<ActionReport> {
    const result = await db.insert(actionReports).values(report).returning();
    return result[0];
  }

  async getActionReports(actionId?: string): Promise<ActionReport[]> {
    if (actionId) {
      return await db
        .select()
        .from(actionReports)
        .where(eq(actionReports.actionId, actionId))
        .orderBy(sql`${actionReports.createdAt} DESC`);
    }
    
    return await db
      .select()
      .from(actionReports)
      .where(eq(actionReports.status, 'pending'))
      .orderBy(sql`${actionReports.createdAt} DESC`);
  }
  
  // Gamification - Monthly Reports
  async getMonthlyReport(userId: string, month: string): Promise<MonthlyReport | undefined> {
    const result = await db
      .select()
      .from(monthlyReports)
      .where(sql`${monthlyReports.userId} = ${userId} AND ${monthlyReports.month} = ${month}`);
    return result[0];
  }
  
  async createMonthlyReport(report: InsertMonthlyReport): Promise<MonthlyReport> {
    const result = await db.insert(monthlyReports).values(report).returning();
    return result[0];
  }
  
  async getUserMonthlyReports(userId: string, limit = 12): Promise<MonthlyReport[]> {
    return await db
      .select()
      .from(monthlyReports)
      .where(eq(monthlyReports.userId, userId))
      .orderBy(sql`${monthlyReports.month} DESC`)
      .limit(limit);
  }
  
  // Gamification - Badges
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(sql`${userBadges.earnedAt} DESC`);
  }
  
  async awardBadge(badge: InsertUserBadge): Promise<UserBadge> {
    const result = await db.insert(userBadges).values(badge).returning();
    return result[0];
  }
  
  async hasBadge(userId: string, badgeType: string): Promise<boolean> {
    const result = await db
      .select()
      .from(userBadges)
      .where(sql`${userBadges.userId} = ${userId} AND ${userBadges.badgeType} = ${badgeType}`);
    return result.length > 0;
  }
  
  // Gamification - Points
  async getUserPoints(userId: string): Promise<UserPoints | undefined> {
    const result = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId));
    return result[0];
  }
  
  async createUserPoints(points: InsertUserPoints): Promise<UserPoints> {
    const result = await db.insert(userPoints).values(points).returning();
    return result[0];
  }
  
  async addPoints(
    userId: string, 
    activityType: string, 
    pointsEarned: number, 
    description?: string
  ): Promise<UserPoints> {
    return await db.transaction(async (tx) => {
      await tx.insert(pointsHistory).values({
        userId,
        activityType,
        pointsEarned,
        description: description || null,
      });
      
      let points = await tx
        .select()
        .from(userPoints)
        .where(eq(userPoints.userId, userId))
        .then(r => r[0]);
      
      if (!points) {
        const created = await tx.insert(userPoints).values({ userId }).returning();
        points = created[0];
      }
      
      const newTotalPoints = points.totalPoints + pointsEarned;
      const newPointsThisMonth = points.pointsThisMonth + pointsEarned;
      
      let newLevel = points.level;
      let newNextLevelPoints = points.nextLevelPoints;
      
      if (newTotalPoints >= points.nextLevelPoints) {
        newLevel = points.level + 1;
        newNextLevelPoints = newLevel * 100;
      }
      
      const result = await tx
        .update(userPoints)
        .set({
          totalPoints: newTotalPoints,
          pointsThisMonth: newPointsThisMonth,
          level: newLevel,
          nextLevelPoints: newNextLevelPoints,
          updatedAt: sql`NOW()`,
        })
        .where(eq(userPoints.userId, userId))
        .returning();
      
      return result[0];
    });
  }
  
  async getPointsHistory(userId: string, limit = 50): Promise<PointsHistory[]> {
    return await db
      .select()
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId))
      .orderBy(sql`${pointsHistory.createdAt} DESC`)
      .limit(limit);
  }
  
  // Gamification - Challenges
  async getActiveChallenges(month: string): Promise<MonthlyChallenge[]> {
    return await db
      .select()
      .from(monthlyChallenges)
      .where(sql`${monthlyChallenges.month} = ${month} AND ${monthlyChallenges.isActive} = true`)
      .orderBy(sql`${monthlyChallenges.displayOrder} ASC`);
  }
  
  async createChallenge(challenge: InsertMonthlyChallenge): Promise<MonthlyChallenge> {
    const result = await db.insert(monthlyChallenges).values(challenge).returning();
    return result[0];
  }
  
  async getUserChallengeProgress(
    userId: string, 
    challengeId: string
  ): Promise<UserChallenge | undefined> {
    const result = await db
      .select()
      .from(userChallenges)
      .where(sql`${userChallenges.userId} = ${userId} AND ${userChallenges.challengeId} = ${challengeId}`);
    return result[0];
  }
  
  async updateChallengeProgress(
    userId: string, 
    challengeId: string, 
    progress: number
  ): Promise<UserChallenge> {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(userChallenges)
        .where(sql`${userChallenges.userId} = ${userId} AND ${userChallenges.challengeId} = ${challengeId}`)
        .then(r => r[0]);
      
      const challenge = await tx
        .select()
        .from(monthlyChallenges)
        .where(eq(monthlyChallenges.id, challengeId))
        .then(r => r[0]);
      
      const isCompleted = challenge?.goal ? progress >= challenge.goal : false;
      
      if (existing) {
        const result = await tx
          .update(userChallenges)
          .set({
            progress,
            completed: isCompleted,
            completedAt: isCompleted ? sql`NOW()` : null,
          })
          .where(sql`${userChallenges.userId} = ${userId} AND ${userChallenges.challengeId} = ${challengeId}`)
          .returning();
        
        return result[0];
      } else {
        const result = await tx
          .insert(userChallenges)
          .values({
            userId,
            challengeId,
            progress,
            completed: isCompleted,
            completedAt: isCompleted ? sql`NOW()` : null,
          })
          .returning();
        
        return result[0];
      }
    });
  }
  
  async getUserChallenges(
    userId: string
  ): Promise<Array<UserChallenge & { challenge: MonthlyChallenge }>> {
    const result = await db
      .select({
        userChallenge: userChallenges,
        challenge: monthlyChallenges,
      })
      .from(userChallenges)
      .innerJoin(monthlyChallenges, eq(userChallenges.challengeId, monthlyChallenges.id))
      .where(eq(userChallenges.userId, userId))
      .orderBy(sql`${monthlyChallenges.displayOrder} ASC`);
    
    return result.map(r => ({ ...r.userChallenge, challenge: r.challenge }));
  }
  
  // Gamification - Impact Stories
  async getImpactStories(filters: { 
    organizationId?: string; 
    conflictId?: string; 
    featured?: boolean; 
    limit?: number 
  } = {}): Promise<ImpactStory[]> {
    const { organizationId, conflictId, featured, limit = 20 } = filters;
    
    let query = db.select().from(impactStories);
    
    const conditions = [];
    if (organizationId) {
      conditions.push(sql`${impactStories.organizationId} = ${organizationId}`);
    }
    if (conflictId) {
      conditions.push(sql`${impactStories.conflictId} = ${conflictId}`);
    }
    if (featured !== undefined) {
      conditions.push(sql`${impactStories.isFeatured} = ${featured}`);
    }
    
    if (conditions.length > 0) {
      query = query.where(sql.join(conditions, sql` AND `)) as any;
    }
    
    return await query
      .orderBy(sql`${impactStories.publishedAt} DESC`)
      .limit(limit);
  }
  
  async createImpactStory(story: InsertImpactStory): Promise<ImpactStory> {
    const result = await db.insert(impactStories).values(story).returning();
    return result[0];
  }

  // Verification operations
  async createOrganizationReport(report: InsertOrganizationReport): Promise<void> {
    await db.insert(organizationReports).values(report);
  }

  async getPendingVerifications(): Promise<Organization[]> {
    const result = await db
      .select()
      .from(organizations)
      .where(sql`${organizations.verificationStatus} IN ('pending', 'in_review', 'needs_info')`)
      .orderBy(sql`${organizations.createdAt} ASC`);
    
    return result;
  }

  async approveOrganization(
    id: string, 
    data: { verificationLevel: number; verifiedBy: string; notes?: string }
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Update organization
      await tx
        .update(organizations)
        .set({
          verificationStatus: 'verified',
          verificationLevel: data.verificationLevel,
          lastVerified: sql`NOW()`,
          verifiedBy: data.verifiedBy,
        })
        .where(eq(organizations.id, id));
      
      // Log action
      await tx.insert(verificationHistory).values({
        organizationId: id,
        action: 'approved',
        newStatus: 'verified',
        performedBy: data.verifiedBy,
        notes: data.notes || null,
      });
    });
  }

  async rejectOrganization(
    id: string, 
    data: { reason: string; rejectedBy: string; notes?: string }
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Update organization
      await tx
        .update(organizations)
        .set({
          verificationStatus: 'rejected',
          verificationData: sql`jsonb_set(
            COALESCE(${organizations.verificationData}, '{}'::jsonb),
            '{rejection_reason}',
            ${JSON.stringify(data.reason)}::jsonb
          )`,
        })
        .where(eq(organizations.id, id));
      
      // Log action
      await tx.insert(verificationHistory).values({
        organizationId: id,
        action: 'rejected',
        newStatus: 'rejected',
        performedBy: data.rejectedBy,
        notes: data.notes || null,
      });
    });
  }

  async requestOrganizationInfo(
    id: string, 
    data: { requestedItems: string[]; requestedBy: string; notes?: string }
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Update organization
      await tx
        .update(organizations)
        .set({
          verificationStatus: 'needs_info',
          verificationData: sql`jsonb_set(
            COALESCE(${organizations.verificationData}, '{}'::jsonb),
            '{requested_items}',
            ${JSON.stringify(data.requestedItems)}::jsonb
          )`,
        })
        .where(eq(organizations.id, id));
      
      // Log action
      await tx.insert(verificationHistory).values({
        organizationId: id,
        action: 'info_requested',
        newStatus: 'needs_info',
        performedBy: data.requestedBy,
        notes: data.notes || null,
      });
    });
  }

  // Nonprofit cache operations
  async getCharitywatchCache(country: string): Promise<typeof charitywatchCache.$inferSelect | undefined> {
    const result = await db
      .select()
      .from(charitywatchCache)
      .where(eq(charitywatchCache.country, country))
      .orderBy(sql`${charitywatchCache.cachedAt} DESC`)
      .limit(1);
    
    return result[0];
  }

  async cacheCharitywatchData(country: string, nonprofits: any[], expiresAt: Date): Promise<void> {
    await db.insert(charitywatchCache).values({
      country,
      nonprofits: nonprofits as any,
      expiresAt,
    });
  }

  // External donation tracking
  async trackExternalDonation(data: {
    userId: string;
    conflictId?: string;
    conflictCountry: string;
    nonprofitName: string;
    nonprofitEin?: string;
    donateUrl: string;
  }): Promise<typeof externalDonations.$inferSelect> {
    const result = await db.insert(externalDonations).values({
      userId: data.userId,
      conflictId: data.conflictId || null,
      conflictCountry: data.conflictCountry,
      nonprofitName: data.nonprofitName,
      nonprofitEin: data.nonprofitEin || null,
      donateUrl: data.donateUrl,
      status: 'initiated',
    }).returning();
    
    return result[0];
  }
}

export const storage = new DbStorage();
