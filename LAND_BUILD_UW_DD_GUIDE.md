# Land + Build Deal Underwriting & Due Diligence Sub-Engine

## Overview

The **LandBuild_UW_DDEngine** is a specialized tactical sub-system designed to provide comprehensive Land + Build deal analysis, scenario modeling, and due diligence management. It is NOT the main Dynasty OS command layer, but rather a focused module that plugs into the **Deal Engine** and **Operations Engine** as a sub-component.

## Architecture

```
Dynasty PropertyOS
├── Deal Engine (9 sub-systems)
│   ├── IntakeEngine
│   ├── AcquisitionEngine
│   ├── StrategyEngine
│   ├── FinancingEngine
│   ├── RiskEngine
│   ├── StressTestEngine
│   ├── ExitEngine
│   ├── InvestorEngine
│   ├── KillSwitchEngine
│   └── 🆕 LandBuild_UW_DDEngine ← NEW SUB-ENGINE
│
└── Operations Engine (10 sub-systems)
    ├── ProjectIntakeEngine
    ├── PlanningEngine
    ├── ResourceEngine
    ├── ProcurementEngine
    ├── ExecutionEngine
    ├── QualityEngine
    ├── FinancialControlEngine
    ├── RiskManagementEngine
    ├── ReportingEngine
    └── CloseoutEngine
```

## Sub-Engines

The LandBuild_UW_DDEngine consists of 8 specialized sub-modules:

### 1. PropertyInputEngine
- **Purpose**: Validates and standardizes incoming property data
- **Required Fields**: property_id, address, city, state, purchase_price, arv_land
- **Output**: Validation result with missing fields report

### 2. SaleScenarioEngine
- **Purpose**: Models sale scenarios and calculates financial projections
- **Inputs**: ARV, purchase price, holding period, carrying costs
- **Output**: Projected profit, ROI, holding costs analysis

### 3. RentalBackstopEngine
- **Purpose**: Models rental backstop scenarios (fallback if sale fails)
- **Inputs**: Monthly rent, taxes, insurance, holding years
- **Output**: Annual cash flow, 5-year profit projection, equity at exit

### 4. ExitStrategyEngine
- **Purpose**: Ranks all exit strategies by projected profit
- **Strategies**: Wholesale, Flip, Development, Rental, BRRRR, Land Hold
- **Output**: Ranked exit strategies with profit/ROI/timeline/risk

### 5. DDChecklistEngine
- **Purpose**: Manages due diligence checklists with 20+ standard categories
- **Categories**: Title Review, Zoning, Environmental, Phase 1 ESA, Utilities, Permits, etc.
- **Output**: Categorized checklists, completion tracking, status summaries

### 6. BuyBoxEngine
- **Purpose**: Evaluates properties against buy box criteria
- **Criteria**: Lot size, ARV, purchase price, zoning, ROI targets
- **Output**: Match score (0-100), pass/fail determination

### 7. CampaignEngine
- **Purpose**: Manages acquisition/marketing campaigns
- **Tracking**: Leads generated, deals closed, spend/ROI
- **Output**: Campaign metrics and performance analysis

### 8. OfferCalculationEngine
- **Purpose**: Calculates maximum allowable offer (MAO) for Land + Build deals
- **Inputs**: ARV, repair costs, exit strategy, target ROI
- **Output**: Recommended purchase price, profit targets, holding costs

## Integration Points

### 1. Deal Engine Integration
```python
# In dynasty_os/engines/deal_engine/__init__.py
from dynasty_os.engines.land_build_uw_dd_engine import LandBuild_UW_DDEngine

class DealEngine:
    def __init__(self, enable_land_build_uw_dd: bool = True):
        # ... existing 9 engines ...
        if enable_land_build_uw_dd:
            self.land_build_uw_dd = LandBuild_UW_DDEngine()
    
    def analyze_land_build_deal(self, property_data, buybox_criteria=None):
        """Route to LandBuild_UW_DDEngine for Land+Build analysis"""
        return self.land_build_uw_dd.analyze_land_build_deal(property_data, buybox_criteria)
```

### 2. Operations Engine Integration
- The sub-engine can interface with Operations Engine for project planning
- Once a deal is approved, project details flow to Operations for construction oversight

### 3. API Routes
All functionality exposed via `/api/land-build/*` endpoints:

```
POST   /api/land-build/analyze                  - Comprehensive deal analysis
POST   /api/land-build/sale-scenario            - Sale scenario modeling
POST   /api/land-build/rental-backstop          - Rental backstop calculation
POST   /api/land-build/exit-strategies          - Exit strategy ranking
POST   /api/land-build/dd-checklist             - Create DD checklist
GET    /api/land-build/dd-checklist/{property_id}  - Get checklist summary
POST   /api/land-build/dd-checklist-update      - Update checklist item
POST   /api/land-build/buy-box-evaluate         - Evaluate against buy box
POST   /api/land-build/offer-calculation        - Calculate recommended offer
GET    /api/land-build/metrics                  - Get aggregated metrics
```

## Data Models

### PropertyInput
```python
@dataclass
class PropertyInput:
    property_id: str
    address: str
    city: str
    state: str
    county: str
    zipcode: str
    property_type: str  # "Vacant Land" | "Development Opportunity" | "Fixer Upper" | "Tear Down"
    lot_size_acres: float
    zoning: str
    current_use: str
    purchase_price: float
    arv_land: float
    build_cost_estimate: float
    total_project_cost: float
    market_analysis_date: str
    notes: str
    metadata: dict
```

### SaleScenario
```python
@dataclass
class SaleScenario:
    scenario_id: str
    property_id: str
    name: str  # "Base Case", "Optimistic", etc.
    arv_sale: float
    holding_period_months: int
    carrying_cost_monthly: float
    selling_costs_pct: float  # typically 0.12 (12%)
    projected_profit: float
    projected_roi: float
```

### ExitStrategy
Ranked by profit:
- **Wholesale**: Quick flip, low capital, low risk
- **Flip**: 3-6 months, moderate capital/risk
- **Development**: 12-36 months, highest capital/risk, highest profit potential
- **Rental**: Long-term cash flow, low risk
- **BRRRR**: Refinance & keep, 6-12 months
- **Land Hold**: Pure appreciation

## Usage Examples

### Example 1: Comprehensive Analysis
```python
from dynasty_os.engines.land_build_uw_dd_engine import LandBuild_UW_DDEngine, BuyBoxCriteria

engine = LandBuild_UW_DDEngine()

property_input = {
    "property_id": "PROP-001",
    "address": "123 Main St",
    "city": "Phoenix",
    "state": "AZ",
    "county": "Maricopa",
    "zipcode": "85001",
    "property_type": "Vacant Land",
    "lot_size_acres": 2.5,
    "zoning": "R-3",
    "purchase_price": 250000,
    "arv_land": 400000,
    "build_cost_estimate": 350000,
}

buybox = BuyBoxCriteria(
    buybox_id="BB-001",
    property_type="Vacant Land",
    min_lot_size=1.0,
    max_lot_size=10.0,
    min_arv=200000,
    max_purchase_price=500000,
    target_roi=0.20,
)

result = engine.analyze_land_build_deal(property_input, buybox)
```

### Example 2: Quick Offer Calculation
```python
engine = OfferCalculationEngine()

offer = engine.calculate_offer(
    property_id="PROP-001",
    arv=400000,
    repair_cost=350000,
    exit_strategy="Flip",
    target_roi=0.20,
    holding_months=6
)

print(f"Recommended Offer: ${offer['recommended_purchase_price']}")
# Output: Recommended Offer: $165000
```

### Example 3: Exit Strategy Comparison
```python
engine = ExitStrategyEngine()

result = engine.process(
    property_id="PROP-001",
    purchase_price=250000,
    arv=400000,
    build_cost=350000,
    monthly_rent=2000
)

for strategy in result['exit_strategies']:
    print(f"{strategy['strategy']}: ${strategy['estimated_profit']:,.0f}")
```

## Workbook Mapping

The specialized workbook (`serious_tactical_workbook.xlsx`) maps to the sub-engines as follows:

| Workbook Sheet | Sub-Engine | Purpose |
|---|---|---|
| 01_Inputs | PropertyInputEngine | Property data capture |
| 02_Scenarios_Sale | SaleScenarioEngine | Sale scenario modeling |
| 03_Rental_Backstop | RentalBackstopEngine | Rental fallback scenarios |
| 04_Exit_Ladder | ExitStrategyEngine | Exit strategy ranking |
| 05_Team_Contacts | TeamContactsEngine | Team member tracking |
| 06_DD_Checklist | DDChecklistEngine | Due diligence tasks |
| 07_Buy_Box | BuyBoxEngine | Buy box criteria |
| 08_Campaigns | CampaignEngine | Campaign tracking |
| 10_Offer_Calc | OfferCalculationEngine | Offer pricing |

## Frontend Portal

The Land + Build Underwriting Portal (`/engines/land-build`) provides a tabbed interface:

1. **Property Input Tab**: Enter property details, financials
2. **Scenarios Tab**: View sale/rental scenarios, exit strategies
3. **DD Checklist Tab**: Track due diligence items by category
4. **Results Tab**: Comprehensive analysis summary with offer price, recommended strategy

## Key Differences from Main Deal Engine

| Aspect | Deal Engine | LandBuild_UW_DDEngine |
|---|---|---|
| Focus | General property deals (any type) | Land + Build specifically |
| Scenarios | Basic (flip, rental, wholesale) | Comprehensive (6+ strategies) |
| DD | Risk-based | Comprehensive checklist |
| Buy Box | Simple threshold checks | Detailed criteria matching |
| Duration | Quick analysis | Detailed underwriting |

## Integration with Operations Engine

Once a Land + Build deal is approved via LandBuild_UW_DDEngine:

1. Project data flows to Operations Engine
2. DD checklist items become project tasks
3. Build cost estimate becomes project budget
4. Timeline from exit strategy becomes project timeline
5. Team assignments from campaign data

## Metrics & Reporting

### Sub-Engine Metrics
```python
engine.get_metrics() → {
    "property_input": {...},
    "sale_scenario": {...},
    "rental_backstop": {...},
    "exit_strategy": {...},
    "dd_checklist": {...},
    "buy_box": {...},
    "campaign": {...},
    "offer_calc": {...},
}
```

### Deal Engine Integration
```python
deal_engine = DealEngine()
# Now includes land_build_uw_dd metrics
metrics = deal_engine.get_metrics()
```

## Deployment

### Backend
1. Module: `dynasty_os/engines/land_build_uw_dd_engine.py`
2. API Router: `backend/app/api/land_build_uw_dd.py`
3. Route registered in: `backend/app/main.py`

### Frontend
1. Page: `frontend/app/engines/land-build/page.tsx`
2. Client Component: `frontend/components/dynasty/land-build-uw-dd-client.tsx`

## Performance Characteristics

- **Comprehensive Analysis**: ~50-100ms (8 sub-engines)
- **Individual Sub-Engine**: ~5-20ms
- **DD Checklist Creation**: ~20-30ms (20+ items)
- **Metrics Aggregation**: ~30-50ms

## Future Enhancements

1. **Market Data Integration**: Auto-populate comps, market analysis
2. **Permit Research**: Auto-check permit requirements by jurisdiction
3. **Environmental Analysis**: Auto-flag environmental risks
4. **Team Suggestions**: ML-based contractor/team recommendations
5. **Scenario Comparison**: Side-by-side scenario analysis
6. **PDF Reporting**: Generate formal underwriting reports
7. **Historical Tracking**: Compare deal to historical performance
8. **Monte Carlo Simulation**: Advanced risk modeling

## Support & Troubleshooting

### Common Issues

1. **Missing Required Fields**
   - Ensure all PropertyInput required fields are populated
   - Check API response for `missing_fields` array

2. **ARV Calculations Off**
   - Verify purchase_price, arv_land, build_cost are realistic
   - Compare to market comps

3. **No Viable Exit Strategy**
   - If all strategies show negative profit, reconsider purchase price
   - Check ARV assumptions

### Enabling/Disabling

```python
# Enable with Deal Engine
deal_engine = DealEngine(enable_land_build_uw_dd=True)

# Disable if not needed
deal_engine = DealEngine(enable_land_build_uw_dd=False)
```

## License & Attribution

Part of Dynasty PropertyOS v0.3.0+. Built as a tactical sub-system for specialized Land + Build underwriting workflows.
