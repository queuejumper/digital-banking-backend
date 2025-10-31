-- Truncate all tables in the correct order to handle foreign key constraints

-- Option 1: Using CASCADE (recommended - automatically handles dependencies)
TRUNCATE TABLE 
  "Transaction",
  "RefreshToken",
  "Account",
  "User",
  "FXRate",
  "IdempotencyKey",
  "AuditLog"
CASCADE RESTART IDENTITY;

-- Option 2: Manual order (if CASCADE doesn't work or you want more control)
-- Uncomment this block and comment out the CASCADE version above
/*
-- First, truncate tables with foreign keys (children)
TRUNCATE TABLE "Transaction" RESTART IDENTITY;
TRUNCATE TABLE "RefreshToken" RESTART IDENTITY;
TRUNCATE TABLE "Account" RESTART IDENTITY;

-- Then truncate parent tables
TRUNCATE TABLE "User" RESTART IDENTITY;

-- Truncate independent tables
TRUNCATE TABLE "FXRate" RESTART IDENTITY;
TRUNCATE TABLE "IdempotencyKey" RESTART IDENTITY;
TRUNCATE TABLE "AuditLog" RESTART IDENTITY;
*/

