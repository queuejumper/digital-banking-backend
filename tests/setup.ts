import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '0';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

// Expect DATABASE_URL to point to a test DB (separate from dev)
if (!process.env.DATABASE_URL) {
  // default to local docker db name digital_bank_test
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/digital_bank_test?schema=public';
}

// Ensure prisma client is generated
execSync('npx prisma generate --schema=./prisma/schema.prisma', { stdio: 'inherit' });

// Ensure schema is up to date before tests - use db push to sync schema
execSync('npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma', { stdio: 'inherit' });

// Truncate tables between tests
const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
    prisma.idempotencyKey.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});


