#!/bin/bash
# Production seed script for Fly.io
# Run manually: flyctl ssh console -a digital-banking-backend -C "bash -c 'cd /usr/src/app && npm run db:seed'"

set -e

echo "Running database seeds..."

# Try ts-node first (should work since devDeps are installed)
if command -v npx &> /dev/null; then
  npx ts-node prisma/seed.ts
else
  echo "ts-node not available, attempting direct node execution..."
  node -r ts-node/register prisma/seed.ts || echo "Seeding failed - run manually via flyctl ssh console"
fi

echo "Seeding completed!"

