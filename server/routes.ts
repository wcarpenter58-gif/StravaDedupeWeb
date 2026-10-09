import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import createMemoryStore from "memorystore";
import { api } from "@shared/routes";
import { z } from "zod";

const MemoryStore = createMemoryStore(session);

// Extend express-session to include userId
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// STRAVA CONFIG
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Session Setup
  app.use(
    session({
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      secret: process.env.SESSION_SECRET || "default_secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: app.get("env") === "production" },
    })
  );

  // --- Auth Routes ---

  app.get("/api/auth/status", async (req, res) => {
    if (req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        return res.json({ 
          isAuthenticated: true, 
          user: { stravaId: user.stravaId, displayName: user.displayName } 
        });
      }
    }
    res.json({ isAuthenticated: false });
  });

  app.get("/api/auth/strava/login", (req, res) => {
    if (!STRAVA_CLIENT_ID) {
      return res.status(500).send("Strava Client ID not configured");
    }
    const scope = "activity:read_all,activity:write";
    // Use the host that initiated OAuth so published and custom domains receive
    // a callback on the same domain instead of the workspace's dev domain.
    const host = req.get("host");
    if (!host) {
      return res.status(400).send("Unable to determine the callback host");
    }
    const redirectUri = `https://${host}/api/auth/strava/callback`;
    
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "force",
      scope: scope,
    });
    res.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`);
  });

  app.get("/api/auth/strava/callback", async (req, res) => {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error) {
      return res.redirect("/?error=" + error);
    }
    if (!code) {
      return res.redirect("/?error=no_code");
    }

    try {
      // Exchange code for token
      const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
        }),
      });

      const data = await tokenResponse.json();

      if (data.errors) {
        console.error("Strava Token Error:", data);
        throw new Error(JSON.stringify(data.errors));
      }

      // Create or Update User
      const stravaAthlete = data.athlete;
      let user = await storage.getUserByStravaId(stravaAthlete.id);

      const userData = {
        stravaId: stravaAthlete.id,
        displayName: `${stravaAthlete.firstname} ${stravaAthlete.lastname}`,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        scope: data.scope,
        expiresAt: data.expires_at,
      };

      if (user) {
        user = await storage.updateUser(user.id, userData);
      } else {
        user = await storage.createUser(userData);
      }

      // Set session
      req.session.userId = user.id;
      
      res.redirect("/");
    } catch (err) {
      console.error("Strava Auth Error:", err);
      res.redirect("/?error=auth_failed");
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    });
  });

  app.delete(api.activities.delete.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const activityId = req.params.id;

    try {
      let accessToken = user.accessToken;

      // Check Token Expiry
      if (user.expiresAt && (Date.now() / 1000) > (user.expiresAt - 60)) {
        console.log("Refreshing token for delete operation...");
        const refreshRes = await fetch("https://www.strava.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: user.refreshToken,
          }),
        });
        const refreshData = await refreshRes.json();
        
        if (refreshData.errors) {
          throw new Error("Failed to refresh token: " + JSON.stringify(refreshData.errors));
        }

        const updatedUser = await storage.updateUser(user.id, {
          accessToken: refreshData.access_token,
          refreshToken: refreshData.refresh_token,
          expiresAt: refreshData.expires_at
        });
        accessToken = updatedUser.accessToken;
      }

      console.log(`Attempting to delete activity ${activityId} with token...`);
      // Delete activity from Strava
      const deleteRes = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json"
        },
      });

      if (!deleteRes.ok) {
        const errData = await deleteRes.json();
        console.error("Strava Delete API Error:", errData);
        
        if (deleteRes.status === 403 || deleteRes.status === 401) {
          return res.status(deleteRes.status).json({ 
            message: `Strava Error: ${errData.message || "Authorization failed"}. Please try logging out and back in to ensure 'activity:write' permission is granted.`,
            details: errData
          });
        }
        throw new Error(`Strava API Error: ${JSON.stringify(errData)}`);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete Endpoint Error:", err);
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  });

  // --- Activity Routes ---

  app.get(api.activities.scan.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    try {
      let accessToken = user.accessToken;

      // 1. Check Token Expiry and Refresh if needed
      if (user.expiresAt && (Date.now() / 1000) > (user.expiresAt - 60)) {
        console.log("Refreshing token...");
        const refreshRes = await fetch("https://www.strava.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: user.refreshToken,
          }),
        });
        
        const refreshData = await refreshRes.json();
        
        if (refreshData.errors) {
             throw new Error("Failed to refresh token: " + JSON.stringify(refreshData.errors));
        }

        const updatedUser = await storage.updateUser(user.id, {
            accessToken: refreshData.access_token,
            refreshToken: refreshData.refresh_token,
            expiresAt: refreshData.expires_at
        });
        accessToken = updatedUser.accessToken;
      }

      // 2. Fetch Activities by Date Range
      const before = req.query.before ? Math.floor(new Date(req.query.before as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const after = req.query.after ? Math.floor(new Date(req.query.after as string).getTime() / 1000) : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000); // Default to last 30 days
      
      let allActivities: any[] = [];
      let page = 1;
      const perPage = 200;
      let hasMore = true;

      while (hasMore && allActivities.length < 1000) { // Safety limit
        const activitiesRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?before=${before}&after=${after}&page=${page}&per_page=${perPage}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        if (!activitiesRes.ok) {
           const errText = await activitiesRes.text();
           throw new Error(`Failed to fetch activities: ${activitiesRes.status} ${errText}`);
        }

        const pageActivities: any[] = await activitiesRes.json();
        allActivities = [...allActivities, ...pageActivities];
        
        if (pageActivities.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // 3. Duplicate Detection Logic
      const groups: { startTime: string; activities: any[]; durationDifference: number }[] = [];
      const processedIds = new Set<number>();

      // Sort by start time (ascending)
      allActivities.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      // Use a 15-minute tolerance for start time.
      const TOLERANCE_MS = 15 * 60 * 1000; 

      for (let i = 0; i < allActivities.length; i++) {
        const actA = allActivities[i];
        if (processedIds.has(actA.id)) continue;

        const timeA = new Date(actA.start_date).getTime();
        const currentGroup = [actA];

        for (let j = i + 1; j < allActivities.length; j++) {
            const actB = allActivities[j];
            if (processedIds.has(actB.id)) continue;

            const timeB = new Date(actB.start_date).getTime();
            
            if (Math.abs(timeB - timeA) < TOLERANCE_MS) {
                currentGroup.push(actB);
                processedIds.add(actB.id);
            } else if (timeB - timeA > TOLERANCE_MS) {
                break;
            }
        }

        if (currentGroup.length > 1) {
             processedIds.add(actA.id);
             groups.push({
                 startTime: actA.start_date,
                 activities: currentGroup,
                 durationDifference: 0 // Placeholder
             });
        }
      }
      
      const duplicatesFound = groups.reduce((acc, group) => acc + group.activities.length, 0);

      res.json({
        scannedCount: allActivities.length,
        duplicatesFound: duplicatesFound,
        groups: groups
      });

    } catch (err: any) {
      console.error("Scan Error:", err);
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  });

  return httpServer;
}
