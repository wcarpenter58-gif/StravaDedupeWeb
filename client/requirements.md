## Packages
date-fns | Formatting dates and durations for activity display
framer-motion | Smooth animations for scanning states and list entry
lucide-react | Icons for activities (Run, Ride, Swim) and UI elements

## Notes
- Authentication is handled via backend redirect to Strava OAuth
- `GET /api/auth/status` checks current session
- `GET /api/activities/scan` can take time, needs loading state
- Primary color is Strava Orange (#fc4c02)
