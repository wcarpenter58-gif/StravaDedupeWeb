import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We primarily use the session ID to track the user's Strava tokens temporarily 
// or persist them if we want to allow background processing later.
// For now, let's persist them so the user doesn't have to re-login constantly.

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  stravaId: integer("strava_id").unique(),
  displayName: text("display_name"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  scope: text("scope"),
  expiresAt: integer("expires_at"), // Unix timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Types for Strava Data (not stored in DB, but used in API)
export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  device_name?: string; // Sometimes available
  external_id?: string;
  map?: {
    summary_polyline: string;
  };
}

// A group of duplicate activities
export interface DuplicateGroup {
  startTime: string; // ISO string of the start time they share
  activities: StravaActivity[];
  durationDifference: number; // Max difference in duration between them (seconds)
}

export type ScanResult = {
  scannedCount: number;
  duplicatesFound: number;
  groups: DuplicateGroup[];
};
