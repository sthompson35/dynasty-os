# Land + Build UW/DD Engine - Flowchart Integration Verification

## Platform Architecture Alignment

Based on the Dynasty PropertyOS Full Platform Flow diagram, the **LandBuild_UW_DDEngine** fits into the existing architecture as follows:

```
DYNASTY PROPERTYOS 6-STAGE FLOW
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. ACQUIRE     → 2. PLAN       → 3. FUND    → 4. BUILD  → 5. EXIT → 6. GROW │
│ Find it        Design it       Fund it      Execute it   List it    Scale it  │
│ Analyze it     Scope it        Secure it    Track it    Close it   Profit it  │
│ Win it         Budget it       Raise it     Control it  Profit it  Repeat it  │
└────────────────────────────────────────────────────────────────────────────────┘

LAND + BUILD UW/DD ENGINE ACTIVATION ZONES:
├─ STAGE 1 (ACQUIRE): ████████░░░ - BuyBox, OfferCalc, CampaignEngine
├─ STAGE 2 (PLAN):    ████████████ - PropertyInput, Scenarios, DDChecklist  ← PEAK
├─ STAGE 3 (FUND):    ██████░░░░░░ - Data flows to Capital Engine
└─ STAGES 4-6:        ██░░░░░░░░░░ - DD Checklist items in Operations
```

## Component Mapping

### 1. ACQUISITION ENGINE Integration

**Flowchart Components**: Leads & Sources, Seller CRM, Offers & Counteroffers, Offer Tracker, Comps & Valuations

**UW/DD Engine Contribution**:
```
    Leads/Sources → New Property Found
                        ↓
                   [BuyBoxEngine]
                   Score property against buy box criteria
                        ↓
                   Pass? → Proceed to Offer
                   Fail?  → Flag/Archive


    Comps & Valuations → Market Analysis
                              ↓
                     [PropertyInputEngine]
                     Validate ARV assumptions
                              ↓
                     [OfferCalculationEngine]
                     Calculate recommended offer price
                              ↓
                     Send offer via Offer Tracker
```

**API Endpoints Used**:
- `POST /api/land-build/buy-box-evaluate` → BuyBoxEngine
- `POST /api/land-build/offer-calculation` → OfferCalculationEngine

**Data Flow**:
```
Acquisition Engine sends:
├─ Property details (address, lot size, zoning)
├─ Comps data (for valuation)
└─ Purchase price range

UW/DD Engine returns:
├─ Buy box score (0-100)
├─ Recommended offer price
├─ Campaign assignment
└─ Deal viability flag
```

---

### 2. DEAL ANALYZER Integration

**Flowchart Components**: Flip/Hold/BRRRR Options, ARV Calculator, Repair Costs, ROI/ROE/CoC/IRR, Deal Score & Risk, Save Scenarios

**UW/DD Engine Relationship** (Complementary, not replacement):

```
STANDARD DEAL ANALYZER (for quick screening):
├─ Flip Scenario: 70% rule, quick ARV, standard repair
├─ Hold Scenario: Simple rental calc
├─ BRRRR Scenario: Basic refi calculation
├─ Outputs: Quick decision (5-10 seconds)
└─ Best for: Fast first-pass screening

                    ↓↓ For LAND+BUILD DEALS ↓↓

LAND + BUILD UW/DD ENGINE (specialized underwriting):
├─ [SaleScenarioEngine] Multiple sale scenarios
├─ [RentalBackstopEngine] Fallback rental analysis
├─ [ExitStrategyEngine] 6+ ranked exit strategies
├─ [RentalBackstopEngine] Cash flow projections
├─ [DDChecklistEngine] 20+ DD items (vs. risk factors only)
├─ Outputs: Deep analysis (2-5 minutes)
└─ Best for: Pre-LOI underwriting of complex land deals
```

**When to Use Each**:
```
User Flow Decision Tree:

Is this a Land + Build property?
├─ YES → Use LAND + BUILD UW/DD ENGINE (/engines/land-build)
│   └─ Complex scenarios, DD requirements, build costs
├─ NO → Use STANDARD DEAL ANALYZER (/engines/deals)
    └─ Quick flip/rental analysis
```

**API Endpoints**:
- `POST /api/land-build/analyze` → Comprehensive analysis
- `POST /api/land-build/exit-strategies` → Exit ranking
- `POST /api/land-build/sale-scenario` → Scenario modeling

---

### 3. LAND BUILDER Integration

**Flowchart Components**: Drag & Drop Site Plan, Lot Split Engine, Zoning & Setbacks, Density Calculator, Roads & Parking, Green Space

**UW/DD Engine Data Feed**:

```
PropertyInputEngine outputs:
├─ Lot size (acres)
├─ Zoning classification
├─ Current use
└─ Metadata (wetlands, flood zone, etc.)
    ↓
    Feed to LAND BUILDER for:
    ├─ Site plan optimization
    ├─ Density calculations
    ├─ Lot split scenarios
    ├─ Road/parking layout
    └─ Build cost refinement

    Output refinement → ExitStrategyEngine:
    ├─ Actual buildable square footage
    ├─ Unit count (for residential dev)
    ├─ Infrastructure costs
    └─ Timeline adjustment
```

**Data Exchange Points**:
- UW/DD sends: `PropertyInput` with zoning/lot size/restrictions
- Land Builder sends: Refined `BuildCostEstimate`, `TimelineAdjustment`, `ConstraintFlags`

---

### 4. OPERATIONS ENGINE Integration

**Flowchart Components**: Project Timeline, Task Management, Contractor Management, Milestones, Budget vs Actual

**UW/DD Engine Primary Feed Point**:

```
DDChecklistEngine creates task list:
├─ Title Review          → Task: Assign to Title Company
├─ Survey & Boundaries   → Task: Assign to Surveyor
├─ Zoning Review         → Task: Assign to Zoning Consultant
├─ Phase 1 ESA          → Task: Assign to Environmental Firm
├─ Permits              → Task: Assign to Permit Expediter
├─ Contractor Bids      → Task: Assign to GC/Contractors
├─ Architect/Engineer   → Task: Assign to A&E Firm
└─ ... (20+ items)
    ↓
    Transfer to OPERATIONS ENGINE as:
    ├─ Project Tasks (with due dates from timeline)
    ├─ Contractor Assignments
    ├─ Budget allocation
    └─ Risk flags

Operations Engine tracks:
├─ Task completion %
├─ Budget variance
├─ Milestone achievement
├─ Risk status
└─ Daily logs & updates
```

**API Flow**:
```
/api/land-build/dd-checklist → Create checklist
    ↓
/api/operations/tasks → Import as project tasks
    ↓
/api/operations/execution → Track completion
```

**Data Mapping**:
```
UW/DD Checklist Item:
{
  "item_id": "DD-PROP-001-006",
  "category": "Permits",
  "description": "Research building permit requirements",
  "status": "Not Started",
  "due_date": "2026-01-15",
  "responsible_party": "Permit Expediter"
}
    ↓ Converts to ↓
Operations Task:
{
  "task_id": "PROJ-001-T006",
  "description": "Research building permit requirements",
  "assigned_to": "Permit Expediter",
  "due_date": "2026-01-15",
  "category": "Permits",
  "status": "Not Started",
  "priority": "High"
}
```

---

### 5. CAPITAL ENGINE Integration

**Flowchart Components**: Capital Stack Builder, Loan & Lender CRM, Private Lenders, Equity Commitments, Term Sheets, Construction Loans

**UW/DD Engine Data Feed**:

```
SaleScenarioEngine outputs:
├─ Total project cost (purchase + build + carrying)
├─ Timeline (months to completion)
├─ Exit ARV
└─ Projected profit

    ↓ Flows to CAPITAL ENGINE for:

├─ Loan Amount Calculation
│  ├─ LTC (Loan-to-Cost) ratio
│  ├─ LTV (Loan-to-Value) ratio
│  └─ Required equity gap
│
├─ Financing Structure
│  ├─ Construction loan phase
│  ├─ Bridge financing
│  └─ Permanent financing (if rental)
│
└─ Investor Returns Modeling
   ├─ Cash-on-cash return
   ├─ IRR calculation
   └─ Distribution waterfall
```

**API Integration Points**:
```
UW/DD → /api/land-build/analyze
    Returns:
    {
      "total_project_cost": 750000,
      "timeline_months": 18,
      "exit_arv": 1200000,
      "projected_profit": 350000,
      "recommended_exit": "Flip"
    }

Capital Engine ← Receives data
    Uses for:
    • Loan amount calculation
    • Equity requirement
    • Term sheet generation
    • Investor commitment requests
```

---

### 6. PROPERTY RECORD (Single Source of Truth)

**Flowchart Center**: Property photo, address, purchase price, ARV, projected profit, tabs for Overview/Timeline/Notes/Tasks/Files/Team

**UW/DD Engine Data Stored Here**:

```
PropertyRecord contains:
├─ Purchase Price (from PropertyInputEngine)
├─ ARV (from PropertyInputEngine)
├─ Projected Profit (from SaleScenarioEngine)
├─ Recommended Strategy (from ExitStrategyEngine)
├─ Timeline (from ExitStrategy)
├─ Total Cost (from SaleScenarioEngine)
├─ DD Status (% complete from DDChecklistEngine)
├─ Build Cost (from PropertyInputEngine)
├─ Scenario Comparisons (all scenarios from analysis)
├─ Checklist Items (link to DDChecklistEngine tasks)
└─ Campaign Assignment (from CampaignEngine)

PROPERTY RECORD becomes the central hub
that all engines read from and update
```

---

### 7. INVESTOR PORTAL Integration

**Flowchart Components**: Public Deal Page, 3D Tour & Photos, Deal Summary, Financial Overview, Documents, Investor Commitments, Investor CRM

**UW/DD Engine Contribution**:

```
Investor sees on deal page:
├─ Property photos & 3D tour
├─ Deal Summary
│  ├─ Purchase: $X
│  ├─ Total Cost: $Y
│  ├─ ARV: $Z
│  ├─ Projected Profit: $P
│  └─ Timeline: X months
├─ Scenario Comparison
│  ├─ Sale Scenario: $profit
│  ├─ Rental Backstop: $$cash flow/yr
│  └─ Best Exit: [Flip/Dev/Hold]
├─ Risk Summary
│  ├─ DD Checklist: X% complete
│  ├─ Risk Level: MODERATE
│  └─ Key Issues: [flagged items]
├─ Financial Projections
│  ├─ Best Case ARV: $
│  ├─ Base Case ARV: $
│  ├─ Worst Case ARV: $
│  └─ IRR Range: X% - Y%
└─ Documents
   └─ [Underwriting Report, Site Plans, DD Checklist, etc.]
```

**Data API**:
```
/api/land-build/analyze → Comprehensive data
/api/land-build/metrics → Aggregated summary
/api/properties/{id}    → Property record
                         (pulls UW/DD data via link)
```

---

### 8. AI & AUTOMATION LAYER Integration

**Flowchart Layer**: AI Deal Assistant, AI Document Intelligence, AI Cost Assistant, AI Project Monitor

**UW/DD Engine Integration Points**:

```
AI DEAL ASSISTANT
├─ Input: PropertyInputEngine output
├─ AI Function: "Does this meet our investment thesis?"
└─ Output: Deal scoring recommendation


AI COST ASSISTANT
├─ Input: Build cost estimate + SaleScenarioEngine
├─ AI Function: "Are these costs realistic for this market?"
└─ Output: Cost validation flag + suggestions


AI PROJECT MONITOR
├─ Input: DDChecklistEngine tasks + timeline
├─ AI Function: "What risks should we watch?"
├─ Output: Risk alerts + suggestions


AI DOCUMENT INTELLIGENCE
├─ Input: DD Checklist items + uploaded docs
├─ AI Function: "Extract key data from permits/surveys"
└─ Output: Structured data → PropertyRecord
```

---

## Complete Data Flow Diagram

```
START: New Land+Build Property Acquired
    ↓
┌─────────────────────────────────┐
│ PropertyInputEngine             │
│ • Validate property data        │
│ • Standardize formats           │
│ • Flag issues                   │
└────────┬────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ BuyBoxEngine                    │
│ • Score against criteria        │
│ • Pass/Fail decision            │
└────────┬────────────────────────┘
         ↓
         Pass? → Proceed
         Fail? → Archive
         ↓
┌──────────────────────────────────────────┐
│ Parallel Analysis (8 engines)            │
├──────────────────────────────────────────┤
│ ├─ SaleScenarioEngine                    │
│ ├─ RentalBackstopEngine                  │
│ ├─ ExitStrategyEngine (RANKING)          │
│ ├─ OfferCalculationEngine                │
│ ├─ DDChecklistEngine (20+ ITEMS)         │
│ ├─ CampaignEngine                        │
│ └─ Metrics aggregation                   │
└────────┬─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ OUTPUT: Comprehensive Report    │
├─────────────────────────────────┤
│ ✓ Recommended Offer Price       │
│ ✓ Best Exit Strategy            │
│ ✓ Scenario Comparisons          │
│ ✓ DD Checklist (ready to work)  │
│ ✓ Timeline & Budget             │
│ ✓ Risk Assessment               │
└────────┬────────────────────────┘
         ↓
    DECISION POINT
    Accept Deal? → YES
                 → NO (Archive)
    ↓
┌─────────────────────────────────┐
│ Route Data to Downstream        │
├─────────────────────────────────┤
│ → DD Checklist → Operations     │
│ → Budget → Capital Engine       │
│ → Timeline → Project Timeline   │
│ → Site Details → Land Builder   │
│ → Deal Summary → Investor Portal│
│ → Property Data → Property Rec. │
└────────┬────────────────────────┘
         ↓
    PROJECT EXECUTION BEGINS
    (Feeds all 6-stage workflow)
```

---

## Integration Checklist

### Backend Integration ✅
- [x] `land_build_uw_dd_engine.py` created (8 sub-engines)
- [x] API router `land_build_uw_dd.py` created (/api/land-build/*)
- [x] Registered in `backend/app/main.py`
- [x] DealEngine modified to include `land_build_uw_dd` sub-engine
- [x] Optional initialization: `DealEngine(enable_land_build_uw_dd=True)`

### Frontend Integration ✅
- [x] Frontend page: `/engines/land-build/page.tsx`
- [x] Client component: `land-build-uw-dd-client.tsx`
- [x] Tabbed UI: Property Input → Scenarios → DD Checklist → Results
- [x] Forms for all data input
- [x] Results visualization

### API Endpoints ✅
```
✓ POST   /api/land-build/analyze
✓ POST   /api/land-build/sale-scenario
✓ POST   /api/land-build/rental-backstop
✓ POST   /api/land-build/exit-strategies
✓ POST   /api/land-build/dd-checklist
✓ GET    /api/land-build/dd-checklist/{property_id}
✓ POST   /api/land-build/dd-checklist-update
✓ POST   /api/land-build/buy-box-evaluate
✓ POST   /api/land-build/offer-calculation
✓ GET    /api/land-build/metrics
```

### Data Model Integration ✅
- [x] PropertyInput dataclass
- [x] SaleScenario dataclass
- [x] RentalBackstop dataclass
- [x] ExitStrategy models
- [x] DDChecklistItem dataclass
- [x] BuyBoxCriteria dataclass
- [x] Campaign dataclass
- [x] OfferCalculation dataclass

### System-Wide Integration Points ✅
- [x] Deal Engine: `analyze_land_build_deal()` method added
- [x] Property Record: Ready to store UW/DD outputs
- [x] Operations Engine: Ready to receive DD tasks
- [x] Capital Engine: Ready to receive budget/timeline
- [x] Investor Portal: Ready to display deal summaries
- [x] Land Builder: Ready to receive site planning data

---

## Deployment Ready

The Land + Build Underwriting & Due Diligence Engine is **fully integrated** into Dynasty PropertyOS and ready for:

1. ✅ **Production deployment** - All components complete
2. ✅ **Integration testing** - All API endpoints functional
3. ✅ **User workflow** - Portal at `/engines/land-build` accessible
4. ✅ **Data flow** - Feeds into all downstream systems
5. ✅ **Metrics collection** - Aggregated metrics available

### To Enable in Production:
```python
# In DealEngine initialization
deal_engine = DealEngine(enable_land_build_uw_dd=True)

# Or route specific deals:
deal_engine.analyze_land_build_deal(property_data)
```

### Feature Complete ✅
- 8 specialized sub-engines
- 10 API endpoints
- Comprehensive frontend
- Full data model
- System integration
- Documentation

---

## Architecture Summary

**LandBuild_UW_DDEngine** is a **specialized tactical sub-system** that:

1. **Enhances** the Deal Analyzer for Land+Build deals (doesn't replace)
2. **Feeds** Operations Engine with DD tasks
3. **Provides** Capital Engine with accurate budgets/timelines
4. **Powers** Investor Portal with detailed scenarios
5. **Integrates** with Land Builder for site planning
6. **Complements** the 6-stage Dynasty PropertyOS workflow

**Status**: 🟢 READY FOR PRODUCTION

