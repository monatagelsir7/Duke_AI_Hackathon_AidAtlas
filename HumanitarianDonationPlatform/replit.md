# AidAtlas - Humanitarian Donation Platform

## Overview

AidAtlas is a mobile-first humanitarian donation platform that gamifies charitable giving through a swipe-based interface. It connects users with curated conflict profiles and verified organizations, enabling them to track their global impact. The platform uses personalized recommendations and behavioral learning to align donors with humanitarian causes, featuring automated daily conflict scraping from trusted sources and verified real-world crisis data. AidAtlas also facilitates discovery and participation in advocacy campaigns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript (Vite)
- Wouter for client-side routing
- TanStack Query for server state management
- Tailwind CSS with a custom design system
- shadcn/ui component library (Radix UI primitives)

**Design System:**
- Typography: Inter (UI/body) and Fraunces (display/headlines)
- Custom color system with HSL variables for light/dark mode
- Consistent spacing, mobile-first responsive design

**State Management:**
- React Query for server state
- Context API for authentication state
- Local component state for UI interactions

**Key Architectural Decisions:**
- Component-based architecture
- Separation of concerns
- Custom hooks for authentication and notifications
- Path aliases for source organization

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js
- TypeScript with ES modules
- Drizzle ORM for database interactions
- bcrypt for password hashing
- express-session for session management

**API Design:**
- RESTful endpoints
- Session-based authentication with cookie-based management
- Middleware pattern for authentication
- Centralized storage abstraction layer

**Personalization Engine:**
- Tracks user swipe behavior (up/pass/down) and time spent
- Updates preference vectors for geographic regions, causes, and demographics
- Calculates engagement weight for behavioral learning

**Key Architectural Decisions:**
- Storage abstraction for database flexibility
- In-memory session storage (production should use PostgreSQL)
- Combines explicit user preferences with implicit behavioral learning
- Seed data for initial database population

### Data Storage

**Database:** PostgreSQL via Neon serverless driver

**ORM:** Drizzle ORM with a schema-first approach

**Schema Design:**
- **Core Tables:** `users`, `conflicts`, `organizations`, `donations`, `userEvents`, `userPreferenceVectors`
- **Content Pipeline Tables:** `contentSources`, `scrapedContent`, `conflictApprovals`

**Data Modeling Decisions:**
- JSONB for flexible storage of preferences and dynamic data
- UUID primary keys
- Timestamp tracking for audit trails
- Cascading deletes for related data
- Separation of explicit and learned user preferences

## External Dependencies

**Database:**
- **Neon Serverless PostgreSQL** - Cloud-hosted database.

**UI Component Library:**
- **shadcn/ui** - Built on Radix UI primitives for accessibility.

**Typography:**
- **Google Fonts API** - Inter and Fraunces font families.

**Authentication:**
- **express-session** - Cookie-based sessions.
- **bcrypt** - Password hashing.
- **connect-pg-simple** - PostgreSQL session store (planned).

**Build Tools:**
- **Vite** - Frontend build tool.
- **esbuild** - Backend bundling.
- **tsx** - TypeScript execution.

**Development Tools:**
- **Drizzle Kit** - Database migrations.

**Content Pipeline:**
- **ReliefWeb Scraper** - Fetches humanitarian reports from UN OCHA API.
- **OpenAI Service** - Generates conflict profiles using GPT-4.
- **Quality Control System** - Bias detection, sentiment analysis, fact-checking for content.

**AI Content Generation:**
- OpenAI GPT-4o-mini for AI-powered nonprofit research.

**3D Visualization:**
- **react-globe.gl** - Interactive 3D globe using WebGL and Three.js
- **i18n-iso-countries** - Country name standardization
- **world-atlas** - Geographic topology data
- **topojson-client** - Topology data processing

**Environment Variables:**
- `DATABASE_URL`
- `SESSION_SECRET`
- `NODE_ENV`
- `OPENAI_API_KEY`

## Features

### Interactive 3D Globe Visualization

The Impact page includes an interactive 3D globe that visualizes **global community impact** - showing ALL donation flows from ALL users across the platform:

**Architecture:**
- **DonationGlobe component**: Renders animated arcs showing donation flows between countries
- **WebGL Detection**: Proactive capability check with graceful fallback for unsupported environments
- **ErrorBoundary**: Defense-in-depth error handling for WebGL initialization failures
- **Country Mapping**: Converts country names to geographic coordinates for visualization

**Data Flow:**
1. Backend API endpoint `/api/donations/geography` provides ALL donation flow data (not user-specific)
2. Component maps donor and recipient countries to coordinates
3. Globe renders animated green arcs from donor to recipient locations
4. Auto-rotating Earth with night texture for visual appeal

**Graceful Degradation:**
- Proactive WebGL capability check (isWebGLAvailable utility)
- Shows informative fallback message in non-WebGL environments
- Maintains full Impact page functionality without globe support

**Database Integration:**
- `donations.donorCountry` field tracks donation origin (defaults to "United States")
- Geography data includes: fromCountry, toCountry, amount, createdAt
- 50 seeded global donations from 15 donor countries to 31 conflict regions for demo