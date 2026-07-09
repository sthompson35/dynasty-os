-- Migration: 031_deal_outcome.sql
-- Closes the prediction-vs-reality loop on the real, DealScore-scored
-- portfolio. Anchored to Property (via the unique DealScore per property),
-- not the Deal model - Deal is disconnected test/demo data (15 rows), while
-- DealScore already carries 19k+ real GO/KILL/RENEGOTIATE predictions.
-- Predicted fields are a frozen snapshot taken when the outcome is recorded,
-- not a live join to deal_scores, since deal_scores is upserted per property
-- and would otherwise drift out from under a recorded outcome.

CREATE TABLE IF NOT EXISTS "dynasty"."deal_outcomes" (
    "id"                 TEXT NOT NULL,
    "userId"             TEXT NOT NULL,
    "propertyId"         TEXT NOT NULL,
    "dealScoreId"        TEXT,

    "status"             TEXT NOT NULL DEFAULT 'closed',
    "closeDate"          TIMESTAMP(3),

    "predictedDecision"  TEXT,
    "predictedScore"     INTEGER,
    "predictedStrategy"  TEXT,
    "projectedPurchase"  DECIMAL(14,2),
    "projectedRehab"     DECIMAL(14,2),
    "projectedExit"      DECIMAL(14,2),

    "actualStrategy"     TEXT,
    "actualPurchase"     DECIMAL(14,2),
    "actualRehab"        DECIMAL(14,2),
    "actualExit"         DECIMAL(14,2),
    "holdMonths"         DECIMAL(6,2),

    "netProfit"          DECIMAL(14,2),
    "roi"                DECIMAL(8,4),

    "decisionSource"     TEXT,
    "postMortemNote"     TEXT,

    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_outcomes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "dynasty"."deal_outcomes" ADD CONSTRAINT "deal_outcomes_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "dynasty"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dynasty"."deal_outcomes" ADD CONSTRAINT "deal_outcomes_dealScoreId_fkey"
    FOREIGN KEY ("dealScoreId") REFERENCES "dynasty"."deal_scores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dynasty"."deal_outcomes" ADD CONSTRAINT "deal_outcomes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "dynasty"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "deal_outcomes_userId_propertyId_key" ON "dynasty"."deal_outcomes"("userId", "propertyId");
CREATE INDEX IF NOT EXISTS "deal_outcomes_userId_idx" ON "dynasty"."deal_outcomes"("userId");
CREATE INDEX IF NOT EXISTS "deal_outcomes_userId_status_idx" ON "dynasty"."deal_outcomes"("userId", "status");
