-- Dynasty PropertyOS Supabase Schema Migration
-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    legal_name TEXT,
    owner_user_id UUID,
    business_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner','admin','investor','contractor','lender','appraiser','property_manager','viewer')),
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    property_code TEXT UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    county TEXT,
    property_type TEXT,
    year_built INT,
    sqft NUMERIC,
    beds NUMERIC,
    baths NUMERIC,
    lot_size NUMERIC,
    acquisition_price NUMERIC,
    estimated_arv NUMERIC,
    estimated_rent NUMERIC,
    status TEXT DEFAULT 'planning',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    plan_name TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT,
    source_type TEXT,
    version TEXT,
    extracted_text TEXT,
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
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    digital_twin_id UUID REFERENCES digital_twins(id) ON DELETE SET NULL,
    room_name TEXT NOT NULL,
    room_type TEXT,
    floor_level TEXT DEFAULT 'L1',
    x NUMERIC DEFAULT 0,
    y NUMERIC DEFAULT 0,
    width NUMERIC,
    length NUMERIC,
    height NUMERIC DEFAULT 8,
    sqft NUMERIC,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS building_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    component_type TEXT NOT NULL,
    component_name TEXT,
    blender_object_name TEXT,
    quantity NUMERIC DEFAULT 1,
    unit TEXT,
    condition_rating NUMERIC,
    replace_or_repair TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_category TEXT
);

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    manufacturer TEXT,
    sku TEXT,
    material_type TEXT,
    cost_per_unit NUMERIC,
    unit TEXT,
    labor_cost_per_unit NUMERIC,
    lifespan_years NUMERIC,
    maintenance_level TEXT,
    roi_score NUMERIC,
    texture_url TEXT,
    normal_map_url TEXT,
    roughness_map_url TEXT,
    color_hex TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS component_material_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID REFERENCES building_components(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    option_name TEXT,
    is_selected BOOLEAN DEFAULT false,
    estimated_material_cost NUMERIC,
    estimated_labor_cost NUMERIC,
    total_estimated_cost NUMERIC
);

CREATE TABLE IF NOT EXISTS rehab_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    strategy TEXT,
    start_date DATE,
    target_completion_date DATE,
    status TEXT DEFAULT 'planning',
    total_budget NUMERIC,
    contingency_percent NUMERIC DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rehab_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rehab_project_id UUID REFERENCES rehab_projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    scope_item TEXT NOT NULL,
    description TEXT,
    priority TEXT,
    quantity NUMERIC,
    unit TEXT,
    material_cost NUMERIC,
    labor_cost NUMERIC,
    total_cost NUMERIC,
    status TEXT DEFAULT 'not_started'
);

CREATE TABLE IF NOT EXISTS deal_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    analysis_name TEXT,
    strategy TEXT,
    purchase_price NUMERIC,
    closing_costs NUMERIC,
    repair_budget NUMERIC,
    holding_costs NUMERIC,
    selling_costs NUMERIC,
    arv NUMERIC,
    estimated_rent NUMERIC,
    monthly_expenses NUMERIC,
    loan_amount NUMERIC,
    interest_rate NUMERIC,
    loan_term_years NUMERIC,
    down_payment NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deal_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_analysis_id UUID REFERENCES deal_analyses(id) ON DELETE CASCADE,
    max_allowable_offer NUMERIC,
    wholesale_fee NUMERIC,
    flip_profit NUMERIC,
    flip_roi NUMERIC,
    cash_on_cash_return NUMERIC,
    cap_rate NUMERIC,
    dscr NUMERIC,
    refinance_value NUMERIC,
    equity_created NUMERIC,
    monthly_cashflow NUMERIC,
    decision TEXT,
    risk_score NUMERIC
);

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
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    receipt_url TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
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

CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_components_property ON building_components(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property ON transactions(property_id);
