import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { seedDatabase } from "./seed";
import { seedGlobalDonations } from "./seed-global-donations";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "aidatlas-dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to false for development on HTTP
    sameSite: 'lax', // Lax works for same-site (Replit serves on same domain)
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  }
}));

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Prevent caching in development mode
if (app.get("env") === "development") {
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seed database on startup (in development)
  if (app.get("env") === "development") {
    try {
      await seedDatabase();
      await seedGlobalDonations();
    } catch (error) {
      log("Database already seeded or error seeding:" + (error instanceof Error ? error.message : String(error)));
    }
  }

  const server = await registerRoutes(app);

  // TEMPORARILY DISABLED: Automated daily scraping for competition demo
  // Re-enable after obtaining ReliefWeb API approval
  // const { AutomatedScraper } = await import("./automated-scraper-cron");
  // const { storage } = await import("./storage");
  // const autoScraper = new AutomatedScraper(storage);
  // autoScraper.startDailyScraping();
  // log("✓ Automated daily scraping enabled (runs at midnight UTC)");
  log("⏸ Automated scraping disabled for competition demo (31 conflicts seeded)");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
