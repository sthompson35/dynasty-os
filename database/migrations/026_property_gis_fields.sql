-- Migration: 026_property_gis_fields.sql
-- GIS/flood/zoning enrichment (Acquisition Intelligence, slice 1). Adds fields
-- to hold Census tract/GEOID + lat/lon (Census Geocoder), FEMA flood zone
-- (NFHL), and zoning district (per-jurisdiction adapters) so this data can be
-- auto-attached to a property instead of looked up manually on every deal.

ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "censusTract" TEXT;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "censusGeoid" TEXT;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "floodZone" TEXT;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "floodZoneSource" TEXT;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "zoningDistrict" TEXT;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "zoningSource" TEXT;
ALTER TABLE "dynasty"."Property" ADD COLUMN IF NOT EXISTS "gisEnrichedAt" TIMESTAMP(3);
