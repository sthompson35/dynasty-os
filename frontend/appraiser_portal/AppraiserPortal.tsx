'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Comparable = {
  id: string;
  address: string;
  salePrice: number;
  sqft: number;
  beds: number;
  baths: number;
  conditionAdj: number;
  locationAdj: number;
  timeAdj: number;
  otherAdj: number;
};

type ConditionEvidence = {
  id: string;
  room: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  notes: string;
  photoUrl: string;
  capturedAt: string;
};

type NumberInputProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

function NumberInput({ value, onChange, min, max, step = 1 }: NumberInputProps) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      style={{
        width: '100%',
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        padding: '8px 10px',
        fontSize: 14,
        color: '#0f172a',
        background: '#ffffff'
      }}
    />
  );
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function percent(value: number) {
  return `${value.toFixed(2)}%`;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

const defaultComps: Comparable[] = [
  {
    id: 'comp-1',
    address: '103 Hillcrest Ave',
    salePrice: 289000,
    sqft: 1210,
    beds: 3,
    baths: 2,
    conditionAdj: 8000,
    locationAdj: 5000,
    timeAdj: 3500,
    otherAdj: 0
  },
  {
    id: 'comp-2',
    address: '77 Pine Hollow Dr',
    salePrice: 301000,
    sqft: 1285,
    beds: 3,
    baths: 2,
    conditionAdj: -5000,
    locationAdj: 2000,
    timeAdj: 2500,
    otherAdj: -1500
  },
  {
    id: 'comp-3',
    address: '14 Brookline Ct',
    salePrice: 276000,
    sqft: 1160,
    beds: 2,
    baths: 2,
    conditionAdj: 10000,
    locationAdj: 1500,
    timeAdj: 3000,
    otherAdj: 0
  }
];

export default function AppraiserPortal() {
  const [subjectAddress, setSubjectAddress] = useState('101 Verification Way');
  const [subjectSqft, setSubjectSqft] = useState(1200);
  const [comps, setComps] = useState<Comparable[]>(defaultComps);
  const [evidenceItems, setEvidenceItems] = useState<ConditionEvidence[]>([]);

  const [draftRoom, setDraftRoom] = useState('Kitchen');
  const [draftCondition, setDraftCondition] = useState<ConditionEvidence['condition']>('Good');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftPhotoUrl, setDraftPhotoUrl] = useState('');

  const [replacementCost, setReplacementCost] = useState(235000);
  const [depreciationPct, setDepreciationPct] = useState(12);
  const [landValue, setLandValue] = useState(58000);

  const [marketRent, setMarketRent] = useState(2350);
  const [vacancyPct, setVacancyPct] = useState(6);
  const [operatingExpensesAnnual, setOperatingExpensesAnnual] = useState(9200);
  const [capRatePct, setCapRatePct] = useState(6.75);

  const [weightMarket, setWeightMarket] = useState(50);
  const [weightCost, setWeightCost] = useState(30);
  const [weightIncome, setWeightIncome] = useState(20);

  const compRows = useMemo(() => {
    return comps.map((comp) => {
      const totalAdj = comp.conditionAdj + comp.locationAdj + comp.timeAdj + comp.otherAdj;
      const adjustedSalePrice = comp.salePrice + totalAdj;
      const adjustedPsf = comp.sqft > 0 ? adjustedSalePrice / comp.sqft : 0;
      return {
        ...comp,
        totalAdj,
        adjustedSalePrice,
        adjustedPsf
      };
    });
  }, [comps]);

  const marketApproachValue = useMemo(() => {
    if (compRows.length === 0) return 0;
    const avgAdjustedPsf = compRows.reduce((sum, row) => sum + row.adjustedPsf, 0) / compRows.length;
    return avgAdjustedPsf * subjectSqft;
  }, [compRows, subjectSqft]);

  const costApproachValue = useMemo(() => {
    const depreciatedImprovement = replacementCost * (1 - depreciationPct / 100);
    return Math.max(0, depreciatedImprovement) + landValue;
  }, [replacementCost, depreciationPct, landValue]);

  const incomeApproachValue = useMemo(() => {
    if (capRatePct <= 0) return 0;
    const effectiveRentAnnual = marketRent * 12 * (1 - vacancyPct / 100);
    const noi = effectiveRentAnnual - operatingExpensesAnnual;
    if (noi <= 0) return 0;
    return noi / (capRatePct / 100);
  }, [marketRent, vacancyPct, operatingExpensesAnnual, capRatePct]);

  const reconciledValue = useMemo(() => {
    const safeWeightMarket = Math.max(0, weightMarket);
    const safeWeightCost = Math.max(0, weightCost);
    const safeWeightIncome = Math.max(0, weightIncome);
    const totalWeight = safeWeightMarket + safeWeightCost + safeWeightIncome;
    if (totalWeight <= 0) return 0;

    return (
      (marketApproachValue * safeWeightMarket + costApproachValue * safeWeightCost + incomeApproachValue * safeWeightIncome) /
      totalWeight
    );
  }, [weightMarket, weightCost, weightIncome, marketApproachValue, costApproachValue, incomeApproachValue]);

  function updateComp(compId: string, patch: Partial<Comparable>) {
    setComps((prev) => prev.map((comp) => (comp.id === compId ? { ...comp, ...patch } : comp)));
  }

  function addComparable() {
    setComps((prev) => [
      ...prev,
      {
        id: makeId('comp'),
        address: 'New Comparable',
        salePrice: 0,
        sqft: 0,
        beds: 0,
        baths: 0,
        conditionAdj: 0,
        locationAdj: 0,
        timeAdj: 0,
        otherAdj: 0
      }
    ]);
  }

  function removeComparable(compId: string) {
    setComps((prev) => prev.filter((comp) => comp.id !== compId));
  }

  function addEvidence() {
    const trimmedNotes = draftNotes.trim();
    if (!trimmedNotes) return;

    const newEvidence: ConditionEvidence = {
      id: makeId('evidence'),
      room: draftRoom,
      condition: draftCondition,
      notes: trimmedNotes,
      photoUrl: draftPhotoUrl.trim(),
      capturedAt: new Date().toISOString()
    };

    setEvidenceItems((prev) => [newEvidence, ...prev]);
    setDraftNotes('');
    setDraftPhotoUrl('');
  }

  function removeEvidence(evidenceId: string) {
    setEvidenceItems((prev) => prev.filter((item) => item.id !== evidenceId));
  }

  function exportReportPacket() {
    const payload = {
      generatedAt: new Date().toISOString(),
      subject: {
        address: subjectAddress,
        sqft: subjectSqft
      },
      comparables: compRows,
      conditionEvidence: evidenceItems,
      valuation: {
        marketApproachValue,
        costApproachValue,
        incomeApproachValue,
        weights: {
          market: weightMarket,
          cost: weightCost,
          income: weightIncome
        },
        reconciledValue
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `appraisal-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <main
      style={{
        minBlockSize: 'calc(100vh - 70px)',
        padding: '26px 18px 40px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 55%, #ecfeff 100%)',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
      }}
    >
      <section style={{ maxInlineSize: 1200, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>Appraiser Portal</h1>
        <p style={{ marginTop: 8, color: '#334155', maxInlineSize: 940 }}>
          Workflow center for comparable analysis, valuation support, condition snapshots, and report assembly tied to the property digital twin.
        </p>

        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href="/walkthrough"
            style={{
              textDecoration: 'none',
              border: '1px solid #93c5fd',
              borderRadius: 999,
              background: '#dbeafe',
              color: '#1e3a8a',
              padding: '8px 12px',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            Open walkthrough for evidence capture
          </Link>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 14, padding: 14, background: '#ffffff' }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Subject property</h2>
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 13, color: '#334155' }}>Address</label>
              <input
                value={subjectAddress}
                onChange={(event) => setSubjectAddress(event.target.value)}
                style={{
                  width: '100%',
                  marginTop: 4,
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontSize: 14
                }}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 13, color: '#334155' }}>Gross living area (sqft)</label>
              <div style={{ marginTop: 4 }}>
                <NumberInput value={subjectSqft} onChange={setSubjectSqft} min={0} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid #cbd5e1', borderRadius: 14, padding: 14, background: '#ffffff' }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Reconciled value</h2>
            <p style={{ margin: '10px 0 0', fontSize: 30, fontWeight: 800, color: '#1d4ed8' }}>{currency(reconciledValue)}</p>
            <p style={{ margin: '8px 0 0', color: '#475569' }}>Market: {currency(marketApproachValue)}</p>
            <p style={{ margin: '4px 0 0', color: '#475569' }}>Cost: {currency(costApproachValue)}</p>
            <p style={{ margin: '4px 0 0', color: '#475569' }}>Income: {currency(incomeApproachValue)}</p>
            <button
              type="button"
              onClick={exportReportPacket}
              style={{
                marginTop: 12,
                border: '1px solid #1d4ed8',
                borderRadius: 10,
                padding: '8px 12px',
                background: '#1d4ed8',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Export report packet (JSON)
            </button>
          </div>
        </div>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Comparable sales review and adjustments</h2>
            <button
              type="button"
              onClick={addComparable}
              style={{
                border: '1px solid #0ea5e9',
                borderRadius: 10,
                padding: '8px 12px',
                background: '#e0f2fe',
                color: '#0c4a6e',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Add comparable
            </button>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {[
                    'Address',
                    'Sale Price',
                    'Sqft',
                    'Beds',
                    'Baths',
                    'Cond Adj',
                    'Loc Adj',
                    'Time Adj',
                    'Other Adj',
                    'Adjusted',
                    'Adj $/Sqft',
                    'Actions'
                  ].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                      <input
                        value={row.address}
                        onChange={(event) => updateComp(row.id, { address: event.target.value })}
                        style={{ width: 180, border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' }}
                      />
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 110 }}><NumberInput value={row.salePrice} onChange={(value) => updateComp(row.id, { salePrice: value })} /></td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 90 }}><NumberInput value={row.sqft} onChange={(value) => updateComp(row.id, { sqft: value })} /></td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 70 }}><NumberInput value={row.beds} onChange={(value) => updateComp(row.id, { beds: value })} /></td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 70 }}><NumberInput value={row.baths} onChange={(value) => updateComp(row.id, { baths: value })} step={0.5} /></td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 100 }}><NumberInput value={row.conditionAdj} onChange={(value) => updateComp(row.id, { conditionAdj: value })} /></td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 100 }}><NumberInput value={row.locationAdj} onChange={(value) => updateComp(row.id, { locationAdj: value })} /></td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 100 }}><NumberInput value={row.timeAdj} onChange={(value) => updateComp(row.id, { timeAdj: value })} /></td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 100 }}><NumberInput value={row.otherAdj} onChange={(value) => updateComp(row.id, { otherAdj: value })} /></td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f172a' }}>{currency(row.adjustedSalePrice)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f172a' }}>{currency(row.adjustedPsf)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                      <button
                        type="button"
                        onClick={() => removeComparable(row.id)}
                        style={{ border: '1px solid #fda4af', borderRadius: 8, padding: '6px 8px', background: '#fff1f2', color: '#be123c', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Condition evidence capture from walkthrough</h2>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, color: '#334155' }}>Room / Area</label>
              <input
                value={draftRoom}
                onChange={(event) => setDraftRoom(event.target.value)}
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#334155' }}>Condition</label>
              <select
                value={draftCondition}
                onChange={(event) => setDraftCondition(event.target.value as ConditionEvidence['condition'])}
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', background: '#ffffff' }}
              >
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Poor</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#334155' }}>Photo URL (optional)</label>
              <input
                value={draftPhotoUrl}
                onChange={(event) => setDraftPhotoUrl(event.target.value)}
                placeholder="https://..."
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 13, color: '#334155' }}>Notes</label>
              <textarea
                value={draftNotes}
                onChange={(event) => setDraftNotes(event.target.value)}
                placeholder="Observed condition details, deferred maintenance, quality notes..."
                rows={3}
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', resize: 'vertical' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addEvidence}
            style={{
              marginTop: 10,
              border: '1px solid #0f766e',
              borderRadius: 10,
              padding: '8px 12px',
              background: '#ccfbf1',
              color: '#134e4a',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Add condition evidence
          </button>

          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {evidenceItems.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b' }}>No condition evidence captured yet.</p>
            ) : (
              evidenceItems.map((item) => (
                <article key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{item.room}</p>
                      <p style={{ margin: '4px 0 0', color: '#334155', fontSize: 13 }}>Condition: {item.condition}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEvidence(item.id)}
                      style={{ border: '1px solid #fda4af', borderRadius: 8, padding: '6px 8px', background: '#fff1f2', color: '#be123c', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                  <p style={{ margin: '8px 0 0', color: '#334155' }}>{item.notes}</p>
                  {item.photoUrl ? (
                    <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                      Photo: <a href={item.photoUrl} target="_blank" rel="noreferrer">{item.photoUrl}</a>
                    </p>
                  ) : null}
                  <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 12 }}>
                    Captured: {new Date(item.capturedAt).toLocaleString()}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Value approach comparison</h2>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Market approach</h3>
              <p style={{ margin: '8px 0 0', color: '#334155', fontSize: 14 }}>Computed from average adjusted comparable $/sqft.</p>
              <p style={{ margin: '8px 0 0', fontWeight: 700, color: '#0f172a' }}>{currency(marketApproachValue)}</p>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Weight (%)</label>
              <div style={{ marginTop: 4 }}><NumberInput value={weightMarket} onChange={setWeightMarket} min={0} max={100} step={1} /></div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Cost approach</h3>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Replacement cost new</label>
              <div style={{ marginTop: 4 }}><NumberInput value={replacementCost} onChange={setReplacementCost} min={0} /></div>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Depreciation (%)</label>
              <div style={{ marginTop: 4 }}><NumberInput value={depreciationPct} onChange={setDepreciationPct} min={0} max={100} step={0.25} /></div>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Land value</label>
              <div style={{ marginTop: 4 }}><NumberInput value={landValue} onChange={setLandValue} min={0} /></div>
              <p style={{ margin: '10px 0 0', fontWeight: 700, color: '#0f172a' }}>{currency(costApproachValue)}</p>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Weight (%)</label>
              <div style={{ marginTop: 4 }}><NumberInput value={weightCost} onChange={setWeightCost} min={0} max={100} step={1} /></div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Income approach</h3>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Monthly market rent</label>
              <div style={{ marginTop: 4 }}><NumberInput value={marketRent} onChange={setMarketRent} min={0} /></div>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Vacancy (%)</label>
              <div style={{ marginTop: 4 }}><NumberInput value={vacancyPct} onChange={setVacancyPct} min={0} max={100} step={0.25} /></div>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Annual operating expenses</label>
              <div style={{ marginTop: 4 }}><NumberInput value={operatingExpensesAnnual} onChange={setOperatingExpensesAnnual} min={0} /></div>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Cap rate (%)</label>
              <div style={{ marginTop: 4 }}><NumberInput value={capRatePct} onChange={setCapRatePct} min={0.01} step={0.01} /></div>
              <p style={{ margin: '10px 0 0', fontWeight: 700, color: '#0f172a' }}>{currency(incomeApproachValue)}</p>
              <label style={{ marginTop: 8, display: 'block', fontSize: 13, color: '#334155' }}>Weight (%)</label>
              <div style={{ marginTop: 4 }}><NumberInput value={weightIncome} onChange={setWeightIncome} min={0} max={100} step={1} /></div>
            </div>
          </div>

          <p style={{ margin: '12px 0 0', color: '#334155', fontSize: 14 }}>
            Current weighted blend: Market {percent(weightMarket)} · Cost {percent(weightCost)} · Income {percent(weightIncome)}
          </p>
        </section>
      </section>
    </main>
  );
}
