-- Dynasty PropertyOS canonical control plane
-- Additive migration derived from Dynasty_OS_Enhanced_Canonical_v2.xlsx.
-- Existing Deal/Capital/Operations tables remain authoritative for legacy flows;
-- these tables add governed identity, evidence, approval, event and canary controls.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Canonical identity links -----------------------------------------------------
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_deals_deal_code ON deals (deal_code) WHERE deal_code IS NOT NULL;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(deal_id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_project_code ON projects (project_code) WHERE project_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deal_id ON projects (deal_id);

CREATE TABLE IF NOT EXISTS sites (
    site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    parcel_id TEXT,
    site_type TEXT,
    jurisdiction TEXT,
    zoning TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNING',
    evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sites_parcel_id ON sites(parcel_id) WHERE parcel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sites_property_id ON sites(property_id);
CREATE INDEX IF NOT EXISTS idx_sites_project_id ON sites(project_id);

-- Versioned underwriting + strategy ------------------------------------------
CREATE TABLE IF NOT EXISTS underwriting_snapshots (
    underwriting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
    version INT NOT NULL,
    purchase_price NUMERIC,
    arv NUMERIC,
    rehab_cost NUMERIC,
    holding_cost NUMERIC,
    closing_cost NUMERIC,
    selling_cost NUMERIC,
    cash_required NUMERIC,
    projected_profit NUMERIC,
    projected_roi NUMERIC,
    mao NUMERIC,
    comp_evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'HOLD_FOR_DATA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(deal_id, version)
);

CREATE TABLE IF NOT EXISTS strategy_analyses (
    strategy_analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    underwriting_id UUID NOT NULL REFERENCES underwriting_snapshots(underwriting_id) ON DELETE CASCADE,
    strategy TEXT NOT NULL,
    projected_profit NUMERIC,
    projected_roi NUMERIC,
    cash_required NUMERIC,
    hold_period_months NUMERIC,
    risk_score NUMERIC,
    assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
    rank INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(underwriting_id, strategy)
);

-- Recommendation != approval != execution ------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
    underwriting_id UUID REFERENCES underwriting_snapshots(underwriting_id) ON DELETE SET NULL,
    agent_id TEXT NOT NULL,
    verdict TEXT NOT NULL,
    confidence NUMERIC,
    rationale TEXT,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
    approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES recommendations(recommendation_id) ON DELETE CASCADE,
    authority_id TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED','APPROVED_WITH_CONDITIONS','REJECTED','HOLD')),
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    readback_ref TEXT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS execution_commands (
    execution_command_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID NOT NULL REFERENCES approvals(approval_id) ON DELETE RESTRICT,
    target_engine TEXT NOT NULL,
    action TEXT NOT NULL,
    payload_ref TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL DEFAULT 'PENDING',
    issued_by TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sync_transactions (
    sync_transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_command_id UUID NOT NULL REFERENCES execution_commands(execution_command_id) ON DELETE CASCADE,
    source_engine TEXT NOT NULL,
    target_engine TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    error_detail TEXT,
    reconciled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(execution_command_id, target_engine, entity_type, entity_id)
);

-- Evidence + provenance --------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_requirements (
    evidence_requirement_id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    lifecycle_stage TEXT NOT NULL,
    evidence_type TEXT NOT NULL,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    verifier_role TEXT,
    freshness_rule TEXT,
    gate_ref TEXT,
    failure_state TEXT NOT NULL DEFAULT 'HOLD_FOR_DATA',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS evidence_log (
    evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    evidence_type TEXT NOT NULL,
    source_system TEXT,
    source_reference TEXT,
    content_hash TEXT,
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_verification ON evidence_log(verification_state);

CREATE OR REPLACE FUNCTION prevent_verified_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.verification_state = 'VERIFIED' THEN
        RAISE EXCEPTION 'Verified evidence is immutable; create a superseding evidence record instead';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_verified_evidence_immutable ON evidence_log;
CREATE TRIGGER trg_verified_evidence_immutable
BEFORE UPDATE OR DELETE ON evidence_log
FOR EACH ROW EXECUTE FUNCTION prevent_verified_evidence_mutation();

CREATE TABLE IF NOT EXISTS data_provenance (
    provenance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field_or_metric TEXT NOT NULL,
    value_class TEXT NOT NULL CHECK (value_class IN ('LIVE','IMPORTED','DERIVED','FORECAST','SAMPLE','UNKNOWN')),
    source_system TEXT,
    source_reference TEXT,
    as_of TIMESTAMPTZ,
    freshness_sla_hours INT,
    transformation TEXT,
    verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    confidence NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_provenance_entity ON data_provenance(entity_type, entity_id);

-- Authority + decisions --------------------------------------------------------
CREATE TABLE IF NOT EXISTS authority_rules (
    authority_rule_id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    action TEXT NOT NULL,
    authority_level TEXT NOT NULL,
    role_or_authority TEXT NOT NULL,
    financial_threshold NUMERIC NOT NULL DEFAULT 0,
    conditions TEXT,
    approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    reserved_matter BOOLEAN NOT NULL DEFAULT FALSE,
    effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS decision_queue (
    decision_queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    recommendation_id UUID REFERENCES recommendations(recommendation_id) ON DELETE SET NULL,
    priority TEXT NOT NULL,
    consequence TEXT,
    owner TEXT NOT NULL,
    due_at TIMESTAMPTZ,
    evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    authority_rule_id TEXT REFERENCES authority_rules(authority_rule_id) ON DELETE SET NULL,
    state TEXT NOT NULL DEFAULT 'OPEN',
    readback_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event contract + observability ----------------------------------------------
CREATE TABLE IF NOT EXISTS engine_events (
    engine_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine TEXT NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    schema_version TEXT NOT NULL DEFAULT 'v1',
    correlation_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_engine_events_entity ON engine_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_engine_events_corr ON engine_events(correlation_id);

CREATE TABLE IF NOT EXISTS model_registry (
    model_id TEXT PRIMARY KEY,
    agent_or_engine TEXT NOT NULL,
    purpose TEXT NOT NULL,
    decision_class TEXT NOT NULL,
    implementation TEXT NOT NULL,
    version TEXT NOT NULL,
    input_contract TEXT,
    output_contract TEXT,
    evaluation_basis TEXT,
    verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED',
    last_verified_at TIMESTAMPTZ,
    owner TEXT,
    fallback TEXT,
    human_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS risk_register (
    risk_id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    risk_title TEXT NOT NULL,
    severity TEXT NOT NULL,
    likelihood TEXT NOT NULL,
    impact TEXT,
    owner TEXT NOT NULL,
    mitigation TEXT,
    due_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'OPEN',
    evidence_ref TEXT,
    residual_risk TEXT,
    escalation TEXT
);

-- Construction control plane ---------------------------------------------------
CREATE TABLE IF NOT EXISTS work_packages (
    package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(site_id) ON DELETE SET NULL,
    phase TEXT NOT NULL,
    contractor_id UUID REFERENCES contractors(contractor_id) ON DELETE SET NULL,
    start_date DATE,
    completion_date DATE,
    budget_amount NUMERIC,
    actual_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    accountable_owner TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_line_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES work_packages(package_id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT,
    budgeted_amount NUMERIC NOT NULL DEFAULT 0,
    actual_amount NUMERIC NOT NULL DEFAULT 0,
    variance NUMERIC GENERATED ALWAYS AS (actual_amount - budgeted_amount) STORED,
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS quality_checkpoints (
    checkpoint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES work_packages(package_id) ON DELETE CASCADE,
    checkpoint_type TEXT NOT NULL,
    required_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    inspector_role TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS phase_gates (
    gate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    phase_name TEXT NOT NULL,
    prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_approvals JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'BLOCKED',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    UNIQUE(project_id, phase_name)
);

-- Canary + release governance --------------------------------------------------
CREATE TABLE IF NOT EXISTS canary_tests (
    test_id TEXT PRIMARY KEY,
    release TEXT NOT NULL,
    capability TEXT NOT NULL,
    precondition TEXT,
    test_action TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    evidence_required TEXT,
    verifier TEXT,
    severity_if_fail TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    last_run_at TIMESTAMPTZ,
    evidence_ref TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS release_gates (
    gate_id TEXT PRIMARY KEY,
    release TEXT NOT NULL,
    gate TEXT NOT NULL,
    requirement TEXT NOT NULL,
    owner TEXT NOT NULL,
    evidence_required TEXT,
    dependency TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    waiver_authority TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS canary_runs (
    canary_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canary_key TEXT NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(deal_id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
    correlation_id TEXT NOT NULL UNIQUE,
    intake_status TEXT NOT NULL,
    underwriting_status TEXT NOT NULL,
    capital_status TEXT NOT NULL,
    operations_status TEXT NOT NULL,
    missing_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    verification_state TEXT NOT NULL DEFAULT 'PENDING',
    evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Seed locked controls ---------------------------------------------------------
INSERT INTO evidence_requirements
(evidence_requirement_id, entity_type, lifecycle_stage, evidence_type, required, verifier_role, freshness_rule, gate_ref, failure_state, notes)
VALUES
('EVR-001','Deal','INTAKE','PROPERTY_IDENTITY',TRUE,'INTAKE/HELIX','Current authoritative record','DEAL_ANALYSIS','HOLD_FOR_DATA','Address/APN/type/beds/baths/sqft/lot/year/condition.'),
('EVR-002','Deal','UNDERWRITING','COMPS',TRUE,'CHARLIE/HELIX','Closed sales appropriate to market/strategy','DEAL_APPROVAL','HOLD_FOR_DATA','Preserve source, sale date, distance, condition and adjustments.'),
('EVR-003','Project','PRECONSTRUCTION','SCOPE_BUDGET',TRUE,'ATLAS/HELIX','Current approved version','PROJECT_START','BLOCKED','Scope, quantities, bids/estimate, contingency and schedule.'),
('EVR-004','Draw','FUNDING','DRAW_SUPPORT',TRUE,'AUTHORIZED INSPECTOR','Current milestone','DRAW_APPROVAL','BLOCKED','Invoice, photos, inspection and approval as applicable.'),
('EVR-005','Project','CLOSEOUT','COMPLETION',TRUE,'HELIX','Final project version','DISPOSITION_HANDOFF','BLOCKED','Verified completion before exit handoff.')
ON CONFLICT (evidence_requirement_id) DO UPDATE SET
  notes = EXCLUDED.notes,
  verifier_role = EXCLUDED.verifier_role,
  gate_ref = EXCLUDED.gate_ref,
  failure_state = EXCLUDED.failure_state;

INSERT INTO authority_rules
(authority_rule_id, scope, action, authority_level, role_or_authority, financial_threshold, conditions, approval_required, reserved_matter, status)
VALUES
('AUTH-001','DEAL','ANALYZE','ENGINE','CHARLIE',0,'Read-only analysis; versioned inputs/evidence.',FALSE,FALSE,'ACTIVE'),
('AUTH-002','DEAL','APPROVE_ACQUISITION','EXECUTIVE','AUTHORIZED ACQUISITION AUTHORITY',0,'Current underwriting + evidence + readback.',TRUE,FALSE,'ACTIVE'),
('AUTH-003','PROJECT','ROUTINE_CHANGE_ORDER','OPERATOR','AUTHORIZED PROJECT MANAGER',2500,'Within approved scope and contingency.',TRUE,FALSE,'ACTIVE'),
('AUTH-004','ENTERPRISE','RESERVED_MATTER','BOARD','BOARD OF DIRECTORS',0,'Per governing documents and recorded resolution.',TRUE,TRUE,'ACTIVE')
ON CONFLICT (authority_rule_id) DO NOTHING;

INSERT INTO model_registry
(model_id, agent_or_engine, purpose, decision_class, implementation, version, input_contract, output_contract, evaluation_basis, verification_state, owner, fallback, human_approval_required, notes)
VALUES
('MODEL-CHARLIE-001','CHARLIE','Deal intelligence / strategy recommendation','MATERIAL','Existing TrooperCharlie + DealEngine','canonical-v1','UnderwritingSnapshot + evidence refs','Recommendation + reasoning + confidence','Deterministic regression + production canary','PENDING','CHARLIE / HELIX','Manual underwriting',TRUE,'Do not create a duplicate underwriting implementation.'),
('MODEL-ATLAS-001','ATLAS','Executive orchestration and decision prioritization','MATERIAL','ATLAS command layer','canonical-v1','Engine events + governed records','Decision queue + commands','Rules/backtest; realized calibration tracked separately','UNVERIFIED','ATLAS / HELIX','Human executive review',TRUE,'Recommendation is never approval.'),
('MODEL-REHAB-001','REHAB ENGINE','Scope/budget/draw intelligence','MATERIAL','PropertyOS rehab engine','canonical-v1','Project + scope + bids','Budget + draw schedule','Formula tests + project canary','PENDING','REHAB / HELIX','Manual contractor scope',TRUE,'Connect to WorkPackage/Quality/PhaseGate.')
ON CONFLICT (model_id) DO UPDATE SET version = EXCLUDED.version, notes = EXCLUDED.notes;

INSERT INTO canary_tests
(test_id, release, capability, precondition, test_action, expected_result, evidence_required, verifier, severity_if_fail, status, notes)
VALUES
('CAN-006','v1.0-propertyos','502 Buckley institutional property canary','Canonical controls deployed','Run INTAKE -> UNDERWRITING -> CAPITAL -> OPERATIONS','Property -> Deal -> Project -> Capital -> Operations trace with explicit holds for missing evidence','Evidence package + independent verification','ATHENA','CRITICAL','PLANNED','No scale until independently verified.')
ON CONFLICT (test_id) DO UPDATE SET
  precondition = EXCLUDED.precondition,
  test_action = EXCLUDED.test_action,
  expected_result = EXCLUDED.expected_result,
  notes = EXCLUDED.notes;

INSERT INTO release_gates
(gate_id, release, gate, requirement, owner, evidence_required, dependency, status, waiver_authority, notes)
VALUES
('GATE-003','v0.3-canonical-model','Identity integrity','Property<->Deal<->Project<->Site uniqueness/FKs verified','ARCHITECT','Migration + contract tests','Supabase migrations reconciled','PLANNED','EXECUTIVE','No duplicate masters.'),
('GATE-004','v0.3-evidence-plane','Evidence integrity','Claim->source->evidence->verification enforced','HELIX','Evidence canary','GATE-003','PLANNED','BOARD','Material evidence control.'),
('GATE-005','v0.4-authority','Authority enforcement','Unauthorized consequential action denied','TROOPER_SIGMA','Negative/positive authorization tests','GATE-003','PLANNED','BOARD','Recommendation is not approval.'),
('GATE-006','v0.4-events','Event reliability','Idempotency/retry/reconciliation pass','TROOPER_OSCAR / TROOPER_PAPA','Replay/failure evidence','GATE-003','PLANNED','EXECUTIVE','Cross-engine integrity.'),
('GATE-007','v1.0-propertyos','Institutional canary','502 Buckley full lifecycle independently verified','ATLAS / HELIX','Complete evidence package','GATE-003,GATE-004,GATE-005,GATE-006','PLANNED','BOARD','Scale gate.')
ON CONFLICT (gate_id) DO UPDATE SET
  requirement = EXCLUDED.requirement,
  dependency = EXCLUDED.dependency,
  notes = EXCLUDED.notes;
