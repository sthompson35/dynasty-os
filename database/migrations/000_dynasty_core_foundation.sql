-- Migration 000: Dynasty schema + core foundation tables.
--
-- These tables (auth: User/Account/Session/VerificationToken; core property
-- management: Property/RehabItem/Draw/DealShare/PropertyDocument/Contact/
-- PropertyImage/PropertyContact) predate the raw-SQL migration-per-feature
-- workflow that started around migration 008 — they were originally created
-- via `prisma db push` and never captured as migration files. Every migration
-- from 002 onward references "User" via foreign key, and every migration from
-- 008 onward references "Property" via foreign key, so a fresh database
-- cannot be bootstrapped from database/migrations/ without this file running
-- first. Discovered while building the GitHub Actions predeploy gate, which
-- starts from an empty Postgres service container. DDL below is sourced from
-- `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma
-- --script` against the current schema.prisma, not hand-written, so it's
-- guaranteed to match the live Prisma models exactly.

CREATE SCHEMA IF NOT EXISTS "dynasty";

-- ─── AUTH (NextAuth / PrismaAdapter) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "dynasty"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'INVESTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "dynasty"."User"("email");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "dynasty"."User"("email");

CREATE TABLE IF NOT EXISTS "dynasty"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "dynasty"."Account"("provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "dynasty"."Account"("userId");

CREATE TABLE IF NOT EXISTS "dynasty"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "dynasty"."Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "dynasty"."Session"("userId");

CREATE TABLE IF NOT EXISTS "dynasty"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "dynasty"."VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "dynasty"."VerificationToken"("identifier", "token");

-- Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, so foreign keys are wrapped
-- to stay safely re-runnable against a database that already has them.
DO $$ BEGIN
    ALTER TABLE "dynasty"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dynasty"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dynasty"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── CORE PROPERTY MANAGEMENT ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "dynasty"."Property" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT,
    "propertyType" TEXT NOT NULL DEFAULT 'single-family',
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "sqft" INTEGER,
    "lotSize" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "purchasePrice" DECIMAL(14,2),
    "currentValue" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'prospect',
    "photoUrl" TEXT,
    "notes" TEXT,
    "virtualTourUrl" TEXT,
    "arv" DECIMAL(14,2),
    "repairCosts" DECIMAL(14,2),
    "holdingCosts" DECIMAL(14,2),
    "closingCosts" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Property_userId_idx" ON "dynasty"."Property"("userId");
CREATE INDEX IF NOT EXISTS "Property_userId_status_idx" ON "dynasty"."Property"("userId", "status");
CREATE INDEX IF NOT EXISTS "Property_userId_propertyType_idx" ON "dynasty"."Property"("userId", "propertyType");
CREATE INDEX IF NOT EXISTS "Property_userId_updatedAt_idx" ON "dynasty"."Property"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "dynasty"."RehabItem" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "room" TEXT NOT NULL DEFAULT 'General',
    "category" TEXT NOT NULL DEFAULT 'Materials',
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RehabItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RehabItem_propertyId_idx" ON "dynasty"."RehabItem"("propertyId");

CREATE TABLE IF NOT EXISTS "dynasty"."Draw" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "scheduledDate" TIMESTAMP(3),
    "fundedDate" TIMESTAMP(3),
    "lender" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Draw_propertyId_idx" ON "dynasty"."Draw"("propertyId");

CREATE TABLE IF NOT EXISTS "dynasty"."DealShare" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "preparedBy" TEXT,
    "contactEmail" TEXT,
    "showFinancials" BOOLEAN NOT NULL DEFAULT true,
    "showRehab" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DealShare_token_key" ON "dynasty"."DealShare"("token");
CREATE INDEX IF NOT EXISTS "DealShare_propertyId_idx" ON "dynasty"."DealShare"("propertyId");
CREATE INDEX IF NOT EXISTS "DealShare_userId_idx" ON "dynasty"."DealShare"("userId");
CREATE INDEX IF NOT EXISTS "DealShare_token_idx" ON "dynasty"."DealShare"("token");

CREATE TABLE IF NOT EXISTS "dynasty"."PropertyDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "cloudStoragePath" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'other',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PropertyDocument_propertyId_idx" ON "dynasty"."PropertyDocument"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyDocument_userId_idx" ON "dynasty"."PropertyDocument"("userId");
CREATE INDEX IF NOT EXISTS "PropertyDocument_propertyId_category_idx" ON "dynasty"."PropertyDocument"("propertyId", "category");

CREATE TABLE IF NOT EXISTS "dynasty"."Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'other',
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Contact_userId_idx" ON "dynasty"."Contact"("userId");
CREATE INDEX IF NOT EXISTS "Contact_userId_role_idx" ON "dynasty"."Contact"("userId", "role");

CREATE TABLE IF NOT EXISTS "dynasty"."PropertyImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cloudStoragePath" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PropertyImage_propertyId_idx" ON "dynasty"."PropertyImage"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyImage_userId_idx" ON "dynasty"."PropertyImage"("userId");
CREATE INDEX IF NOT EXISTS "PropertyImage_propertyId_sortOrder_idx" ON "dynasty"."PropertyImage"("propertyId", "sortOrder");

CREATE TABLE IF NOT EXISTS "dynasty"."PropertyContact" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleOnDeal" TEXT,
    "relationshipType" TEXT,
    "dealResponsibility" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "nextActionDate" TIMESTAMP(3),
    "lastContacted" TIMESTAMP(3),
    "documentsNeeded" TEXT,
    "paymentOwed" DECIMAL(14,2),
    "receivesUpdates" BOOLEAN NOT NULL DEFAULT false,
    "communicationHistory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyContact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PropertyContact_propertyId_idx" ON "dynasty"."PropertyContact"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyContact_contactId_idx" ON "dynasty"."PropertyContact"("contactId");
CREATE INDEX IF NOT EXISTS "PropertyContact_userId_idx" ON "dynasty"."PropertyContact"("userId");
CREATE INDEX IF NOT EXISTS "PropertyContact_propertyId_status_idx" ON "dynasty"."PropertyContact"("propertyId", "status");
CREATE INDEX IF NOT EXISTS "PropertyContact_propertyId_nextActionDate_idx" ON "dynasty"."PropertyContact"("propertyId", "nextActionDate");
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyContact_propertyId_contactId_key" ON "dynasty"."PropertyContact"("propertyId", "contactId");

DO $$ BEGIN
    ALTER TABLE "dynasty"."Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dynasty"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."RehabItem" ADD CONSTRAINT "RehabItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "dynasty"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."Draw" ADD CONSTRAINT "Draw_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "dynasty"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."DealShare" ADD CONSTRAINT "DealShare_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "dynasty"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."DealShare" ADD CONSTRAINT "DealShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dynasty"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."PropertyDocument" ADD CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "dynasty"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."PropertyDocument" ADD CONSTRAINT "PropertyDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dynasty"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dynasty"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "dynasty"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."PropertyImage" ADD CONSTRAINT "PropertyImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dynasty"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."PropertyContact" ADD CONSTRAINT "PropertyContact_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "dynasty"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "dynasty"."PropertyContact" ADD CONSTRAINT "PropertyContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "dynasty"."Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
