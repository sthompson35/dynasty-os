-- Dynasty PropertyOS Supabase Schema Migration
-- Digital Twin + Blender + Contractor + Investor + Accounting + Web3 foundation
-- Requires pgcrypto extension for gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- CORE TENANCY / USERS
-- =========================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    legal_name TEXT,
    business_type TEXT,
    owner_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'organizations_owner_user_fk'
    ) THEN
        ALTER TABLE organizations
        ADD CONSTRAINT organizations_owner_user_fk
        FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =========================
-- PROPERTY / PLANS / DIGITAL TWIN
-- =========================
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    property_code TEXT UNIQUE NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    county TEXT,
    property_type TEXT DEFAULT 'single_family',
    year_built INT,
    sqft NUMERIC(12,2),
    beds NUMERIC(4,1),
    baths NUMERIC(4,1),
    lot_size NUMERIC(12,2),
    acquisition_price NUMERIC(14,2),
    estimated_arv NUMERIC(14,2),
    estimated_rent NUMERIC(14,2),
    status TEXT DEFAULT 'planning',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    source_type TEXT DEFAULT 'upload',
    version TEXT DEFAULT 'v1',
    extracted_text TEXT,
    parsed_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digital_twins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    blender_file_url TEXT,
    glb_file_url TEXT,
    fbx_file_url TEXT,
    viewer_url TEXT,
    model_status TEXT DEFAULT 'draft',
    scale_unit TEXT DEFAULT 'feet',
    origin_x NUMERIC(12,4) DEFAULT 0,
    origin_y NUMERIC(12,4) DEFAULT 0,
    origin_z NUMERIC(12,4) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    digital_twin_id UUID REFERENCES digital_twins(id) ON DELETE CASCADE,
    floor_name TEXT NOT NULL,
    floor_level INT DEFAULT 1,
    elevation NUMERIC(12,4) DEFAULT 0,
    height NUMERIC(12,4) DEFAULT 8,
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    digital_twin_id UUID REFERENCES digital_twins(id) ON DELETE CASCADE,
    floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
    room_name TEXT NOT NULL,
    room_type TEXT,
    x NUMERIC(12,4) DEFAULT 0,
    y NUMERIC(12,4) DEFAULT 0,
    z NUMERIC(12,4) DEFAULT 0,
    width NUMERIC(12,4) NOT NULL,
    length NUMERIC(12,4) NOT NULL,
    height NUMERIC(12,4) DEFAULT 8,
    sqft NUMERIC(12,2),
    wall_thickness NUMERIC(8,4) DEFAULT 0.5,
    blender_collection TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS building_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    digital_twin_id UUID REFERENCES digital_twins(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    component_type TEXT NOT NULL, -- wall, floor, roof, door, window, cabinet, fixture, mep
    component_name TEXT NOT NULL,
    blender_object_name TEXT UNIQUE,
    x NUMERIC(12,4) DEFAULT 0,
    y NUMERIC(12,4) DEFAULT 0,
    z NUMERIC(12,4) DEFAULT 0,
    width NUMERIC(12,4),
    length NUMERIC(12,4),
    height NUMERIC(12,4),
    rotation_z NUMERIC(12,4) DEFAULT 0,
    quantity NUMERIC(12,4) DEFAULT 1,
    unit TEXT DEFAULT 'each',
    condition_rating NUMERIC(4,2),
    replace_or_repair TEXT DEFAULT 'keep',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- MATERIAL / ASSET LIBRARY
-- =========================
CREATE TABLE IF NOT EXISTS material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    parent_category TEXT
);

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    manufacturer TEXT,
    sku TEXT,
    material_type TEXT,
    base_color_hex TEXT DEFAULT '#ffffff',
    cost_per_unit NUMERIC(14,2),
    unit TEXT DEFAULT 'sqft',
    labor_cost_per_unit NUMERIC(14,2),
    lifespan_years NUMERIC(8,2),
    maintenance_level TEXT,
    roi_score NUMERIC(5,2),
    texture_url TEXT,
    normal_map_url TEXT,
    roughness_map_url TEXT,
    metallic NUMERIC(4,3) DEFAULT 0,
    roughness NUMERIC(4,3) DEFAULT 0.5,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS component_material_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID REFERENCES building_components(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    option_name TEXT NOT NULL,
    is_selected BOOLEAN DEFAULT false,
    estimated_material_cost NUMERIC(14,2),
    estimated_labor_cost NUMERIC(14,2),
    total_estimated_cost NUMERIC(14,2),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS asset_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    category TEXT,
    blender_asset_url TEXT,
    glb_asset_url TEXT,
    preview_image_url TEXT,
    cost NUMERIC(14,2),
    vendor TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- MEP SYSTEMS
-- =========================
CREATE TABLE IF NOT EXISTS mechanical_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    digital_twin_id UUID REFERENCES digital_twins(id) ON DELETE CASCADE,
    system_type TEXT NOT NULL, -- hvac, plumbing, electrical, smart_home
    system_name TEXT,
    location TEXT,
    condition_rating NUMERIC(4,2),
    replacement_cost NUMERIC(14,2),
    maintenance_cost NUMERIC(14,2),
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS mep_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mechanical_system_id UUID REFERENCES mechanical_systems(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    item_type TEXT NOT NULL,
    item_name TEXT,
    x NUMERIC(12,4) DEFAULT 0,
    y NUMERIC(12,4) DEFAULT 0,
    z NUMERIC(12,4) DEFAULT 0,
    code_status TEXT,
    estimated_cost NUMERIC(14,2),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =========================
-- REHAB / CONTRACTOR OPS
-- =========================
CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    company_name TEXT,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    trade TEXT,
    license_number TEXT,
    insurance_verified BOOLEAN DEFAULT false,
    rating NUMERIC(4,2),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS rehab_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    strategy TEXT,
    start_date DATE,
    target_completion_date DATE,
    status TEXT DEFAULT 'planning',
    total_budget NUMERIC(14,2),
    contingency_percent NUMERIC(5,2) DEFAULT 10,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rehab_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rehab_project_id UUID REFERENCES rehab_projects(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    scope_item TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'normal',
    quantity NUMERIC(12,2),
    unit TEXT,
    material_cost NUMERIC(14,2),
    labor_cost NUMERIC(14,2),
    total_cost NUMERIC(14,2),
    assigned_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'not_started'
);

-- =========================
-- INVESTOR ANALYSIS
-- =========================
CREATE TABLE IF NOT EXISTS deal_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    analysis_name TEXT,
    strategy TEXT, -- wholesale, flip, brrrr, rental, development
    purchase_price NUMERIC(14,2),
    closing_costs NUMERIC(14,2),
    repair_budget NUMERIC(14,2),
    holding_costs NUMERIC(14,2),
    selling_costs NUMERIC(14,2),
    arv NUMERIC(14,2),
    estimated_rent NUMERIC(14,2),
    monthly_expenses NUMERIC(14,2),
    loan_amount NUMERIC(14,2),
    interest_rate NUMERIC(8,4),
    loan_term_years NUMERIC(6,2),
    down_payment NUMERIC(14,2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deal_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_analysis_id UUID REFERENCES deal_analyses(id) ON DELETE CASCADE,
    max_allowable_offer NUMERIC(14,2),
    wholesale_fee NUMERIC(14,2),
    flip_profit NUMERIC(14,2),
    flip_roi NUMERIC(10,4),
    cash_on_cash_return NUMERIC(10,4),
    cap_rate NUMERIC(10,4),
    dscr NUMERIC(10,4),
    refinance_value NUMERIC(14,2),
    equity_created NUMERIC(14,2),
    monthly_cashflow NUMERIC(14,2),
    decision TEXT,
    risk_score NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- ACCOUNTING OS
-- =========================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    account_code TEXT,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    parent_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS property_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    ledger_name TEXT NOT NULL,
    fiscal_year INT,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    ledger_id UUID REFERENCES property_ledgers(id) ON DELETE SET NULL,
    account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    vendor TEXT,
    description TEXT,
    debit NUMERIC(14,2) DEFAULT 0,
    credit NUMERIC(14,2) DEFAULT 0,
    receipt_url TEXT,
    category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rehab_project_id UUID REFERENCES rehab_projects(id) ON DELETE CASCADE,
    scope_id UUID REFERENCES rehab_scopes(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    budgeted_amount NUMERIC(14,2),
    actual_amount NUMERIC(14,2),
    variance NUMERIC(14,2)
);

-- =========================
-- LENDER / APPRAISER / PROPERTY MANAGER
-- =========================
CREATE TABLE IF NOT EXISTS lender_packets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    packet_name TEXT,
    loan_type TEXT,
    requested_amount NUMERIC(14,2),
    ltv NUMERIC(10,4),
    dscr NUMERIC(10,4),
    file_url TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appraisals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    appraiser_name TEXT,
    appraisal_date DATE,
    appraised_value NUMERIC(14,2),
    condition_rating TEXT,
    appraisal_file_url TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS comps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    comp_address TEXT,
    sale_price NUMERIC(14,2),
    sale_date DATE,
    sqft NUMERIC(12,2),
    beds NUMERIC(4,1),
    baths NUMERIC(4,1),
    distance_miles NUMERIC(8,3),
    adjustment_amount NUMERIC(14,2),
    adjusted_value NUMERIC(14,2),
    source TEXT
);

CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    tenant_name TEXT,
    lease_start DATE,
    lease_end DATE,
    monthly_rent NUMERIC(14,2),
    deposit_amount NUMERIC(14,2),
    lease_file_url TEXT,
    status TEXT DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    request_title TEXT,
    description TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    assigned_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    estimated_cost NUMERIC(14,2),
    actual_cost NUMERIC(14,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- WEB3 PROPERTY PASSPORT
-- =========================
CREATE TABLE IF NOT EXISTS blockchain_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_name TEXT NOT NULL,
    chain_id TEXT,
    rpc_url TEXT,
    explorer_url TEXT,
    native_currency TEXT
);

CREATE TABLE IF NOT EXISTS property_passports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    passport_name TEXT,
    token_contract_address TEXT,
    token_id TEXT,
    network_id UUID REFERENCES blockchain_networks(id) ON DELETE SET NULL,
    metadata_uri TEXT,
    mint_status TEXT DEFAULT 'not_minted',
    minted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS document_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    document_type TEXT,
    file_url TEXT,
    sha256_hash TEXT NOT NULL,
    blockchain_tx_hash TEXT,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- AI AGENT OPS
-- =========================
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    agent_role TEXT,
    model_name TEXT,
    system_prompt TEXT,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS ai_agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    run_type TEXT,
    input_payload JSONB,
    output_payload JSONB,
    status TEXT DEFAULT 'queued',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- SEED CATEGORIES / SAMPLE PROPERTY
-- =========================
INSERT INTO material_categories (name, parent_category) VALUES
('Exterior Siding', 'Exterior'),
('Roofing', 'Exterior'),
('Flooring', 'Interior'),
('Interior Paint', 'Interior'),
('Cabinets', 'Interior'),
('Countertops', 'Interior'),
('Bathroom Tile', 'Interior'),
('Trim & Baseboards', 'Interior')
ON CONFLICT (name) DO NOTHING;

INSERT INTO materials (category_id, name, material_type, base_color_hex, cost_per_unit, labor_cost_per_unit, unit, lifespan_years, maintenance_level, roi_score, roughness)
SELECT id, 'Builder Grade Vinyl Siding', 'vinyl', '#d9d9d2', 4.50, 3.25, 'sqft', 25, 'low', 7.2, 0.65 FROM material_categories WHERE name='Exterior Siding'
UNION ALL
SELECT id, 'Fiber Cement Lap Siding', 'fiber_cement', '#c9c4b8', 8.50, 5.50, 'sqft', 40, 'medium', 8.4, 0.72 FROM material_categories WHERE name='Exterior Siding'
UNION ALL
SELECT id, 'Architectural Asphalt Shingle', 'asphalt', '#303036', 5.25, 3.75, 'sqft', 30, 'medium', 7.8, 0.8 FROM material_categories WHERE name='Roofing'
UNION ALL
SELECT id, 'Luxury Vinyl Plank', 'lvp', '#b28a5b', 3.75, 2.50, 'sqft', 20, 'low', 8.1, 0.55 FROM material_categories WHERE name='Flooring'
UNION ALL
SELECT id, 'White Semi Gloss Paint', 'paint', '#f5f4ef', 0.85, 1.75, 'sqft', 8, 'low', 6.5, 0.9 FROM material_categories WHERE name='Interior Paint';

CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_components_property ON building_components(property_id);
CREATE INDEX IF NOT EXISTS idx_material_options_component ON component_material_options(component_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property ON transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_rehab_projects_property ON rehab_projects(property_id);
CREATE INDEX IF NOT EXISTS idx_deal_analyses_property ON deal_analyses(property_id);
