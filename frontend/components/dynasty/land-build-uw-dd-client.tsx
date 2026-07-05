'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { API_BASE_URL } from '@/lib/api'

interface PropertyInput {
  property_id: string
  address: string
  city: string
  state: string
  county: string
  zipcode: string
  property_type: string
  lot_size_acres: number
  zoning: string
  current_use: string
  purchase_price: number
  arv_land: number
  build_cost_estimate: number
  total_project_cost: number
  est_monthly_rent: number
  annual_taxes: number
  annual_insurance: number
  holding_months: number
  target_roi: number
  campaign_budget: number
  notes: string
}

interface ExitStrategyOption {
  strategy?: string
  timeline_months?: number
  estimated_profit?: number
  capital_required?: number
  risk_level?: string
}

interface SaleScenario {
  arv_sale?: number
  holding_months?: number
  projected_profit?: number
}

interface RentalBackstop {
  est_monthly_rent?: number
  annual_cash_flow?: number
  total_profit?: number
}

interface ExitStrategyResult {
  recommended_exit?: string
  exit_strategies?: ExitStrategyOption[]
}

interface OfferCalculation {
  recommended_purchase_price?: number
  projected_profit?: number
}

interface ChecklistItem {
  category?: string
  description?: string
}

interface DDChecklist {
  item_count?: number
  items?: ChecklistItem[]
}

interface BuyBoxEvaluation {
  match_score?: number
  meets_criteria?: boolean
  passed?: number
  total?: number
}

interface AnalysisResult {
  success: boolean
  address: string
  property_input: Record<string, unknown>
  sale_scenario: SaleScenario
  rental_backstop: RentalBackstop
  exit_strategy: ExitStrategyResult
  offer_calculation: OfferCalculation
  dd_checklist: DDChecklist
  buybox_evaluation?: BuyBoxEvaluation
}

export function LandBuildUWDDClient() {
  const [activeTab, setActiveTab] = useState('property-input')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const [propertyData, setPropertyData] = useState<PropertyInput>({
    property_id: '',
    address: '',
    city: '',
    state: 'CA',
    county: '',
    zipcode: '',
    property_type: 'Vacant Land',
    lot_size_acres: 0,
    zoning: '',
    current_use: '',
    purchase_price: 0,
    arv_land: 0,
    build_cost_estimate: 0,
    total_project_cost: 0,
    est_monthly_rent: 0,
    annual_taxes: 0,
    annual_insurance: 0,
    holding_months: 12,
    target_roi: 0.2,
    campaign_budget: 0,
    notes: '',
  })

  const handlePropertyInputChange = (field: keyof PropertyInput, value: string | number) => {
    setPropertyData(prev => ({ ...prev, [field]: value }))
  }

  const handleAnalyze = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const propertyId = propertyData.property_id?.trim() || buildPropertyId(propertyData)
      const totalProjectCost = propertyData.total_project_cost || propertyData.purchase_price + propertyData.build_cost_estimate
      const response = await fetch(`${API_BASE_URL}/api/land-build/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_input: {
            ...propertyData,
            property_id: propertyId,
            total_project_cost: totalProjectCost,
          },
          include_dd_checklist: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      const data = await response.json()
      setPropertyData(prev => ({ ...prev, property_id: propertyId, total_project_cost: totalProjectCost }))
      setResult(data)
      setActiveTab('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Land + Build Underwriting Engine
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          Workbook-aligned tactical engine for deal intake, buy box fit, exit laddering, DD, engine feeds, and scenario analysis.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-[#F8F7F2] p-1.5">
          <TabsTrigger value="property-input">Deal Intake</TabsTrigger>
          <TabsTrigger value="buy-box">Market Buy Box</TabsTrigger>
          <TabsTrigger value="exit-ladder">Exit Ladder</TabsTrigger>
          <TabsTrigger value="dd-checklist">Due Diligence</TabsTrigger>
          <TabsTrigger value="deal-feed">Deal Engine Feed</TabsTrigger>
          <TabsTrigger value="ops-feed">Ops Engine Feed</TabsTrigger>
          <TabsTrigger value="uw-inputs">Underwriting Inputs</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Analysis</TabsTrigger>
          <TabsTrigger value="results" disabled={!result}>Results</TabsTrigger>
        </TabsList>

        <TabsContent value="property-input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Property ID</label>
                  <Input
                    value={propertyData.property_id}
                    onChange={e => handlePropertyInputChange('property_id', e.target.value)}
                    placeholder="Auto-generated if blank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <Input
                    value={propertyData.address}
                    onChange={e => handlePropertyInputChange('address', e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <Input
                    value={propertyData.city}
                    onChange={e => handlePropertyInputChange('city', e.target.value)}
                    placeholder="Los Angeles"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <Input
                    value={propertyData.state}
                    onChange={e => handlePropertyInputChange('state', e.target.value)}
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">County</label>
                  <Input
                    value={propertyData.county}
                    onChange={e => handlePropertyInputChange('county', e.target.value)}
                    placeholder="Los Angeles County"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Zipcode</label>
                  <Input
                    value={propertyData.zipcode}
                    onChange={e => handlePropertyInputChange('zipcode', e.target.value)}
                    placeholder="90001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Property Type</label>
                  <Select value={propertyData.property_type} onValueChange={val => handlePropertyInputChange('property_type', val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vacant Land">Vacant Land</SelectItem>
                      <SelectItem value="Development Opportunity">Development Opportunity</SelectItem>
                      <SelectItem value="Fixer Upper">Fixer Upper</SelectItem>
                      <SelectItem value="Tear Down">Tear Down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold">Financial Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Lot Size (acres)</label>
                    <Input
                      type="number"
                      value={propertyData.lot_size_acres || ''}
                      onChange={e => handlePropertyInputChange('lot_size_acres', parseFloat(e.target.value) || 0)}
                      step="0.1"
                    />
                  </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Zoning</label>
                    <Input
                      value={propertyData.zoning}
                      onChange={e => handlePropertyInputChange('zoning', e.target.value)}
                      placeholder="R-1, C-2, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Use</label>
                    <Input
                      value={propertyData.current_use}
                      onChange={e => handlePropertyInputChange('current_use', e.target.value)}
                      placeholder="Vacant, pasture, infill lot..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Purchase Price ($)</label>
                    <Input
                      type="number"
                      value={propertyData.purchase_price || ''}
                      onChange={e => handlePropertyInputChange('purchase_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ARV (Land as-is) ($)</label>
                    <Input
                      type="number"
                      value={propertyData.arv_land || ''}
                      onChange={e => handlePropertyInputChange('arv_land', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Build Cost Estimate ($)</label>
                    <Input
                      type="number"
                      value={propertyData.build_cost_estimate || ''}
                      onChange={e => handlePropertyInputChange('build_cost_estimate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Project Cost ($)</label>
                    <Input
                      type="number"
                      value={propertyData.total_project_cost || ''}
                      onChange={e => handlePropertyInputChange('total_project_cost', parseFloat(e.target.value) || 0)}
                      placeholder={`${propertyData.purchase_price + propertyData.build_cost_estimate || 0}`}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <Button onClick={handleAnalyze} disabled={isLoading} className="w-full md:w-auto">
                  {isLoading ? 'Analyzing...' : 'Run Comprehensive Analysis'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buy-box" className="space-y-6">
          <BuyBoxPanel propertyData={propertyData} onChange={handlePropertyInputChange} result={result} />
        </TabsContent>

        <TabsContent value="exit-ladder" className="space-y-6">
          <ExitLadderPanel result={result} />
        </TabsContent>

        <TabsContent value="dd-checklist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Due Diligence Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              {result?.dd_checklist ? (
                <DDChecklistView checklist={result.dd_checklist} />
              ) : (
                <p className="text-sm text-gray-500">Run the analysis to generate title, zoning, environmental, utility, access, and contractor due diligence tasks.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deal-feed" className="space-y-6">
          <EngineFeedPanel
            title="Deal Engine Feed"
            description="Decision-ready fields pushed upstream into the Deal Engine."
            rows={[
              ['Property ID', propertyData.property_id || 'Generated on analysis'],
              ['Address', formatAddress(propertyData)],
              ['Purchase Price', money(propertyData.purchase_price)],
              ['ARV / Sale Value', money(propertyData.arv_land)],
              ['Build Cost', money(propertyData.build_cost_estimate)],
              ['Recommended Offer', money(result?.offer_calculation?.recommended_purchase_price)],
              ['Recommended Exit', result?.exit_strategy?.recommended_exit ?? 'Run analysis'],
            ]}
          />
        </TabsContent>

        <TabsContent value="ops-feed" className="space-y-6">
          <EngineFeedPanel
            title="Operations Engine Feed"
            description="Execution handoff fields for due diligence, permits, build scope, and project controls."
            rows={[
              ['County / State', [propertyData.county, propertyData.state].filter(Boolean).join(', ') || 'Not set'],
              ['Zoning', propertyData.zoning || 'Not set'],
              ['Current Use', propertyData.current_use || 'Not set'],
              ['DD Item Count', result?.dd_checklist?.item_count ?? 'Run analysis'],
              ['Estimated Build Cost', money(propertyData.build_cost_estimate)],
              ['Total Project Cost', money(propertyData.total_project_cost || propertyData.purchase_price + propertyData.build_cost_estimate)],
            ]}
          />
        </TabsContent>

        <TabsContent value="uw-inputs" className="space-y-6">
          <UnderwritingInputsPanel propertyData={propertyData} onChange={handlePropertyInputChange} />
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Complete property input first to analyze scenarios
              </p>
              {result ? (
                <ScenarioResults result={result} />
              ) : (
                <p className="text-sm text-gray-500">Enter property details and run analysis</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {result && <ComprehensiveResults result={result} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ScenarioResults({ result }: { result: AnalysisResult }) {
  const sale = result.sale_scenario
  const rental = result.rental_backstop
  const exits = result.exit_strategy

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sale Scenario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>ARV (Sale):</span>
              <span className="font-semibold">${sale.arv_sale?.toLocaleString() || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Holding Period:</span>
              <span className="font-semibold">{sale.holding_months} months</span>
            </div>
            <div className="flex justify-between">
              <span>Projected Profit:</span>
              <span className="font-semibold text-green-600">${sale.projected_profit?.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rental Backstop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Est. Monthly Rent:</span>
              <span className="font-semibold">${rental.est_monthly_rent?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Annual Cash Flow:</span>
              <span className="font-semibold">${rental.annual_cash_flow?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>5-Year Total Profit:</span>
              <span className="font-semibold text-green-600">${rental.total_profit?.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exit Strategies (Ranked)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exits?.exit_strategies?.map((exit: ExitStrategyOption, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded bg-gray-50 dark:bg-gray-900">
                <div>
                  <p className="font-semibold">{exit.strategy}</p>
                  <p className="text-sm text-gray-600">Timeline: {exit.timeline_months} months</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">${exit.estimated_profit?.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Risk: {exit.risk_level}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BuyBoxPanel({
  propertyData,
  onChange,
  result,
}: {
  propertyData: PropertyInput
  onChange: (field: keyof PropertyInput, value: string | number) => void
  result: AnalysisResult | null
}) {
  const purchaseToArv = propertyData.arv_land ? propertyData.purchase_price / propertyData.arv_land : 0
  const buildToArv = propertyData.arv_land ? propertyData.build_cost_estimate / propertyData.arv_land : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Buy Box</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricTile label="Lot Size" value={`${propertyData.lot_size_acres || 0} ac`} />
          <MetricTile label="Purchase / ARV" value={percent(purchaseToArv)} />
          <MetricTile label="Build / ARV" value={percent(buildToArv)} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Target ROI</label>
            <Input
              type="number"
              value={propertyData.target_roi}
              onChange={e => onChange('target_roi', parseFloat(e.target.value) || 0)}
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Campaign Budget ($)</label>
            <Input
              type="number"
              value={propertyData.campaign_budget || ''}
              onChange={e => onChange('campaign_budget', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        {result?.buybox_evaluation ? (
          <EngineFeedPanel
            title="Buy Box Result"
            description="Criteria result returned by the underwriting engine."
            rows={[
              ['Match Score', `${result.buybox_evaluation.match_score}%`],
              ['Meets Criteria', result.buybox_evaluation.meets_criteria ? 'Yes' : 'No'],
              ['Checks Passed', `${result.buybox_evaluation.passed} / ${result.buybox_evaluation.total}`],
            ]}
          />
        ) : (
          <p className="text-sm text-gray-500">Run analysis to evaluate the parcel against the active market buy box.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ExitLadderPanel({ result }: { result: AnalysisResult | null }) {
  const exits = result?.exit_strategy?.exit_strategies ?? []
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exit Ladder</CardTitle>
      </CardHeader>
      <CardContent>
        {exits.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[var(--dynasty-black)]/60">
                  <th className="py-2 pr-3">Rank</th>
                  <th className="py-2 pr-3">Strategy</th>
                  <th className="py-2 pr-3 text-right">Profit</th>
                  <th className="py-2 pr-3 text-right">Capital Required</th>
                  <th className="py-2 pr-3">Timeline</th>
                  <th className="py-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {exits.map((exit: ExitStrategyOption, index: number) => (
                  <tr key={`${exit.strategy}-${index}`} className="border-b last:border-0">
                    <td className="py-3 pr-3 font-bold">{index + 1}</td>
                    <td className="py-3 pr-3">{exit.strategy}</td>
                    <td className="py-3 pr-3 text-right font-semibold">{money(exit.estimated_profit)}</td>
                    <td className="py-3 pr-3 text-right">{money(exit.capital_required)}</td>
                    <td className="py-3 pr-3">{exit.timeline_months} mo</td>
                    <td className="py-3">{exit.risk_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Run analysis to rank wholesale, flip, rental, development, and hold exits.</p>
        )}
      </CardContent>
    </Card>
  )
}

function UnderwritingInputsPanel({
  propertyData,
  onChange,
}: {
  propertyData: PropertyInput
  onChange: (field: keyof PropertyInput, value: string | number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Underwriting Inputs</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-2">Estimated Monthly Rent ($)</label>
          <Input
            type="number"
            value={propertyData.est_monthly_rent || ''}
            onChange={e => onChange('est_monthly_rent', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Annual Taxes ($)</label>
          <Input
            type="number"
            value={propertyData.annual_taxes || ''}
            onChange={e => onChange('annual_taxes', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Annual Insurance ($)</label>
          <Input
            type="number"
            value={propertyData.annual_insurance || ''}
            onChange={e => onChange('annual_insurance', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Holding Months</label>
          <Input
            type="number"
            value={propertyData.holding_months || ''}
            onChange={e => onChange('holding_months', parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Notes</label>
          <Input
            value={propertyData.notes}
            onChange={e => onChange('notes', e.target.value)}
            placeholder="Entitlement risk, utility notes, access, seller constraints..."
          />
        </div>
      </CardContent>
    </Card>
  )
}

function EngineFeedPanel({
  title,
  description,
  rows,
}: {
  title: string
  description: string
  rows: [string, string | number][]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        <div className="overflow-hidden rounded-lg border">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(150px,0.8fr)_1fr] border-b last:border-0">
              <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600">{label}</div>
              <div className="px-3 py-2 text-sm font-semibold">{value ?? 'Not set'}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--dynasty-navy)]">{value}</p>
    </div>
  )
}

function DDChecklistView({ checklist }: { checklist: DDChecklist }) {
  const items = checklist.items || []
  const categories = new Map<string, ChecklistItem[]>()

  items.forEach((item: ChecklistItem) => {
    const category = item.category ?? 'Other'
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)!.push(item)
  })

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  function toggleItem(key: string) {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {Array.from(categories.entries()).map(([category, categoryItems]) => (
        <div key={category}>
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">{category}</h4>
          <div className="space-y-2">
            {categoryItems.map((item: ChecklistItem, idx: number) => {
              const key = `${category}-${idx}-${item.description ?? ''}`
              const checked = checkedItems.has(key)
              return (
                <div key={idx} className="flex items-start space-x-3 p-2 border rounded">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={() => toggleItem(key)}
                  />
                  <div className="flex-1">
                    <p className={`text-sm ${checked ? 'text-gray-400 line-through' : ''}`}>{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function buildPropertyId(input: PropertyInput): string {
  const base = [input.address, input.city, input.state]
    .filter(Boolean)
    .join('-')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base ? `LB-${base.slice(0, 28)}` : `LB-${Date.now()}`
}

function formatAddress(input: PropertyInput): string {
  return [input.address, input.city, input.state, input.zipcode].filter(Boolean).join(', ') || 'Not set'
}

function money(value: unknown): string {
  const numeric = Number(value ?? 0)
  return `$${Math.round(numeric).toLocaleString()}`
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function ComprehensiveResults({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6">
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="text-green-800 dark:text-green-200">Analysis Complete</CardTitle>
        </CardHeader>
        <CardContent className="text-green-700 dark:text-green-300">
          <p>{result.address}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommended Purchase Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">${result.offer_calculation?.recommended_purchase_price?.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-2">Profit Target: ${result.offer_calculation?.projected_profit?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommended Exit Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{result.exit_strategy?.recommended_exit}</p>
            <p className="text-sm text-gray-600 mt-2">Est. Profit: ${result.exit_strategy?.exit_strategies?.[0]?.estimated_profit?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">DD Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{result.dd_checklist?.item_count} Items</p>
            <p className="text-sm text-gray-600 mt-2">Ready to assign to team</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
