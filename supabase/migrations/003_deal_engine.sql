-- Migration: 003_deal_engine.sql
-- Dynasty OS Deal Engine Tables

-- Deals master table
CREATE TABLE IF NOT EXISTS deals (
    deal_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  UUID REFERENCES properties (id) ON DELETE SET NULL,
    seller       TEXT,
    asking_price NUMERIC,
    arv          NUMERIC,
    repairs      NUMERIC,
    beds         NUMERIC,
    baths        NUMERIC,
    sqft         NUMERIC,
    rent         NUMERIC,
    taxes        NUMERIC,
    insurance    NUMERIC,
    zoning       TEXT,
    flood_status TEXT,
    title_status TEXT,
    status       TEXT CHECK (status IN ('GO','GO_WITH_CONDITIONS','RENEGOTIATE','HOLD','KILL','PENDING')) DEFAULT 'PENDING',
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- Property valuation analysis
CREATE TABLE IF NOT EXISTS property_analysis (
    analysis_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             UUID NOT NULL REFERENCES deals (deal_id) ON DELETE CASCADE,
    current_value       NUMERIC,
    replacement_cost    NUMERIC,
    land_value          NUMERIC,
    rental_value        NUMERIC,
    wholesale_value     NUMERIC,
    development_value   NUMERIC,
    mao                 NUMERIC,
    target_margin       NUMERIC DEFAULT 0.30
);

-- Deal underwriting
CREATE TABLE IF NOT EXISTS underwriting (
    underwriting_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id                 UUID NOT NULL REFERENCES deals (deal_id) ON DELETE CASCADE,
    cash_needed             NUMERIC,
    closing_costs           NUMERIC,
    holding_costs           NUMERIC,
    interest_rate           NUMERIC,
    draw_schedule           JSONB,
    refinance_projection    NUMERIC,
    private_money           NUMERIC,
    hard_money              NUMERIC,
    expected_return         NUMERIC,
    investor_yield          NUMERIC,
    profit                  NUMERIC
);

-- Deal risk scores
CREATE TABLE IF NOT EXISTS risk_scores (
    risk_score_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id          UUID NOT NULL REFERENCES deals (deal_id) ON DELETE CASCADE,
    market_risk      INT,
    property_risk    INT,
    contractor_risk  INT,
    legal_risk       INT,
    title_risk       INT,
    capital_risk     INT,
    execution_risk   INT,
    tenant_risk      INT,
    economic_risk    INT,
    total_score      INT,
    risk_level       TEXT CHECK (risk_level IN ('LOW','MODERATE','HIGH','CRITICAL'))
);

-- Exit strategy models
CREATE TABLE IF NOT EXISTS exit_models (
    exit_model_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id               UUID NOT NULL REFERENCES deals (deal_id) ON DELETE CASCADE,
    wholesale_profit      NUMERIC,
    flip_profit           NUMERIC,
    rental_equity         NUMERIC,
    rental_cash_flow      NUMERIC,
    brrrr_cash_returned   NUMERIC,
    development_profit    NUMERIC,
    recommended_exit      TEXT
);

-- Stress test results
CREATE TABLE IF NOT EXISTS stress_tests (
    stress_test_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id                   UUID NOT NULL REFERENCES deals (deal_id) ON DELETE CASCADE,
    arv_drop_10_profit        NUMERIC,
    arv_drop_20_profit        NUMERIC,
    repairs_up_15_profit      NUMERIC,
    repairs_up_25_profit      NUMERIC,
    hold_time_doubled_profit  NUMERIC,
    worst_case_roi            NUMERIC,
    target_roi                NUMERIC,
    passes_stress_test        BOOLEAN
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_property_id ON deals (property_id);
CREATE INDEX IF NOT EXISTS idx_deals_status      ON deals (status);
CREATE INDEX IF NOT EXISTS idx_deals_arv         ON deals (arv DESC);
CREATE INDEX IF NOT EXISTS idx_deals_created_at  ON deals (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_analysis_deal  ON property_analysis (deal_id);
CREATE INDEX IF NOT EXISTS idx_underwriting_deal       ON underwriting (deal_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_deal        ON risk_scores (deal_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level       ON risk_scores (risk_level);
CREATE INDEX IF NOT EXISTS idx_exit_models_deal        ON exit_models (deal_id);
CREATE INDEX IF NOT EXISTS idx_stress_tests_deal       ON stress_tests (deal_id);
CREATE INDEX IF NOT EXISTS idx_stress_tests_passes     ON stress_tests (passes_stress_test);

