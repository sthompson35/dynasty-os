-- Migration: 006_disposition_engine.sql
-- Dynasty OS Disposition Engine Tables

-- Buyer registry
CREATE TABLE IF NOT EXISTS buyers (
    buyer_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_name       TEXT NOT NULL,
    entity           TEXT,
    markets          TEXT[],
    criteria         JSONB DEFAULT '{}',
    funding_capacity NUMERIC,
    close_speed_days INT,
    buyer_type       TEXT CHECK (buyer_type IN (
                       'Cash Buyer','Flipper','Landlord','Developer',
                       'Institutional','Owner Occupant','Builder','Fund','REIT'
                     )),
    purchase_history JSONB DEFAULT '{}',
    buyer_score      INT DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT now()
);

-- Buyer purchase criteria
CREATE TABLE IF NOT EXISTS buyer_criteria (
    criteria_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id          UUID NOT NULL REFERENCES buyers (buyer_id) ON DELETE CASCADE,
    min_price         NUMERIC,
    max_price         NUMERIC,
    min_beds          INT,
    max_beds          INT,
    preferred_markets TEXT[],
    asset_types       TEXT[],
    min_roi           NUMERIC
);

-- Property marketing campaigns
CREATE TABLE IF NOT EXISTS property_marketing (
    marketing_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID REFERENCES properties (id) ON DELETE CASCADE,
    channels        TEXT[],
    assets          JSONB DEFAULT '{}',
    campaign_start  DATE,
    campaign_end    DATE,
    views           INT DEFAULT 0,
    inquiries       INT DEFAULT 0,
    status          TEXT CHECK (status IN ('Draft','Active','Paused','Complete')) DEFAULT 'Draft'
);

-- Offers received
CREATE TABLE IF NOT EXISTS offers (
    offer_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  UUID REFERENCES properties (id) ON DELETE CASCADE,
    buyer_id     UUID REFERENCES buyers (buyer_id) ON DELETE SET NULL,
    offer_price  NUMERIC,
    offer_date   DATE,
    status       TEXT CHECK (status IN ('Pending','Countered','Accepted','Rejected','Expired')) DEFAULT 'Pending',
    notes        TEXT
);

-- Purchase contracts
CREATE TABLE IF NOT EXISTS contracts (
    contract_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id    UUID REFERENCES properties (id) ON DELETE CASCADE,
    buyer_id       UUID REFERENCES buyers (buyer_id) ON DELETE SET NULL,
    offer_id       UUID REFERENCES offers (offer_id) ON DELETE SET NULL,
    sale_price     NUMERIC,
    earnest_money  NUMERIC,
    contingencies  TEXT[],
    closing_date   DATE,
    status         TEXT CHECK (status IN ('Pending','Under Contract','Closed','Cancelled')) DEFAULT 'Pending'
);

-- Closed transactions
CREATE TABLE IF NOT EXISTS closings (
    closing_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id             UUID REFERENCES contracts (contract_id) ON DELETE SET NULL,
    property_id             UUID REFERENCES properties (id) ON DELETE SET NULL,
    buyer_id                UUID REFERENCES buyers (buyer_id) ON DELETE SET NULL,
    sale_price              NUMERIC,
    net_profit              NUMERIC,
    capital_recovered       NUMERIC,
    close_date              DATE,
    investor_distributions  JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_buyers_buyer_type         ON buyers (buyer_type);
CREATE INDEX IF NOT EXISTS idx_buyers_buyer_score        ON buyers (buyer_score DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_criteria_buyer      ON buyer_criteria (buyer_id);
CREATE INDEX IF NOT EXISTS idx_property_marketing_prop   ON property_marketing (property_id);
CREATE INDEX IF NOT EXISTS idx_property_marketing_status ON property_marketing (status);
CREATE INDEX IF NOT EXISTS idx_offers_property           ON offers (property_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer              ON offers (buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_status             ON offers (status);
CREATE INDEX IF NOT EXISTS idx_contracts_property        ON contracts (property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status          ON contracts (status);
CREATE INDEX IF NOT EXISTS idx_closings_property         ON closings (property_id);
CREATE INDEX IF NOT EXISTS idx_closings_close_date       ON closings (close_date DESC);

