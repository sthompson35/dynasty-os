'use client';

import { useMemo, useState } from 'react';
import { postFlipAnalysis } from '../lib/api';

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function pct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function row(label: string, value: string, highlight = false) {
  return (
    <tr key={label}>
      <td style={{ padding: '8px 10px', color: '#475569', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>{label}</td>
      <td style={{ padding: '8px 10px', fontWeight: highlight ? 700 : 500, color: highlight ? '#0f172a' : '#334155', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{value}</td>
    </tr>
  );
}

type CheckItem = { label: string; done: boolean };

const DEFAULT_CHECKLIST: CheckItem[] = [
  { label: 'Executed purchase contract', done: false },
  { label: 'Proof of funds / pre-approval letter', done: false },
  { label: 'Title commitment ordered', done: false },
  { label: 'Hazard insurance binder', done: false },
  { label: 'Scope of work and contractor bids', done: false },
  { label: 'ARV appraisal ordered', done: false },
  { label: 'Entity / LLC operating agreement', done: false },
  { label: 'Property inspection report', done: false },
];

export default function LenderPortal() {
  const [purchasePrice, setPurchasePrice] = useState(210000);
  const [repairBudget, setRepairBudget] = useState(50000);
  const [arv, setArv] = useState(305000);
  const [closingCosts, setClosingCosts] = useState(8000);
  const [holdingCosts, setHoldingCosts] = useState(9000);
  const [sellingCosts, setSellingCosts] = useState(7000);
  const [targetMargin, setTargetMargin] = useState(0.30);
  const [loanAmount, setLoanAmount] = useState(168000);
  const [interestRate, setInterestRate] = useState(9.5);
  const [loanTermMonths, setLoanTermMonths] = useState(12);
  const [monthlyRent, setMonthlyRent] = useState(2350);
  const [vacancyPct, setVacancyPct] = useState(6);
  const [annualExpenses, setAnnualExpenses] = useState(9200);
  const [checklist, setChecklist] = useState<CheckItem[]>(DEFAULT_CHECKLIST);
  const [notes, setNotes] = useState('');
  const [flipResult, setFlipResult] = useState<{ total_cost: number; profit: number; roi: number; decision: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // LTV
  const ltv = arv > 0 ? loanAmount / arv : 0;
  const ltvOnCost = (purchasePrice + repairBudget) > 0 ? loanAmount / (purchasePrice + repairBudget) : 0;

  // Monthly interest-only payment
  const monthlyInterest = loanAmount * (interestRate / 100 / 12);

  // Total interest carry
  const totalInterestCarry = monthlyInterest * loanTermMonths;

  // DSCR (income approach for rental)
  const noi = useMemo(() => {
    const effectiveGross = monthlyRent * 12 * (1 - vacancyPct / 100);
    return effectiveGross - annualExpenses;
  }, [monthlyRent, vacancyPct, annualExpenses]);

  const annualDebtService = monthlyInterest * 12;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;

  // Collateral readiness score
  const checklistDone = checklist.filter((c) => c.done).length;
  const checklistTotal = checklist.length;
  const readinessPct = Math.round((checklistDone / checklistTotal) * 100);

  function toggleCheck(index: number) {
    setChecklist((prev) => prev.map((item, i) => i === index ? { ...item, done: !item.done } : item));
  }

  async function runFlipAnalysis() {
    setLoading(true);
    const result = await postFlipAnalysis({
      purchase_price: purchasePrice,
      repair_budget: repairBudget,
      arv,
      closing_costs: closingCosts,
      holding_costs: holdingCosts,
      selling_costs: sellingCosts,
      target_profit_margin: targetMargin,
    });
    setFlipResult(result);
    setLoading(false);
  }

  const decisionColor = flipResult?.decision === 'GO' ? '#166534' : '#991b1b';
  const decisionBg = flipResult?.decision === 'GO' ? '#dcfce7' : '#fef2f2';

  return (
    <main style={{ minBlockSize: 'calc(100vh - 70px)', padding: '26px 18px 40px', background: 'linear-gradient(180deg, #f8fafc 0%, #fefce8 55%, #ecfeff 100%)', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      <section style={{ maxInlineSize: 1200, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>Lender Portal</h1>
        <p style={{ marginTop: 8, color: '#334155', maxInlineSize: 940 }}>
          Credit and collateral intelligence — DSCR scenarios, LTV analysis, flip underwriting, and deal packet readiness for lender review.
        </p>

        {/* KPI row */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[
            ['LTV (ARV)', `${(ltv * 100).toFixed(1)}%`, ltv > 0.75 ? '#fef2f2' : '#f0fdf4', ltv > 0.75 ? '#991b1b' : '#166534'],
            ['LTV (Cost)', `${(ltvOnCost * 100).toFixed(1)}%`, ltvOnCost > 0.90 ? '#fef2f2' : '#f0fdf4', ltvOnCost > 0.90 ? '#991b1b' : '#166534'],
            ['Monthly Interest', currency(monthlyInterest), '#f8fafc', '#0f172a'],
            ['DSCR', dscr.toFixed(2), dscr < 1.25 ? '#fef2f2' : '#f0fdf4', dscr < 1.25 ? '#991b1b' : '#166534'],
            ['Packet Readiness', `${readinessPct}%`, '#f8fafc', '#0f172a'],
          ].map(([label, value, bg, color]) => (
            <div key={label as string} style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: bg as string, padding: 12 }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>{label}</p>
              <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: 22, color: color as string }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Deal inputs + underwriting */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>

          {/* Deal inputs */}
          <section style={{ border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Deal inputs</h2>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {([
                ['Purchase price', purchasePrice, setPurchasePrice],
                ['Repair budget', repairBudget, setRepairBudget],
                ['ARV', arv, setArv],
                ['Closing costs', closingCosts, setClosingCosts],
                ['Holding costs', holdingCosts, setHoldingCosts],
                ['Selling costs', sellingCosts, setSellingCosts],
              ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                <div key={label}>
                  <label style={{ fontSize: 13, color: '#334155' }}>{label}</label>
                  <input type="number" value={val} onChange={(e) => setter(Number(e.target.value) || 0)} style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 10px', fontSize: 14 }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, color: '#334155' }}>Target margin (%)</label>
                <input type="number" value={(targetMargin * 100).toFixed(0)} step={1} onChange={(e) => setTargetMargin((Number(e.target.value) || 0) / 100)} style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 10px', fontSize: 14 }} />
              </div>
              <button type="button" onClick={runFlipAnalysis} disabled={loading} style={{ marginTop: 4, border: '1px solid #1d4ed8', borderRadius: 10, padding: '9px 14px', background: '#1d4ed8', color: '#ffffff', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontSize: 14 }}>
                {loading ? 'Analyzing...' : 'Run flip analysis'}
              </button>
              {flipResult && (
                <div style={{ marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: decisionBg }}>
                    <span style={{ fontWeight: 800, fontSize: 18, color: decisionColor }}>Decision: {flipResult.decision}</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {row('Total cost', currency(flipResult.total_cost))}
                      {row('Profit', currency(flipResult.profit), true)}
                      {row('ROI', pct(flipResult.roi), true)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Loan + DSCR */}
          <section style={{ border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Loan structure &amp; DSCR</h2>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {([
                ['Loan amount', loanAmount, setLoanAmount],
                ['Monthly rent', monthlyRent, setMonthlyRent],
                ['Annual operating expenses', annualExpenses, setAnnualExpenses],
              ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                <div key={label}>
                  <label style={{ fontSize: 13, color: '#334155' }}>{label}</label>
                  <input type="number" value={val} onChange={(e) => setter(Number(e.target.value) || 0)} style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 10px', fontSize: 14 }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, color: '#334155' }}>Interest rate (%)</label>
                <input type="number" step={0.25} value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value) || 0)} style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 10px', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#334155' }}>Loan term (months)</label>
                <input type="number" value={loanTermMonths} onChange={(e) => setLoanTermMonths(Number(e.target.value) || 1)} style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 10px', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#334155' }}>Vacancy (%)</label>
                <input type="number" step={0.5} value={vacancyPct} onChange={(e) => setVacancyPct(Number(e.target.value) || 0)} style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 10px', fontSize: 14 }} />
              </div>
            </div>

            <div style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {row('NOI (annual)', currency(noi))}
                  {row('Annual debt service', currency(annualDebtService))}
                  {row('DSCR', dscr.toFixed(2), true)}
                  {row('Monthly interest-only', currency(monthlyInterest))}
                  {row('Total interest carry', currency(totalInterestCarry))}
                  {row('LTV on ARV', `${(ltv * 100).toFixed(1)}%`, true)}
                  {row('LTV on cost', `${(ltvOnCost * 100).toFixed(1)}%`, true)}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
              DSCR ≥ 1.25 is typically lender minimum. LTV on ARV ≤ 75% is standard hard money threshold.
            </p>
          </section>
        </div>

        {/* Collateral checklist */}
        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Collateral readiness checklist</h2>
            <span style={{ fontWeight: 700, fontSize: 14, color: readinessPct === 100 ? '#166534' : '#92400e' }}>
              {checklistDone}/{checklistTotal} complete ({readinessPct}%)
            </span>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {checklist.map((item, index) => (
              <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 10, background: item.done ? '#f0fdf4' : '#f8fafc', border: `1px solid ${item.done ? '#bbf7d0' : '#e2e8f0'}` }}>
                <input type="checkbox" checked={item.done} onChange={() => toggleCheck(index)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <span style={{ fontSize: 14, color: item.done ? '#166534' : '#334155', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Decision notes */}
        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 16 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Decision timeline and notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Underwriting notes, conditions, timeline milestones, lender communication log..."
            rows={5}
            style={{ width: '100%', marginTop: 10, border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </section>
      </section>
    </main>
  );
}
