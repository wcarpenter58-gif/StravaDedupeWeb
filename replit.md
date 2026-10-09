# DeDupe.run

## Overview

DeDupe.run is a web application that helps Strava athletes detect and manage duplicate activities in their Strava feed. When users record activities with multiple devices simultaneously (e.g., a GPS watch and a phone), duplicate entries appear in their Strava feed. This app connects to the Strava API via OAuth, scans the user's activities, identifies duplicates based on matching start times and similar durations, and presents them for review.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state (caching, fetching, mutations)
- **UI Components**: shadcn/ui component library (New York style) built on Radix UI primitives
- **Styling**: Tailwind CSS 4 via its Vite plugin, with the existing TypeScript theme loaded by CSS `@config` and `tw-animate-css` animations. Primary brand color is Strava Orange (`#fc4c02`)
- **Animations**: Framer Motion for smooth transitions and list animations
- **Icons**: Lucide React
- **Date Formatting**: date-fns
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework**: Express 5 on Node.js with TypeScript (run via `tsx`)
- **HTTP Server**: Node's built-in `http.createServer` wrapping Express
- **Session Management**: `express-session` with `memorystore` (in-memory session store with auto-pruning)
- **Authentication**: Strava OAuth flow — backend handles redirect-based OAuth, stores tokens in the database, and tracks user sessions via `req.session.userId`
- **API Design**: RESTful JSON API under `/api/` prefix. Route contracts defined in `shared/routes.ts` using Zod schemas for type safety across client and server.

### Key API Endpoints
- `GET /api/auth/status` — Check if user is authenticated
- `GET /api/auth/strava/login` — Initiate Strava OAuth flow
- `GET /api/auth/strava/callback` — Handle OAuth callback
- `POST /api/auth/logout` — End session
- `GET /api/activities/scan` — Scan user's Strava activities for duplicates (can be slow, needs loading state on frontend)

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Defined in `shared/schema.ts` — currently a single `users` table storing Strava credentials (stravaId, displayName, accessToken, refreshToken, expiresAt)
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not migration files)
- **Connection**: `DATABASE_URL` environment variable required, using `pg` Pool
- **Note**: Strava activity data is NOT stored in the database — it's fetched live from the Strava API during scans

### Shared Code
- `shared/schema.ts` — Database schema and TypeScript types for Strava activities and duplicate groups
- `shared/routes.ts` — API route contracts with Zod validation schemas, shared between client and server

### Build System
- **Development**: `tsx server/index.ts` with Vite dev server middleware for HMR
- **Production Build**: Custom build script (`script/build.ts`) that runs Vite for client and esbuild for server, outputting to `dist/`. Server deps in an allowlist are bundled to reduce cold start times.
- **Production Run**: `node dist/index.cjs`

### Storage Layer
- `server/storage.ts` defines an `IStorage` interface with a `DatabaseStorage` implementation
- Operations: getUser, getUserByStravaId, createUser, updateUser
- The storage singleton is exported and used across route handlers

## External Dependencies

### Strava API
- OAuth 2.0 authentication for user login
- Activity list endpoint for scanning user activities
- Requires `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` environment variables

### PostgreSQL Database
- Required for user persistence (Strava tokens, user profiles)
- Connected via `DATABASE_URL` environment variable
- Uses Drizzle ORM with `drizzle-kit` for schema management

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `STRAVA_CLIENT_ID` — Strava API client ID
- `STRAVA_CLIENT_SECRET` — Strava API client secret
- `SESSION_SECRET` — Express session secret (defaults to "default_secret" if not set)

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal` — Runtime error overlay in development
- `@replit/vite-plugin-cartographer` — Dev tooling (conditionally loaded)
- `@replit/vite-plugin-dev-banner` — Dev banner (conditionally loaded)