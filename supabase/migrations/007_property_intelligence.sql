-- Migration: 007_property_intelligence.sql
-- Dynasty OS Property Intelligence Layer — Park Hills / Smart Town Scanner

-- Property vacancy tracking
CREATE TABLE IF NOT EXISTS property_vacancy (
    vacancy_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id      UUID REFERENCES properties (id) ON DELETE CASCADE,
    address          TEXT NOT NULL,
    city             TEXT DEFAULT 'Park Hills',
    state            TEXT DEFAULT 'MO',
    zip              TEXT,
    parcel_id        TEXT,
    vacancy_type     TEXT CHECK (vacancy_type IN (
                       'Vacant House','Vacant Lot','Abandoned','Condemned',
                       'Tax Delinquent','Foreclosure','Pre-Foreclosure'
                     )),
    years_vacant     NUMERIC,
    last_seen_vacant DATE,
    confirmed        BOOLEAN DEFAULT FALSE,
    owner_name       TEXT,
    owner_address    TEXT,
    owner_mailing    TEXT,
    skip_traced      BOOLEAN DEFAULT FALSE,
    notes            TEXT,
    metadata         JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Tax delinquency records
CREATE TABLE IF NOT EXISTS property_tax (
    tax_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID REFERENCES properties (id) ON DELETE CASCADE,
    parcel_id           TEXT,
    address             TEXT NOT NULL,
    owner_name          TEXT,
    tax_year            INT,
    amount_owed         NUMERIC,
    years_delinquent    INT DEFAULT 1,
    lien_filed          BOOLEAN DEFAULT FALSE,
    certificate_issued  BOOLEAN DEFAULT FALSE,
    redemption_deadline DATE,
    county              TEXT DEFAULT 'St. Francois',
    status              TEXT CHECK (status IN ('Active','Redeemed','Sold at Auction','Forfeited')) DEFAULT 'Active',
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- Ownership / skip-trace records
CREATE TABLE IF NOT EXISTS property_ownership (
    ownership_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id       UUID REFERENCES properties (id) ON DELETE CASCADE,
    parcel_id         TEXT,
    address           TEXT NOT NULL,
    owner_name        TEXT,
    owner_type        TEXT CHECK (owner_type IN (
                        'Individual','LLC','Trust','Estate','Bank','Government','Corporate','Unknown'
                      )) DEFAULT 'Unknown',
    mailing_address   TEXT,
    phone             TEXT[],
    email             TEXT[],
    absentee          BOOLEAN DEFAULT FALSE,
    out_of_state      BOOLEAN DEFAULT FALSE,
    years_owned       NUMERIC,
    purchase_price    NUMERIC,
    purchase_date     DATE,
    skip_trace_status TEXT CHECK (skip_trace_status IN ('Not Started','In Progress','Found','Not Found')) DEFAULT 'Not Started',
    last_contact      DATE,
    contact_attempts  INT DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Comparable sales (comps)
CREATE TABLE IF NOT EXISTS property_comps (
    comp_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id      UUID REFERENCES properties (id) ON DELETE CASCADE,
    comp_address    TEXT NOT NULL,
    sale_price      NUMERIC,
    sale_date       DATE,
    sqft            NUMERIC,
    beds            NUMERIC,
    baths           NUMERIC,
    price_per_sqft  NUMERIC GENERATED ALWAYS AS (
                      CASE WHEN sqft > 0 THEN sale_price / sqft ELSE NULL END
                    ) STORED,
    distance_miles  NUMERIC,
    condition       TEXT CHECK (condition IN ('Superior','Similar','Inferior')),
    adjusted_price  NUMERIC,
    source          TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Rental market data
CREATE TABLE IF NOT EXISTS property_rent (
    rent_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID REFERENCES properties (id) ON DELETE CASCADE,
    address             TEXT NOT NULL,
    beds                NUMERIC,
    baths               NUMERIC,
    sqft                NUMERIC,
    asking_rent         NUMERIC,
    market_rent_low     NUMERIC,
    market_rent_mid     NUMERIC,
    market_rent_high    NUMERIC,
    gross_yield         NUMERIC,
    cap_rate            NUMERIC,
    occupancy_rate      NUMERIC DEFAULT 0.95,
    source              TEXT,
    as_of_date          DATE DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- Park Hills Smart Town scan log
CREATE TABLE IF NOT EXISTS smart_town_scans (
    scan_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_date       TIMESTAMPTZ DEFAULT now(),
    scan_type       TEXT CHECK (scan_type IN (
                      'Vacancy Drive-By','Tax Delinquency Pull','Comp Pull',
                      'Ownership Research','Full Market Scan'
                    )),
    properties_found INT DEFAULT 0,
    leads_generated  INT DEFAULT 0,
    radius_miles     NUMERIC DEFAULT 10,
    center_address   TEXT DEFAULT '502 Buckley St, Park Hills, MO 63601',
    results          JSONB DEFAULT '{}',
    triggered_by     TEXT DEFAULT 'n8n'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vacancy_property      ON property_vacancy (property_id);
CREATE INDEX IF NOT EXISTS idx_vacancy_type          ON property_vacancy (vacancy_type);
CREATE INDEX IF NOT EXISTS idx_vacancy_city          ON property_vacancy (city);
CREATE INDEX IF NOT EXISTS idx_vacancy_skip_traced   ON property_vacancy (skip_traced);
CREATE INDEX IF NOT EXISTS idx_tax_parcel            ON property_tax (parcel_id);
CREATE INDEX IF NOT EXISTS idx_tax_status            ON property_tax (status);
CREATE INDEX IF NOT EXISTS idx_tax_years_delinquent  ON property_tax (years_delinquent DESC);
CREATE INDEX IF NOT EXISTS idx_ownership_parcel      ON property_ownership (parcel_id);
CREATE INDEX IF NOT EXISTS idx_ownership_absentee    ON property_ownership (absentee);
CREATE INDEX IF NOT EXISTS idx_ownership_skip_status ON property_ownership (skip_trace_status);
CREATE INDEX IF NOT EXISTS idx_comps_subject         ON property_comps (subject_id);
CREATE INDEX IF NOT EXISTS idx_comps_sale_date       ON property_comps (sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_rent_property         ON property_rent (property_id);
CREATE INDEX IF NOT EXISTS idx_rent_beds             ON property_rent (beds);
CREATE INDEX IF NOT EXISTS idx_smart_town_scans_date ON smart_town_scans (scan_date DESC);
