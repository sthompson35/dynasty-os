# Dynasty PropertyOS Master Build Plan

## Mission
Build a vertically integrated real estate development platform that designs and presents:
- single-family houses
- duplexes
- 4-plexes
- apartment complexes
- commercial buildings

Then convert those designs into lender-grade, investor-grade, and contractor-grade deliverables using Blender, custom BIM metadata, and CAD exports.

## North-Star Outcomes
1. Every project type has reusable parametric templates.
2. Every design can be presented visually to clients, investors, and lenders.
3. Every design can be executed by contractors with trade-level documentation.
4. Every model keeps structured BIM data for cost, scope, permitting, and operations.
5. Every output is versioned and traceable across architecture, engineering, and finance.

## Stakeholders And Required Output Packages

### Clients
- Photoreal renders
- Interactive walkthroughs
- Floor plans and room schedules
- Option packages (good, better, best)

### Investors
- Project summary deck
- Unit mix and rent roll assumptions
- Development budget and contingency model
- Return scenarios (base, upside, downside)
- Construction timeline and milestone risk

### Lenders
- Loan request package
- Draw schedule by phase
- Cost-to-complete and variance controls
- DSCR, LTC, LTV, and debt sensitivity reports

### Contractors
- Scope of work per trade
- Dimensioned plan sets
- Material schedules and quantity takeoffs
- Construction sequencing and dependency map

### Plumbers, Electricians, HVAC, Other Trades
- Trade-specific layer exports
- Fixtures and equipment schedules
- Rough-in maps and vertical stack references
- Clash checks against structural and framing envelopes

## System Architecture In This Repository

### Design And Asset Core
- Blender source scenes and scripts in blender
- Parametric generators and local runner in scripts
- Reusable component libraries in blender/assets and blender/property_models

### Data, BIM, And Cost Intelligence
- BIM metadata schemas in blender/metadata and database/schemas
- Cost and accounting structures in accounting and database
- Migration and seed pipelines in database/migrations and database/seeds

### Application And Presentation Layer
- API and orchestration in backend/app and ai_agents
- Client-facing and internal visualization in frontend
- Role-specific documentation and reports in docs and database/reports

## BIM-CAD Object Strategy
Each custom object type must include geometry, metadata, and export mappings.

### Core Objects
- windows
- doors
- walls
- decks
- rooms
- garages
- stairs
- roofs
- MEP placeholders

### Required Metadata Fields Per Object
- object_id
- object_type
- family
- variant
- dimensions
- material_spec
- fire_rating
- insulation_rating
- acoustic_rating
- cost_code
- trade_owner
- installation_sequence
- maintenance_class
- revision

### Export Targets
- GLB for web and presentations
- IFC or JSON-BIM for interoperability
- 2D CAD formats for trade drafting
- CSV schedules for procurement and estimating

## Delivery Pipeline
1. Intake project requirements and constraints.
2. Select template family (house, duplex, 4-plex, apartment, commercial).
3. Generate model in Blender with parametric inputs.
4. Attach BIM metadata to all structural and trade objects.
5. Run validation checks (dimension, code, clash, schedule completeness).
6. Export role-based packages.
7. Publish presentation assets to frontend.
8. Publish finance and execution packets to backend and accounting flows.

## Build Phases

### Phase 1: Foundation (Weeks 1-3)
- Standardize folder contracts for templates, components, and exports.
- Define BIM metadata schema version 1.
- Build object libraries for windows, doors, walls, decks, rooms, garages.
- Implement validation script for required metadata fields.

### Phase 2: Residential Productization (Weeks 4-8)
- House template generator with 3 style variants.
- Duplex generator with mirrored and stacked options.
- 4-plex generator with unit mix options.
- Web walkthrough pipeline from Blender exports to frontend viewer.

### Phase 3: Multifamily And Commercial (Weeks 9-14)
- Apartment complex massing and unit stack systems.
- Commercial shell templates (retail, office, mixed use).
- Trade package generation for MEP and structural coordination.
- Expanded lender and investor packet automation.

### Phase 4: Operations Integration (Weeks 15-20)
- Link BIM objects to accounting cost codes and procurement schedules.
- Connect draw schedules to construction milestones.
- Add revision audit trail and change-order tracking.
- Build QA dashboard for model completeness and package readiness.

## Acceptance Criteria
1. A user can generate each building type from structured inputs.
2. A lender packet can be produced without manual spreadsheet assembly.
3. A contractor receives dimensioned and trade-filtered deliverables.
4. Investor summaries update when model or cost assumptions change.
5. All custom objects pass metadata and export validation checks.

## Immediate Execution Backlog

### Sprint A
- Create BIM schema file and validator.
- Define naming and version conventions for components.
- Build first reusable window, door, wall families.
- Automate GLB plus walkthrough manifest export.

### Sprint B
- Implement residential template parameters.
- Connect template inputs to cost model placeholders.
- Generate first lender packet from a sample project.
- Publish first client presentation route in frontend.

### Sprint C
- Add trade layer filters and schedule exports.
- Add clash and completeness checks.
- Add investor scenario report generation.
- Add contractor scope bundle export.

## Governance
- Every generated package must include version, timestamp, and source model hash.
- Every financial output must list assumptions and confidence levels.
- Every compliance-sensitive output requires approval checkpoints.

## Recommended Next Implementation Target
Start with one fully automated end-to-end project:
USDA 1-bedroom house as the baseline template.

Then duplicate the pipeline for duplex, 4-plex, apartment, and commercial families.
