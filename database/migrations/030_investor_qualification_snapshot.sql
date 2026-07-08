-- Migration: 030_investor_qualification_snapshot.sql
-- Investor Intelligence Slice 3: "Which investors deserve renewed attention
-- because their qualification has materially improved?" Qualification is
-- recomputed fresh on every read (see lib/investor-qualification.ts), so
-- detecting a *change* needs a stored "before" value to diff against.
-- Snapshot-on-read only - one row per investor, no event log - since nothing
-- yet justifies a full InvestorActivity table the way PropertyActivity was
-- justified for properties.

ALTER TABLE "dynasty"."Investor" ADD COLUMN IF NOT EXISTS "lastQualificationScore" INTEGER;
ALTER TABLE "dynasty"."Investor" ADD COLUMN IF NOT EXISTS "lastQualificationReasons" JSONB;
ALTER TABLE "dynasty"."Investor" ADD COLUMN IF NOT EXISTS "lastQualificationAt" TIMESTAMP(3);
