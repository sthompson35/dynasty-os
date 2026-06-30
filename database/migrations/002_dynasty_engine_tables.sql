-- Migration 002: Dynasty OS Engine Tables
-- Creates all 5 engine models: Lead, Deal, Investor, CapitalTransaction,
-- Project, ProjectTask, Buyer, Disposition, InvestorDistribution

SET search_path TO dynasty;

-- ─── LEAD ENGINE ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Lead" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "leadType"       TEXT NOT NULL DEFAULT 'seller',
    "source"         TEXT NOT NULL DEFAULT 'direct',
    "score"          INTEGER NOT NULL DEFAULT 0,
    "status"         TEXT NOT NULL DEFAULT 'new',
    "stage"          TEXT NOT NULL DEFAULT 'intake',
    "firstName"      TEXT,
    "lastName"       TEXT,
    "email"          TEXT,
    "phone"          TEXT,
    "address"        TEXT,
    "city"           TEXT,
    "state"          TEXT,
    "zip"            TEXT,
    "motivation"     TEXT,
    "equity"         DECIMAL(14,2),
    "askingPrice"    DECIMAL(14,2),
    "notes"          TEXT,
    "nextAction"     TEXT,
    "nextActionDate" TIMESTAMP(3),
    "owner"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Lead_userId_idx" ON "Lead"("userId");
CREATE INDEX IF NOT EXISTS "Lead_userId_leadType_idx" ON "Lead"("userId", "leadType");
CREATE INDEX IF NOT EXISTS "Lead_userId_status_idx" ON "Lead"("userId", "status");

-- ─── DEAL ENGINE ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Deal" (
    "id"               TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "propertyId"       TEXT,
    "address"          TEXT NOT NULL,
    "city"             TEXT NOT NULL,
    "state"            TEXT NOT NULL,
    "zip"              TEXT,
    "exitStrategy"     TEXT NOT NULL DEFAULT 'wholesale',
    "status"           TEXT NOT NULL DEFAULT 'intake',
    "purchasePrice"    DECIMAL(14,2),
    "arv"              DECIMAL(14,2),
    "repairCosts"      DECIMAL(14,2),
    "holdingCosts"     DECIMAL(14,2),
    "closingCosts"     DECIMAL(14,2),
    "mao"              DECIMAL(14,2),
    "wholesaleFee"     DECIMAL(14,2),
    "flipProfit"       DECIMAL(14,2),
    "rentalEquity"     DECIMAL(14,2),
    "monthlyCashFlow"  DECIMAL(14,2),
    "roi"              DECIMAL(8,4),
    "riskScore"        INTEGER NOT NULL DEFAULT 0,
    "decision"         TEXT NOT NULL DEFAULT 'pending',
    "capitalRequired"  DECIMAL(14,2),
    "capitalAllocated" DECIMAL(14,2),
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Deal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Deal_userId_idx" ON "Deal"("userId");
CREATE INDEX IF NOT EXISTS "Deal_userId_status_idx" ON "Deal"("userId", "status");
CREATE INDEX IF NOT EXISTS "Deal_userId_decision_idx" ON "Deal"("userId", "decision");

-- ─── CAPITAL ENGINE ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Investor" (
    "id"               TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "entity"           TEXT,
    "email"            TEXT,
    "phone"            TEXT,
    "status"           TEXT NOT NULL DEFAULT 'prospect',
    "availableCapital" DECIMAL(14,2),
    "committedCapital" DECIMAL(14,2),
    "investedCapital"  DECIMAL(14,2),
    "preferredReturn"  DECIMAL(5,4),
    "investmentType"   TEXT NOT NULL DEFAULT 'private_loan',
    "markets"          TEXT,
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Investor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Investor_userId_idx" ON "Investor"("userId");
CREATE INDEX IF NOT EXISTS "Investor_userId_status_idx" ON "Investor"("userId", "status");

CREATE TABLE IF NOT EXISTS "CapitalTransaction" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "investorId" TEXT,
    "dealId"     TEXT,
    "type"       TEXT NOT NULL,
    "amount"     DECIMAL(14,2) NOT NULL,
    "date"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"     TEXT NOT NULL DEFAULT 'pending',
    "notes"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CapitalTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CapitalTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "CapitalTransaction_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "CapitalTransaction_userId_idx" ON "CapitalTransaction"("userId");
CREATE INDEX IF NOT EXISTS "CapitalTransaction_userId_type_idx" ON "CapitalTransaction"("userId", "type");
CREATE INDEX IF NOT EXISTS "CapitalTransaction_investorId_idx" ON "CapitalTransaction"("investorId");

-- ─── OPERATIONS ENGINE ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Project" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "propertyId"        TEXT,
    "dealId"            TEXT,
    "name"              TEXT NOT NULL,
    "status"            TEXT NOT NULL DEFAULT 'intake',
    "startDate"         TIMESTAMP(3),
    "targetCompletion"  TIMESTAMP(3),
    "budget"            DECIMAL(14,2),
    "actualCost"        DECIMAL(14,2),
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "riskScore"         INTEGER NOT NULL DEFAULT 0,
    "exitStrategy"      TEXT NOT NULL DEFAULT 'flip',
    "notes"             TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId");
CREATE INDEX IF NOT EXISTS "Project_userId_status_idx" ON "Project"("userId", "status");

CREATE TABLE IF NOT EXISTS "ProjectTask" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "category"    TEXT NOT NULL DEFAULT 'general',
    "description" TEXT NOT NULL,
    "assignedTo"  TEXT,
    "dueDate"     TIMESTAMP(3),
    "status"      TEXT NOT NULL DEFAULT 'not_started',
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProjectTask_projectId_idx" ON "ProjectTask"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectTask_projectId_status_idx" ON "ProjectTask"("projectId", "status");

-- ─── DISPOSITION ENGINE ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Buyer" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "entity"          TEXT,
    "email"           TEXT,
    "phone"           TEXT,
    "markets"         TEXT,
    "criteria"        TEXT,
    "buyerType"       TEXT NOT NULL DEFAULT 'cash',
    "fundingCapacity" DECIMAL(14,2),
    "closeSpeed"      INTEGER,
    "score"           INTEGER NOT NULL DEFAULT 0,
    "notes"           TEXT,
    "active"          BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Buyer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Buyer_userId_idx" ON "Buyer"("userId");
CREATE INDEX IF NOT EXISTS "Buyer_userId_buyerType_idx" ON "Buyer"("userId", "buyerType");
CREATE INDEX IF NOT EXISTS "Buyer_userId_active_idx" ON "Buyer"("userId", "active");

CREATE TABLE IF NOT EXISTS "Disposition" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "propertyId"   TEXT,
    "dealId"       TEXT,
    "buyerId"      TEXT,
    "exitStrategy" TEXT NOT NULL DEFAULT 'wholesale',
    "status"       TEXT NOT NULL DEFAULT 'marketing',
    "listPrice"    DECIMAL(14,2),
    "salePrice"    DECIMAL(14,2),
    "netProfit"    DECIMAL(14,2),
    "daysToExit"   INTEGER,
    "closeDate"    TIMESTAMP(3),
    "notes"        TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Disposition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Disposition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "Disposition_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE SET NULL,
    CONSTRAINT "Disposition_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Disposition_userId_idx" ON "Disposition"("userId");
CREATE INDEX IF NOT EXISTS "Disposition_userId_status_idx" ON "Disposition"("userId", "status");
CREATE INDEX IF NOT EXISTS "Disposition_userId_exitStrategy_idx" ON "Disposition"("userId", "exitStrategy");

CREATE TABLE IF NOT EXISTS "InvestorDistribution" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "investorId"    TEXT NOT NULL,
    "dispositionId" TEXT,
    "amount"        DECIMAL(14,2) NOT NULL,
    "date"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"        TEXT NOT NULL DEFAULT 'pending',
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestorDistribution_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InvestorDistribution_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE,
    CONSTRAINT "InvestorDistribution_dispositionId_fkey" FOREIGN KEY ("dispositionId") REFERENCES "Disposition"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "InvestorDistribution_investorId_idx" ON "InvestorDistribution"("investorId");
CREATE INDEX IF NOT EXISTS "InvestorDistribution_dispositionId_idx" ON "InvestorDistribution"("dispositionId");
