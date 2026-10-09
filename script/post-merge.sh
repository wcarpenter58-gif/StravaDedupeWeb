#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Reconcile dependencies with the merged lockfile without changing versions.
npm ci --no-audit --no-fund
npm run check
npm run build

# Replit handles workflow reconciliation after this script finishes.
# Do not launch servers or apply database schema changes automatically.
