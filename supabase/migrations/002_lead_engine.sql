-- Migration: 002_lead_engine.sql
-- Dynasty OS Lead Engine Tables

-- Leads master table
CREATE TABLE IF NOT EXISTS leads (
    lead_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_type         TEXT NOT NULL CHECK (lead_type IN (
                        'Seller','Buyer','Investor','Agent','Wholesaler',
                        'Vendor','Partner','Tenant','Business','Media','Government','Community'
                      )),
    source            TEXT,
    date_created      TIMESTAMPTZ DEFAULT now(),
    status            TEXT,
    score             INT DEFAULT 0,
    owner             TEXT,
    pipeline_stage    TEXT,
    notes             TEXT,
    next_action_date  DATE,
    metadata          JSONB DEFAULT '{}'
);

-- Lead activity log
CREATE TABLE IF NOT EXISTS lead_activities (
    activity_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id       UUID NOT NULL REFERENCES leads (lead_id) ON DELETE CASCADE,
    activity_type TEXT,
    description   TEXT,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- Lead routing assignments
CREATE TABLE IF NOT EXISTS lead_routing (
    routing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id    UUID NOT NULL REFERENCES leads (lead_id) ON DELETE CASCADE,
    routed_to  TEXT,
    routed_at  TIMESTAMPTZ DEFAULT now(),
    reason     TEXT
);

-- Lead scoring breakdown
CREATE TABLE IF NOT EXISTS lead_scoring (
    scoring_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id                   UUID NOT NULL REFERENCES leads (lead_id) ON DELETE CASCADE,
    motivation_score          INT DEFAULT 0,
    equity_score              INT DEFAULT 0,
    condition_score           INT DEFAULT 0,
    timeline_score            INT DEFAULT 0,
    price_expectation_score   INT DEFAULT 0,
    total_score               INT DEFAULT 0,
    grade                     TEXT CHECK (grade IN ('A','B','C','D')),
    scored_at                 TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_status        ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads (pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type      ON leads (lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_owner          ON leads (owner);
CREATE INDEX IF NOT EXISTS idx_leads_score          ON leads (score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_routing_lead    ON lead_routing (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_lead    ON lead_scoring (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_grade   ON lead_scoring (grade);
