-- Migration: 005_operations_engine.sql
-- Dynasty OS Operations Engine Tables

-- Projects master table
CREATE TABLE IF NOT EXISTS projects (
    project_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID REFERENCES properties (id) ON DELETE SET NULL,
    status              TEXT CHECK (status IN ('Planning','Active','On Hold','Complete','Cancelled')) DEFAULT 'Planning',
    start_date          DATE,
    target_completion   DATE,
    budget              NUMERIC,
    actual_cost         NUMERIC DEFAULT 0,
    completion_percent  NUMERIC DEFAULT 0,
    risk_score          TEXT CHECK (risk_score IN ('Low','Moderate','High','Critical')) DEFAULT 'Low',
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- Project tasks
CREATE TABLE IF NOT EXISTS project_tasks (
    task_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
    category      TEXT,
    assigned_to   TEXT,
    due_date      DATE,
    status        TEXT CHECK (status IN ('Not Started','In Progress','Blocked','Inspection','Complete')) DEFAULT 'Not Started',
    dependencies  TEXT[]
);

-- Vendor registry
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name   TEXT NOT NULL,
    category      TEXT,
    rating        NUMERIC,
    average_cost  NUMERIC,
    lead_time     TEXT,
    warranty      TEXT,
    performance   JSONB DEFAULT '{}'
);

-- Contractor registry
CREATE TABLE IF NOT EXISTS contractors (
    contractor_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade                TEXT,
    rating               NUMERIC,
    availability         TEXT,
    projects_completed   INT DEFAULT 0,
    contact_info         JSONB DEFAULT '{}',
    specializations      TEXT[]
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
    vendor_id   UUID REFERENCES vendors (vendor_id) ON DELETE SET NULL,
    item        TEXT,
    quantity    NUMERIC,
    unit_price  NUMERIC,
    total       NUMERIC,
    status      TEXT CHECK (status IN ('Pending','Ordered','Received','Cancelled')) DEFAULT 'Pending',
    ordered_at  TIMESTAMPTZ
);

-- Inspections
CREATE TABLE IF NOT EXISTS inspections (
    inspection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
    category      TEXT CHECK (category IN (
                    'Structural','Electrical','Mechanical','Plumbing',
                    'Finish Work','Safety','Code Compliance'
                  )),
    result        TEXT CHECK (result IN ('Pass','Conditional Pass','Fail')),
    inspector     TEXT,
    notes         TEXT,
    inspected_at  TIMESTAMPTZ DEFAULT now()
);

-- Change orders
CREATE TABLE IF NOT EXISTS change_orders (
    co_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id            UUID NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
    description           TEXT,
    cost_impact           NUMERIC,
    schedule_impact_days  INT,
    status                TEXT CHECK (status IN ('Pending','Approved','Rejected')) DEFAULT 'Pending',
    requested_at          TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_property_id      ON projects (property_id);
CREATE INDEX IF NOT EXISTS idx_projects_status           ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_risk_score       ON projects (risk_score);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project     ON project_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status      ON project_tasks (status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned    ON project_tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project   ON purchase_orders (project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status    ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_inspections_project       ON inspections (project_id);
CREATE INDEX IF NOT EXISTS idx_inspections_result        ON inspections (result);
CREATE INDEX IF NOT EXISTS idx_change_orders_project     ON change_orders (project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status      ON change_orders (status);

