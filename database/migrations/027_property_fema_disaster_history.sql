-- Migration: 027_property_fema_disaster_history.sql
-- FEMA disaster declaration history (Acquisition Intelligence, GIS expansion).
-- Derived from the county FIPS already extracted from censusGeoid during GIS
-- enrichment (026), queried against OpenFEMA's free Disaster Declarations
-- Summaries API - no new geocoding call needed.

ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "femaDisasterCount" INTEGER;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "femaLastDisasterDate" TIMESTAMP(3);
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "femaLastDisasterType" TEXT;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "femaDisasterSource" TEXT;
