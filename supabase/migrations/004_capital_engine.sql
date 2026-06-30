-- Migration: 004_capital_engine.sql
-- Dynasty OS Capital Engine Tables

-- Investors CRM
CREATE TABLE IF NOT EXISTS investors (
    investor_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_name      TEXT NOT NULL,
    entity             TEXT,
    status             TEXT CHECK (status IN (
                         'Prospect','Warm','Meeting','Committed','Funded','Repeat','Strategic Partner'
                       )) DEFAULT 'Prospect',
    available_capital  NUMERIC DEFAULT 0,
    committed_capital  NUMERIC DEFAULT 0,
    invested_capital   NUMERIC DEFAULT 0,
    preferred_return   NUMERIC DEFAULT 0.08,
    investment_type    TEXT,
    contact_info       JSONB DEFAULT '{}',
    risk_profile       TEXT,
    markets            TEXT[],
    created_at         TIMESTAMPTZ DEFAULT now()
);

-- Capital commitments
CREATE TABLE IF NOT EXISTS commitments (
    commitment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id   UUID NOT NULL REFERENCES investors (investor_id) ON DELETE CASCADE,
    deal_id       UUID NOT NULL REFERENCES deals (deal_id) ON DELETE CASCADE,
    amount        NUMERIC,
    status        TEXT CHECK (status IN ('Pending','Confirmed','Funded','Returned')) DEFAULT 'Pending',
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- Capital calls
CREATE TABLE IF NOT EXISTS capital_calls (
    capital_call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id     UUID NOT NULL REFERENCES investors (investor_id) ON DELETE CASCADE,
    deal_id         UUID NOT NULL REFERENCES deals (deal_id) ON DELETE CASCADE,
    amount          NUMERIC,
    due_date        DATE,
    status          TEXT CHECK (status IN ('Pending','Sent','Received','Overdue')) DEFAULT 'Pending',
    sent_at         TIMESTAMPTZ
);

-- Capital allocations (prioritized by ROI)
CREATE TABLE IF NOT EXISTS allocations (
    allocation_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id        UUID NOT NULL REFERENCES deals (deal_id) ON DELETE CASCADE,
    investor_id    UUID NOT NULL REFERENCES investors (investor_id) ON DELETE CASCADE,
    amount         NUMERIC,
    roi            NUMERIC,
    priority_score NUMERIC,
    allocated_at   TIMESTAMPTZ DEFAULT now()
);

-- Investor distributions
CREATE TABLE IF NOT EXISTS distributions (
    distribution_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id        UUID NOT NULL REFERENCES investors (investor_id) ON DELETE CASCADE,
    deal_id            UUID NOT NULL REFERENCES deals (deal_id) ON DELETE CASCADE,
    amount             NUMERIC,
    distribution_date  DATE,
    type               TEXT CHECK (type IN ('Preferred Return','Profit Share','Return of Capital')),
    status             TEXT CHECK (status IN ('Pending','Sent','Confirmed')) DEFAULT 'Pending'
);

-- Portfolio positions
CREATE TABLE IF NOT EXISTS portfolio (
    portfolio_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID,
    asset_type       TEXT CHECK (asset_type IN (
                       'Wholesale','Flip','Rental','Land','Development',
                       'Business Venture','Joint Venture'
                     )),
    asset_value      NUMERIC,
    equity           NUMERIC,
    cash_flow        NUMERIC,
    returns          NUMERIC,
    exposure         NUMERIC,
    created_at       TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investors_status          ON investors (status);
CREATE INDEX IF NOT EXISTS idx_investors_available_cap   ON investors (available_capital DESC);
CREATE INDEX IF NOT EXISTS idx_commitments_investor      ON commitments (investor_id);
CREATE INDEX IF NOT EXISTS idx_commitments_deal          ON commitments (deal_id);
CREATE INDEX IF NOT EXISTS idx_commitments_status        ON commitments (status);
CREATE INDEX IF NOT EXISTS idx_capital_calls_investor    ON capital_calls (investor_id);
CREATE INDEX IF NOT EXISTS idx_capital_calls_status      ON capital_calls (status);
CREATE INDEX IF NOT EXISTS idx_capital_calls_due_date    ON capital_calls (due_date);
CREATE INDEX IF NOT EXISTS idx_allocations_deal          ON allocations (deal_id);
CREATE INDEX IF NOT EXISTS idx_allocations_investor      ON allocations (investor_id);
CREATE INDEX IF NOT EXISTS idx_allocations_roi           ON allocations (roi DESC);
CREATE INDEX IF NOT EXISTS idx_distributions_investor    ON distributions (investor_id);
CREATE INDEX IF NOT EXISTS idx_distributions_status      ON distributions (status);
CREATE INDEX IF NOT EXISTS idx_portfolio_org             ON portfolio (organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_asset_type      ON portfolio (asset_type);
