-- Migration: 029_investor_evidence_source.sql
-- Adapts the "evidence source" concept from the investor-prospecting web map
-- (research/... "Real Estate Investor Web Map" PDF) onto the existing capital
-- Investor model - where a capital-investor relationship originated (REIA,
-- LinkedIn, BiggerPockets, referral, website, event, etc.), used by the new
-- investor qualification score alongside the capital signals that already
-- exist on this model.

ALTER TABLE "dynasty"."Investor" ADD COLUMN IF NOT EXISTS "evidenceSource" TEXT;
