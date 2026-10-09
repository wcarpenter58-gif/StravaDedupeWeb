# Strava Dupe Finder on Cloudflare

Database ID is already configured. Tables were created in the Cloudflare console; do not import old tokens.

1. In this folder run `npm install`, then `npm run build`.
2. Run `npx wrangler login` if needed, then `npm run deploy`.
3. Set credentials using `npx wrangler secret put STRAVA_CLIENT_ID` and `npx wrangler secret put STRAVA_CLIENT_SECRET`. Each command prompts privately for its value. Do not put values in source files or GitHub. SESSION_SECRET and DATABASE_URL are not used by this Worker.
4. Once deployment confirms the URL, set the Strava API application's Authorization Callback Domain to the exact Worker hostname, without https or a path. For the current account this is expected to be strava-dupe-finder.wcarpenter58.workers.dev, but confirm the actual deployed URL first. Strava settings: https://www.strava.com/settings/api . Changing the domain affects new logins on the old Replit URL.
5. Open the deployed app, authorize Strava with both activity permissions, and scan a short date range. Refresh to confirm login persists. Test logout and sign-in again. Do not delete a genuine activity just to test deployment.

The Worker preserves the original 15-minute start-time grouping and 1,000 activity scan limit. Matches are candidates, not proof of duplicates. Existing UI confirmation remains necessary before deleting an activity.

Security changes: OAuth state cookie validation, required scopes, opaque random sessions stored as hashes in D1, seven-day session expiry, Secure/HttpOnly/SameSite cookies, same-origin checks on mutations, parameterized SQL, and errors that do not display tokens. Strava tokens are stored server-side in D1 and refreshed as needed. No tokens are sent to the frontend.

The original Express files are retained for reference but are not the deployed server. worker/index.js is the active backend. The existing React interface remains unchanged.

Validation: Worker syntax and mocked login state, authorization, origin protection, and grouping checks passed. Full frontend build and live Strava authorization remain to be verified on your Mac/deployment. Dependencies could not be downloaded in the preparation environment.

GitHub: commit source, package.json, package-lock.json, wrangler.jsonc and worker/. .gitignore excludes local secrets, node_modules and build output. Connect the existing Worker to the repository with build command npm run build and deploy command npx wrangler deploy. No database setup is run during deployment.
