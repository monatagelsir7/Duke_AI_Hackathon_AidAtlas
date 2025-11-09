import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertDonationSchema, insertUserEventSchema, insertOrganizationReportSchema } from "@shared/schema";
import { preferenceEngine } from "./preference-engine";
import { reportGenerator } from "./report-generator";
import { badgeService } from "./badge-service";
import { TrustScoreService } from "./trust-score-service";
import bcrypt from "bcrypt";
import { format } from "date-fns";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const SALT_ROUNDS = 10;

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Admin authorization middleware
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Forbidden - Admin access required" });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      console.log("📝 SIGNUP REQUEST - Step 1: Received signup request");
      const { name, email, password } = req.body;
      console.log("📝 SIGNUP REQUEST - Data:", { name, email, passwordLength: password?.length });
      
      if (!name || !email || !password) {
        console.log("❌ SIGNUP FAILED - Missing required fields");
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      console.log("📝 SIGNUP REQUEST - Step 2: Checking if user exists...");
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("❌ SIGNUP FAILED - User already exists with email:", email);
        return res.status(400).json({ error: "User already exists" });
      }
      console.log("✅ SIGNUP REQUEST - User does not exist, proceeding...");
      
      console.log("📝 SIGNUP REQUEST - Step 3: Creating user with hashed password...");
      // Create user with hashed password
      const user = await storage.createUser({
        name,
        email,
        preferences: {
          causes: [],
          regions: [],
          donationRange: "any",
        }
      }, password);
      console.log("✅ SIGNUP SUCCESS - User created with ID:", user.id);

      console.log("📝 SIGNUP REQUEST - Step 4: Setting session...");
      req.session.userId = user.id;
      console.log("✅ SIGNUP SUCCESS - Session set, user ID:", user.id);
      
      console.log("✅ SIGNUP COMPLETE - Returning user data");
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
      });
    } catch (error) {
      console.error("❌❌❌ SIGNUP ERROR - Full error:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("❌ Error message:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("🔐 LOGIN REQUEST - Step 1: Received login request");
      const { email, password } = req.body;
      console.log("🔐 LOGIN REQUEST - Data:", { email, passwordLength: password?.length });
      
      if (!email || !password) {
        console.log("❌ LOGIN FAILED - Missing required fields");
        return res.status(400).json({ error: "Email and password are required" });
      }

      console.log("🔐 LOGIN REQUEST - Step 2: Verifying password...");
      const user = await storage.verifyPassword(email, password);
      if (!user) {
        console.log("❌ LOGIN FAILED - Invalid credentials for email:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      console.log("✅ LOGIN REQUEST - Password verified for user:", user.id);
      
      console.log("🔐 LOGIN REQUEST - Step 3: Setting session...");
      req.session.userId = user.id;
      console.log("✅ LOGIN SUCCESS - Session set, user ID:", user.id);
      
      console.log("✅ LOGIN COMPLETE - Returning user data");
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        preferences: user.preferences,
      });
    } catch (error) {
      console.error("❌❌❌ LOGIN ERROR - Full error:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("❌ Error message:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        preferences: user.preferences,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User routes
  app.patch("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const { preferences } = req.body;
      const user = await storage.updateUser(req.session.userId!, { 
        preferences,
        onboardingCompleted: true
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Conflict routes
  app.get("/api/conflicts", async (req, res) => {
    try {
      const { region } = req.query;
      
      let conflicts;
      if (region && typeof region === "string") {
        conflicts = await storage.getConflictsByRegion(region);
      } else {
        conflicts = await storage.getConflicts();
      }

      res.json(conflicts);
    } catch (error) {
      console.error("Get conflicts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Personalized recommendations
  app.get("/api/conflicts/personalized", requireAuth, async (req, res) => {
    try {
      const personalizedFeed = await preferenceEngine.generatePersonalizedFeed(req.session.userId!);
      res.json(personalizedFeed);
    } catch (error) {
      console.error("Get personalized conflicts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/conflicts/:id", async (req, res) => {
    try {
      const conflict = await storage.getConflict(req.params.id);
      if (!conflict) {
        return res.status(404).json({ error: "Conflict not found" });
      }

      res.json(conflict);
    } catch (error) {
      console.error("Get conflict error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Organization routes
  app.get("/api/organizations", async (req, res) => {
    try {
      const { conflictId } = req.query;
      
      let organizations;
      if (conflictId && typeof conflictId === "string") {
        organizations = await storage.getOrganizationsByConflict(conflictId);
      } else {
        organizations = await storage.getOrganizations();
      }

      res.json(organizations);
    } catch (error) {
      console.error("Get organizations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Donation routes
  app.get("/api/donations", requireAuth, async (req, res) => {
    try {
      const donations = await storage.getDonations(req.session.userId!);
      res.json(donations);
    } catch (error) {
      console.error("Get donations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get ALL donations from ALL users for global impact visualization
  // Requires authentication to protect user privacy
  app.get("/api/donations/geography", requireAuth, async (req, res) => {
    try {
      const donationGeography = await storage.getAllDonationGeography();
      res.json(donationGeography);
    } catch (error) {
      console.error("Get donation geography error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/donations", requireAuth, async (req, res) => {
    try {
      // Validate request body with Zod schema
      const validationResult = insertDonationSchema.safeParse({
        ...req.body,
        userId: req.session.userId!,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid donation data", 
          details: validationResult.error.errors 
        });
      }

      const donation = await storage.createDonation(validationResult.data);

      res.json(donation);
    } catch (error) {
      console.error("Create donation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/impact", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserImpactStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      console.error("Get impact stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Behavioral tracking routes
  app.post("/api/events/track", requireAuth, async (req, res) => {
    try {
      const validationResult = insertUserEventSchema.safeParse({
        ...req.body,
        userId: req.session.userId!,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid event data", 
          details: validationResult.error.errors 
        });
      }

      const event = await storage.createUserEvent(validationResult.data);

      // Update preference vector if this is a swipe event
      if (event.eventType.startsWith('swipe_') && event.conflictId) {
        const conflict = await storage.getConflict(event.conflictId);
        if (conflict) {
          const swipeDirection = event.eventType.replace('swipe_', '') as 'up' | 'pass' | 'down';
          const timeSpent = event.eventData?.timeSpent || 0;
          
          await preferenceEngine.updatePreferencesFromSwipe(
            req.session.userId!,
            conflict,
            swipeDirection,
            timeSpent
          );
        }
      }

      res.json(event);
    } catch (error) {
      console.error("Track event error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const events = await storage.getUserEvents(req.session.userId!, limit);
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Preference vector routes
  app.get("/api/user/preference-vector", requireAuth, async (req, res) => {
    try {
      let vector = await storage.getUserPreferenceVector(req.session.userId!);
      
      // Create if doesn't exist
      if (!vector) {
        vector = await storage.createUserPreferenceVector({
          userId: req.session.userId!,
          geoPreferences: {},
          causePreferences: {},
          demographicPreferences: {},
          urgencyPreference: '0.5',
          interactionCount: 0,
        });
      }

      res.json(vector);
    } catch (error) {
      console.error("Get preference vector error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/user/preference-vector", requireAuth, async (req, res) => {
    try {
      const { geoPreferences, causePreferences, demographicPreferences, urgencyPreference, interactionCount } = req.body;
      
      const vector = await storage.updateUserPreferenceVector(req.session.userId!, {
        geoPreferences,
        causePreferences,
        demographicPreferences,
        urgencyPreference,
        interactionCount,
      });

      if (!vector) {
        return res.status(404).json({ error: "Preference vector not found" });
      }

      res.json(vector);
    } catch (error) {
      console.error("Update preference vector error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Content source management routes (admin only - for now public)
  app.get("/api/content-sources", async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const sources = await storage.getContentSources(activeOnly);
      res.json(sources);
    } catch (error) {
      console.error("Get content sources error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin approval queue routes (for future admin dashboard)
  app.get("/api/admin/approvals/pending", requireAdmin, async (req, res) => {
    try {
      const approvals = await storage.getPendingApprovals();
      res.json(approvals);
    } catch (error) {
      console.error("Get pending approvals error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/approvals/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { notes } = req.body;
      const approval = await storage.approveConflict(
        req.params.id,
        req.session.userId!,
        notes
      );

      if (!approval) {
        return res.status(404).json({ error: "Approval not found" });
      }

      res.json(approval);
    } catch (error) {
      console.error("Approve conflict error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/approvals/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { notes } = req.body;
      const approval = await storage.rejectConflict(
        req.params.id,
        req.session.userId!,
        notes
      );

      if (!approval) {
        return res.status(404).json({ error: "Approval not found" });
      }

      res.json(approval);
    } catch (error) {
      console.error("Reject conflict error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Content Pipeline Routes (Admin Only)
  app.post("/api/pipeline/scrape", requireAdmin, async (req, res) => {
    try {
      const { ReliefWebScraper } = await import("./reliefweb-scraper");
      const scraper = new ReliefWebScraper();
      const { daysBack = 7 } = req.body;

      const conflicts = await scraper.scrape(daysBack);
      
      // Store scraped content in database
      const storedCount = await storage.storeScrapedContent(conflicts);

      res.json({
        success: true,
        countriesScraped: conflicts.size,
        reportsStored: storedCount,
        message: `Scraped ${conflicts.size} countries, stored ${storedCount} reports`,
      });
    } catch (error) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: "Failed to scrape content" });
    }
  });

  app.post("/api/pipeline/process", requireAdmin, async (req, res) => {
    try {
      const { limit = 10 } = req.body;
      
      // Process unprocessed scraped content with LLM
      const processed = await storage.processScrapedContent(limit);

      res.json({
        success: true,
        processedCount: processed,
        message: `Processed ${processed} conflict profiles`,
      });
    } catch (error) {
      console.error("Process error:", error);
      res.status(500).json({ error: "Failed to process content" });
    }
  });

  app.post("/api/pipeline/run", requireAdmin, async (req, res) => {
    try {
      const { daysBack = 7, processLimit = 10 } = req.body;
      
      // Check if OpenAI API key is configured
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.status(400).json({ 
          error: "OpenAI API key not configured",
          message: "Please add OPENAI_API_KEY to your environment variables to enable AI content generation"
        });
      }
      
      // Step 1: Scrape
      console.log("[Pipeline] Starting scrape...");
      const { ReliefWebScraper } = await import("./reliefweb-scraper");
      const scraper = new ReliefWebScraper();
      const conflicts = await scraper.scrape(daysBack);
      const storedCount = await storage.storeScrapedContent(conflicts);

      console.log(`[Pipeline] Scraped ${conflicts.size} countries, stored ${storedCount} reports`);

      // Step 2: Process with AI pipeline
      console.log("[Pipeline] Starting AI processing...");
      const { ContentPipeline } = await import("./content-pipeline");
      const pipeline = new ContentPipeline(storage, {
        openaiApiKey,
        enableQualityControl: true,
        minArticlesRequired: 2, // Require at least 2 articles per country
      });

      // Prepare country data for processing
      const countriesToProcess: Array<{
        country: string;
        region: string;
        articles: Array<{
          title: string;
          body: string;
          source: string;
          url?: string;
          date?: string;
        }>;
      }> = [];

      // Helper to determine region from country name
      const determineRegion = (countryName: string): string => {
        const lowerName = countryName.toLowerCase();
        if (lowerName.includes('syria') || lowerName.includes('yemen') || lowerName.includes('iraq') || lowerName.includes('lebanon')) {
          return 'Middle East';
        }
        if (lowerName.includes('somalia') || lowerName.includes('ethiopia') || lowerName.includes('kenya') || lowerName.includes('sudan')) {
          return 'East Africa';
        }
        if (lowerName.includes('ukraine') || lowerName.includes('poland') || lowerName.includes('belarus')) {
          return 'Eastern Europe';
        }
        if (lowerName.includes('afghanistan') || lowerName.includes('pakistan')) {
          return 'South Asia';
        }
        if (lowerName.includes('nigeria') || lowerName.includes('cameroon') || lowerName.includes('mali')) {
          return 'West Africa';
        }
        if (lowerName.includes('haiti') || lowerName.includes('venezuela')) {
          return 'Caribbean & Latin America';
        }
        return 'Other';
      };

      for (const [country, reports] of Array.from(conflicts.entries())) {
        if (countriesToProcess.length >= processLimit) break;

        countriesToProcess.push({
          country: reports.countryName,
          region: determineRegion(reports.countryName),
          articles: reports.reports.map((r: any) => ({
            title: r.title,
            body: r.body,
            source: r.source || 'UN OCHA ReliefWeb',
            url: r.url,
            date: r.date,
          })),
        });
      }

      // Process batch
      const results = await pipeline.processBatch(countriesToProcess);
      
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      res.json({
        success: true,
        scraped: {
          countriesScraped: conflicts.size,
          reportsStored: storedCount,
        },
        processed: {
          total: results.length,
          successful: successCount,
          failed: failedCount,
          results: results.map(r => ({
            country: r.country,
            success: r.success,
            conflictId: r.conflictId,
            qualityScore: r.qualityScore,
            errors: r.errors,
            warnings: r.warnings,
          })),
        },
        message: `Pipeline complete: scraped ${conflicts.size} countries, processed ${successCount}/${results.length} profiles successfully`,
      });
    } catch (error) {
      console.error("Pipeline error:", error);
      res.status(500).json({ 
        error: "Failed to run pipeline",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== ACTIONS ROUTES =====
  
  // Get actions with filters
  app.get("/api/actions", async (req, res) => {
    try {
      const { type, status, conflictId, limit } = req.query;
      
      const actions = await storage.getActions({
        type: type as string,
        status: status as string,
        conflictId: conflictId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(actions);
    } catch (error) {
      console.error("Get actions error:", error);
      res.status(500).json({ error: "Failed to retrieve actions" });
    }
  });

  // Get recommended actions for user
  app.get("/api/actions/recommended", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      // Get user preferences and preference vector
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const preferenceVector = await storage.getUserPreferenceVector(userId);
      
      // Get all active actions
      const allActions = await storage.getActions({ status: 'active' });
      
      // Score and rank actions using the action matcher
      const { actionMatcher } = await import('./action-matcher');
      const userPreferences = {
        regions: user.preferences?.regions || [],
        causes: user.preferences?.causes || [],
        demographics: user.preferences?.affectedGroups || [],
        location: user.preferences?.location,
      };
      
      const scoredActions = actionMatcher.rankActions(
        allActions,
        userPreferences,
        preferenceVector || undefined
      );
      
      // Return top matches with scores and reasons
      const recommended = scoredActions.slice(0, limit).map(item => ({
        ...item.action,
        matchScore: item.score,
        matchReasons: item.reasons,
      }));
      
      res.json(recommended);
    } catch (error) {
      console.error("Get recommended actions error:", error);
      res.status(500).json({ error: "Failed to retrieve recommended actions" });
    }
  });

  // Get actions by location
  app.get("/api/actions/location", async (req, res) => {
    try {
      const { latitude, longitude, radius, limit } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }
      
      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const radiusMiles = radius ? parseFloat(radius as string) : 50;
      const limitNum = limit ? parseInt(limit as string) : 20;
      
      const actions = await storage.getActionsByLocation(lat, lon, radiusMiles, limitNum);
      
      res.json(actions);
    } catch (error) {
      console.error("Get actions by location error:", error);
      res.status(500).json({ error: "Failed to retrieve actions by location" });
    }
  });

  // Get user's participated actions
  app.get("/api/actions/user/participated", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const actions = await storage.getUserParticipatedActions(userId, limit);
      
      res.json(actions);
    } catch (error) {
      console.error("Get participated actions error:", error);
      res.status(500).json({ error: "Failed to retrieve participated actions" });
    }
  });

  // Get single action
  app.get("/api/actions/:id", async (req, res) => {
    try {
      const action = await storage.getAction(req.params.id);
      
      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }
      
      res.json(action);
    } catch (error) {
      console.error("Get action error:", error);
      res.status(500).json({ error: "Failed to retrieve action" });
    }
  });

  // Create action (admin only)
  app.post("/api/actions", requireAdmin, async (req, res) => {
    try {
      const action = await storage.createAction(req.body);
      res.json(action);
    } catch (error) {
      console.error("Create action error:", error);
      res.status(500).json({ error: "Failed to create action" });
    }
  });

  // Update action
  app.put("/api/actions/:id", requireAdmin, async (req, res) => {
    try {
      const action = await storage.updateAction(req.params.id, req.body);
      
      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }
      
      res.json(action);
    } catch (error) {
      console.error("Update action error:", error);
      res.status(500).json({ error: "Failed to update action" });
    }
  });

  // Participate in action
  app.post("/api/actions/:actionId/participate", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { actionId } = req.params;
      const { participationType, personalMessage } = req.body;
      
      // Check if action exists
      const action = await storage.getAction(actionId);
      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }
      
      // Check if already participating
      const existing = await storage.getUserActionParticipation(userId, actionId);
      if (existing) {
        return res.status(400).json({ 
          error: "Already participating in this action",
          participation: existing 
        });
      }
      
      // Create participation
      const participation = await storage.createUserActionParticipation({
        userId,
        actionId,
        participationType: participationType || 'interested',
        personalMessage: personalMessage || null,
        status: 'pending',
      });
      
      res.json(participation);
    } catch (error) {
      console.error("Participate in action error:", error);
      res.status(500).json({ error: "Failed to participate in action" });
    }
  });

  // Update participation status
  app.put("/api/actions/participation/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      
      // Verify user owns this participation
      const existing = await storage.getUserActionParticipation(userId, id);
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const participation = await storage.updateUserActionParticipation(id, req.body);
      
      if (!participation) {
        return res.status(404).json({ error: "Participation not found" });
      }
      
      res.json(participation);
    } catch (error) {
      console.error("Update participation error:", error);
      res.status(500).json({ error: "Failed to update participation" });
    }
  });

  // ===== ACTION REMINDERS ROUTES =====
  
  // Get user's reminders
  app.get("/api/actions/reminders", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const reminders = await storage.getUserActionReminders(userId);
      
      res.json(reminders);
    } catch (error) {
      console.error("Get reminders error:", error);
      res.status(500).json({ error: "Failed to retrieve reminders" });
    }
  });

  // Create reminder
  app.post("/api/actions/reminders", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { actionId, reminderTime, reminderType } = req.body;
      
      if (!actionId || !reminderTime) {
        return res.status(400).json({ error: "Action ID and reminder time are required" });
      }
      
      const reminder = await storage.createActionReminder({
        userId,
        actionId,
        reminderTime: new Date(reminderTime),
        reminderType: reminderType || 'push',
        sent: false,
      });
      
      res.json(reminder);
    } catch (error) {
      console.error("Create reminder error:", error);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  // Delete reminder
  app.delete("/api/actions/reminders/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteActionReminder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete reminder error:", error);
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  // ===== ACTION REPORTS ROUTES =====
  
  // Report an action
  app.post("/api/actions/reports", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { actionId, reason, description } = req.body;
      
      if (!actionId || !reason) {
        return res.status(400).json({ error: "Action ID and reason are required" });
      }
      
      const report = await storage.createActionReport({
        actionId,
        reportedBy: userId,
        reason,
        description: description || null,
        status: 'pending',
      });
      
      res.json(report);
    } catch (error) {
      console.error("Create report error:", error);
      res.status(500).json({ error: "Failed to report action" });
    }
  });

  // Get reports (admin only)
  app.get("/api/actions/reports", requireAdmin, async (req, res) => {
    try {
      const actionId = req.query.actionId as string | undefined;
      const reports = await storage.getActionReports(actionId);
      
      res.json(reports);
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ error: "Failed to retrieve reports" });
    }
  });

  // ===== GAMIFICATION ROUTES =====

  // Get monthly impact report
  app.get("/api/reports/:month?", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const month = req.params.month as string | undefined;
      
      const report = await reportGenerator.generateMonthlyReport(userId, month || format(new Date(), 'yyyy-MM'));
      
      // Flatten the report structure for frontend consumption
      if (report && typeof report.reportData === 'object') {
        const data = report.reportData as any;
        res.json({
          userId: report.userId,
          month: report.month,
          totalDonated: data.monthlyTotal || 0,
          donationCount: data.donationCount || 0,
          currentStreak: data.streak?.current || 0,
          momChange: data.momChange || 0,
          topCountries: (data.donationsByCountry || []).map((item: any) => ({
            country: item.country,
            total: item.amount
          })),
          topCauses: (data.donationsByCause || []).map((item: any) => ({
            cause: item.cause,
            total: item.amount
          })),
          newMilestones: (data.newBadges || []).map((badge: any) => badge.name),
        });
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Get report error:", error);
      res.status(500).json({ error: "Failed to retrieve report" });
    }
  });

  // Get user badges
  app.get("/api/badges", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const badges = await storage.getUserBadges(userId);
      res.json(badges);
    } catch (error) {
      console.error("Get badges error:", error);
      res.status(500).json({ error: "Failed to retrieve badges" });
    }
  });

  // Check and award new badges
  app.post("/api/badges/check", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const newBadges = await badgeService.checkAndAwardBadges(userId);
      res.json({ newBadges });
    } catch (error) {
      console.error("Check badges error:", error);
      res.status(500).json({ error: "Failed to check badges" });
    }
  });

  // Get all badge definitions
  app.get("/api/badges/definitions", async (req, res) => {
    try {
      const definitions = badgeService.getAllBadgeDefinitions();
      res.json(definitions);
    } catch (error) {
      console.error("Get badge definitions error:", error);
      res.status(500).json({ error: "Failed to retrieve badge definitions" });
    }
  });

  // Get user points
  app.get("/api/points", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const points = await storage.getUserPoints(userId);
      res.json(points);
    } catch (error) {
      console.error("Get points error:", error);
      res.status(500).json({ error: "Failed to retrieve points" });
    }
  });

  // Get points history
  app.get("/api/points/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getPointsHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Get points history error:", error);
      res.status(500).json({ error: "Failed to retrieve points history" });
    }
  });

  // Get active challenges
  app.get("/api/challenges", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const challenges = await storage.getActiveChallenges(userId);
      res.json(challenges);
    } catch (error) {
      console.error("Get challenges error:", error);
      res.status(500).json({ error: "Failed to retrieve challenges" });
    }
  });

  // Update challenge progress
  app.post("/api/challenges/:id/progress", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const challengeId = req.params.id;
      const { increment } = req.body;
      
      if (!increment || increment <= 0) {
        return res.status(400).json({ error: "Valid increment is required" });
      }
      
      const result = await storage.updateChallengeProgress(userId, challengeId, increment);
      res.json(result);
    } catch (error) {
      console.error("Update challenge progress error:", error);
      res.status(500).json({ error: "Failed to update challenge progress" });
    }
  });

  // Get user impact stats
  app.get("/api/impact/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const stats = await storage.getUserImpactStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Get impact stats error:", error);
      res.status(500).json({ error: "Failed to retrieve impact stats" });
    }
  });

  // ===== VERIFICATION & TRUST SCORE ROUTES =====

  // Get organization trust score
  app.get("/api/organizations/:id/trust-score", async (req, res) => {
    try {
      const { id } = req.params;
      const trustService = new TrustScoreService();
      const score = await trustService.calculateTrustScore(id);
      
      res.json(score);
    } catch (error) {
      console.error("Get trust score error:", error);
      res.status(500).json({ error: "Failed to calculate trust score" });
    }
  });

  // Report an organization
  app.post("/api/organizations/:id/report", requireAuth, async (req, res) => {
    try {
      const { id: organizationId } = req.params;
      const userId = req.session.userId!;
      
      const reportData = insertOrganizationReportSchema.parse({
        organizationId,
        userId,
        ...req.body,
      });
      
      await storage.createOrganizationReport(reportData);
      
      res.json({
        success: true,
        message: "Report submitted successfully",
      });
    } catch (error) {
      console.error("Submit report error:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  // Admin: Get pending verifications
  app.get("/api/admin/verifications/pending", requireAdmin, async (req, res) => {
    try {
      const pending = await storage.getPendingVerifications();
      res.json({ organizations: pending });
    } catch (error) {
      console.error("Get pending verifications error:", error);
      res.status(500).json({ error: "Failed to fetch pending verifications" });
    }
  });

  // Admin: Approve organization
  app.post("/api/admin/organizations/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, verification_level } = req.body;
      const adminId = req.session.userId!;
      
      await storage.approveOrganization(id, {
        verificationLevel: verification_level || 2,
        verifiedBy: adminId,
        notes,
      });
      
      res.json({
        success: true,
        message: "Organization approved",
      });
    } catch (error) {
      console.error("Approve organization error:", error);
      res.status(500).json({ error: "Failed to approve organization" });
    }
  });

  // Admin: Reject organization
  app.post("/api/admin/organizations/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, notes } = req.body;
      const adminId = req.session.userId!;
      
      await storage.rejectOrganization(id, {
        reason,
        rejectedBy: adminId,
        notes,
      });
      
      res.json({
        success: true,
        message: "Organization rejected",
      });
    } catch (error) {
      console.error("Reject organization error:", error);
      res.status(500).json({ error: "Failed to reject organization" });
    }
  });

  // Admin: Request more information
  app.post("/api/admin/organizations/:id/request-info", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { requested_items, notes } = req.body;
      const adminId = req.session.userId!;
      
      await storage.requestOrganizationInfo(id, {
        requestedItems: requested_items,
        requestedBy: adminId,
        notes,
      });
      
      res.json({
        success: true,
        message: "Information request sent",
      });
    } catch (error) {
      console.error("Request info error:", error);
      res.status(500).json({ error: "Failed to request information" });
    }
  });

  // ============================================
  // SUPPORT FEATURE - AI-POWERED NONPROFIT RESEARCH
  // ============================================
  
  app.get("/api/nonprofits/:country", async (req, res) => {
    try {
      const { country } = req.params;
      console.log(`🔍 Nonprofit research request for: ${country}`);

      // Import the AI researcher
      const { NonprofitResearcher } = await import('./nonprofit-researcher');
      const researcher = new NonprofitResearcher();

      // Check cache first
      const cached = await storage.getCharitywatchCache(country);
      if (cached && cached.expiresAt > new Date()) {
        console.log(`✅ Using cached data for ${country}`);
        return res.json({
          country,
          nonprofits: cached.nonprofits,
          cached: true,
          cachedAt: cached.cachedAt,
        });
      }

      // Research nonprofits using AI
      console.log(`🤖 Researching new nonprofit data for ${country}`);
      const nonprofits = await researcher.researchNonprofits(country);

      if (nonprofits.length === 0) {
        return res.status(404).json({
          error: `No nonprofits found for ${country}`,
          message: 'Please try another country or check back later.'
        });
      }

      // Cache for 6 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6);

      await storage.cacheCharitywatchData(country, nonprofits, expiresAt);
      console.log(`✅ Cached ${nonprofits.length} nonprofits for ${country}`);

      res.json({
        country,
        nonprofits,
        cached: false,
        cachedAt: new Date(),
      });
    } catch (error) {
      console.error('Nonprofit research error:', error);
      res.status(500).json({
        error: 'Failed to research nonprofits',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Track external donations
  app.post("/api/donations/external", requireAuth, async (req, res) => {
    try {
      const { conflictId, conflictCountry, nonprofitName, nonprofitEin, donateUrl } = req.body;
      
      const donation = await storage.trackExternalDonation({
        userId: req.session.userId!,
        conflictId,
        conflictCountry,
        nonprofitName,
        nonprofitEin,
        donateUrl,
      });

      console.log(`📊 Tracked external donation: ${nonprofitName} for ${conflictCountry}`);
      
      res.json(donation);
    } catch (error) {
      console.error('Track donation error:', error);
      res.status(500).json({ error: 'Failed to track donation' });
    }
  });

  // ===========================================
  // CHARITYWATCH DIAGNOSTIC API - TEST SCRAPER
  // ===========================================
  
  app.get("/api/test/charitywatch/:country", async (req, res) => {
    try {
      const { country } = req.params;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 DIAGNOSTIC: Testing CharityWatch scraper for ${country}`);
      console.log('='.repeat(60));
      
      // Import scraper
      const { CharityWatchScraper } = await import('./charitywatch-scraper');
      const scraper = new CharityWatchScraper();
      
      // Run scraping with full diagnostics
      const result = await scraper.scrapeNonprofitsForCountry(country);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ DIAGNOSTIC COMPLETE`);
      console.log(`   Found: ${result.nonprofits.length}/3 nonprofits`);
      console.log(`   Logs: ${result.logs.length} entries`);
      console.log(`   Errors: ${result.errors.length} entries`);
      console.log('='.repeat(60) + '\n');
      
      // Return comprehensive diagnostic data
      res.json({
        country,
        success: result.nonprofits.length > 0,
        nonprofits: result.nonprofits.map(n => ({
          name: n.name,
          charityWatchUrl: n.charityWatchUrl,
          rating: n.charityWatchRating,
          programPercent: n.programPercent,
          website: n.website,
          ein: n.ein,
          founded: n.founded,
        })),
        diagnostics: {
          totalLogs: result.logs.length,
          totalErrors: result.errors.length,
          logs: result.logs,
          errors: result.errors,
        },
        summary: {
          nonprofitsFound: result.nonprofits.length,
          targetCount: 3,
          status: result.nonprofits.length >= 3 ? 'SUCCESS' : result.nonprofits.length > 0 ? 'PARTIAL' : 'FAILED',
        }
      });
    } catch (error) {
      console.error('❌ DIAGNOSTIC ERROR:', error);
      res.status(500).json({
        error: 'Diagnostic test failed',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
