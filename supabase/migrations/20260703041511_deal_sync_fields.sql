-- Migration: 008_deal_sync_fields.sql
-- Link Operations projects to a specific deal (a property may have had
-- multiple deals over time; Operations must track the one that was approved).

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals (deal_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_deal_id ON projects (deal_id);

-- property_analysis/underwriting/risk_scores/exit_models/stress_tests are
-- one-row-per-deal tables meant to be upserted via on_conflict="deal_id"
-- (score_risk() in deal_engine.py already assumes this), but none of them
-- had a unique constraint on deal_id, so that upsert would fail with
-- "no unique or exclusion constraint matching the ON CONFLICT specification".
ALTER TABLE property_analysis ADD CONSTRAINT property_analysis_deal_id_key UNIQUE (deal_id);
ALTER TABLE underwriting       ADD CONSTRAINT underwriting_deal_id_key       UNIQUE (deal_id);
ALTER TABLE risk_scores        ADD CONSTRAINT risk_scores_deal_id_key        UNIQUE (deal_id);
ALTER TABLE exit_models        ADD CONSTRAINT exit_models_deal_id_key        UNIQUE (deal_id);
ALTER TABLE stress_tests       ADD CONSTRAINT stress_tests_deal_id_key       UNIQUE (deal_id);
