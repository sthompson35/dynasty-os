'use client';

import { useMemo, useState } from 'react';

type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'completed';

type MaintenanceTask = {
  id: string;
  property: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: TaskStatus;
  expectedCost: number;
  actualCost: number;
  assignedContractorId: string;
  dueDate: string;
};

type RehabScope = {
  id: string;
  project: string;
  scopeItem: string;
  status: TaskStatus;
  budget: number;
  spent: number;
  assignedContractorId: string;
};

type BidLineItem = {
  id: string;
  label: string;
  quantity: number;
  unitCost: number;
};

type FieldDoc = {
  id: string;
  type: 'photo' | 'document';
  relatedModule: 'maintenance' | 'rehab' | 'bid';
  relatedId: string;
  fileName: string;
  note: string;
  createdAt: string;
};

const ACTIVE_CONTRACTOR_ID = 'CON-ALPHA-001';

function currency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(iso: string): string {
  // Explicit UTC avoids a server/client hydration mismatch: date-only strings
  // ('YYYY-MM-DD') parse as UTC midnight, and the server (Docker, UTC) vs the
  // browser (host-local timezone) would otherwise format that instant as two
  // different calendar days.
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC' });
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export default function ContractorPortal() {
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([
    {
      id: 'mr-1001',
      property: '101 Verification Way',
      title: 'HVAC condensate line leak repair',
      priority: 'urgent',
      status: 'open',
      expectedCost: 850,
      actualCost: 0,
      assignedContractorId: 'CON-ALPHA-001',
      dueDate: '2026-06-04'
    },
    {
      id: 'mr-1002',
      property: '77 Pine Hollow Dr',
      title: 'Electrical panel labeling and cleanup',
      priority: 'normal',
      status: 'in_progress',
      expectedCost: 420,
      actualCost: 250,
      assignedContractorId: 'CON-BETA-002',
      dueDate: '2026-06-10'
    },
    {
      id: 'mr-1003',
      property: '14 Brookline Ct',
      title: 'Kitchen faucet cartridge replacement',
      priority: 'high',
      status: 'open',
      expectedCost: 280,
      actualCost: 0,
      assignedContractorId: 'CON-ALPHA-001',
      dueDate: '2026-06-06'
    }
  ]);

  const [rehabScopes, setRehabScopes] = useState<RehabScope[]>([
    {
      id: 'rs-3301',
      project: 'Verification Rehab Project',
      scopeItem: 'Bathroom vanity and plumbing rough-in',
      status: 'in_progress',
      budget: 5600,
      spent: 2400,
      assignedContractorId: 'CON-ALPHA-001'
    },
    {
      id: 'rs-3302',
      project: 'Verification Rehab Project',
      scopeItem: 'Living room electrical and recessed lighting',
      status: 'open',
      budget: 4100,
      spent: 0,
      assignedContractorId: 'CON-BETA-002'
    },
    {
      id: 'rs-3303',
      project: 'USDA Prototype Refresh',
      scopeItem: 'Subfloor reinforcement and finish prep',
      status: 'blocked',
      budget: 3000,
      spent: 1200,
      assignedContractorId: 'CON-ALPHA-001'
    }
  ]);

  const [bidProperty, setBidProperty] = useState('101 Verification Way');
  const [bidScopeSummary, setBidScopeSummary] = useState('Turn-ready scope package for kitchen + bath + punch list');
  const [bidMarginPct, setBidMarginPct] = useState(12);
  const [bidLineItems, setBidLineItems] = useState<BidLineItem[]>([
    { id: 'line-1', label: 'Labor - plumbing', quantity: 14, unitCost: 95 },
    { id: 'line-2', label: 'Fixtures and rough materials', quantity: 1, unitCost: 1850 },
    { id: 'line-3', label: 'Disposal and cleanup', quantity: 1, unitCost: 240 }
  ]);
  const [bidSubmittedAt, setBidSubmittedAt] = useState<string | null>(null);

  const [docType, setDocType] = useState<'photo' | 'document'>('photo');
  const [docModule, setDocModule] = useState<'maintenance' | 'rehab' | 'bid'>('maintenance');
  const [docRelatedId, setDocRelatedId] = useState('mr-1001');
  const [docNote, setDocNote] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [fieldDocs, setFieldDocs] = useState<FieldDoc[]>([]);

  const [statusNotice, setStatusNotice] = useState<string>('');

  const assignedMaintenance = useMemo(
    () => maintenanceTasks.filter((task) => task.assignedContractorId === ACTIVE_CONTRACTOR_ID),
    [maintenanceTasks]
  );

  const assignedRehabScopes = useMemo(
    () => rehabScopes.filter((scope) => scope.assignedContractorId === ACTIVE_CONTRACTOR_ID),
    [rehabScopes]
  );

  const maintenanceTotalExpected = useMemo(
    () => assignedMaintenance.reduce((sum, task) => sum + task.expectedCost, 0),
    [assignedMaintenance]
  );

  const maintenanceTotalActual = useMemo(
    () => assignedMaintenance.reduce((sum, task) => sum + task.actualCost, 0),
    [assignedMaintenance]
  );

  const rehabBudget = useMemo(
    () => assignedRehabScopes.reduce((sum, scope) => sum + scope.budget, 0),
    [assignedRehabScopes]
  );

  const rehabSpent = useMemo(
    () => assignedRehabScopes.reduce((sum, scope) => sum + scope.spent, 0),
    [assignedRehabScopes]
  );

  const bidSubtotal = useMemo(
    () => bidLineItems.reduce((sum, line) => sum + line.quantity * line.unitCost, 0),
    [bidLineItems]
  );

  const bidTotal = useMemo(() => bidSubtotal * (1 + bidMarginPct / 100), [bidSubtotal, bidMarginPct]);

  function updateMaintenanceStatus(taskId: string, nextStatus: TaskStatus): void {
    const task = maintenanceTasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }
    if (task.assignedContractorId !== ACTIVE_CONTRACTOR_ID) {
      setStatusNotice(`RLS guard: task ${taskId} is not assigned to your contractor account.`);
      return;
    }
    setMaintenanceTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, status: nextStatus } : item))
    );
    setStatusNotice(`Task ${taskId} status updated to ${nextStatus}.`);
  }

  function updateRehabStatus(scopeId: string, nextStatus: TaskStatus): void {
    const scope = rehabScopes.find((item) => item.id === scopeId);
    if (!scope) {
      return;
    }
    if (scope.assignedContractorId !== ACTIVE_CONTRACTOR_ID) {
      setStatusNotice(`RLS guard: rehab scope ${scopeId} is not assigned to your contractor account.`);
      return;
    }
    setRehabScopes((current) =>
      current.map((item) => (item.id === scopeId ? { ...item, status: nextStatus } : item))
    );
    setStatusNotice(`Rehab scope ${scopeId} status updated to ${nextStatus}.`);
  }

  function updateActualCost(taskId: string, actualCost: number): void {
    const task = maintenanceTasks.find((item) => item.id === taskId);
    if (!task || task.assignedContractorId !== ACTIVE_CONTRACTOR_ID) {
      setStatusNotice(`RLS guard: cost update denied for task ${taskId}.`);
      return;
    }
    setMaintenanceTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, actualCost: Math.max(0, actualCost) } : item))
    );
  }

  function updateRehabSpent(scopeId: string, spent: number): void {
    const scope = rehabScopes.find((item) => item.id === scopeId);
    if (!scope || scope.assignedContractorId !== ACTIVE_CONTRACTOR_ID) {
      setStatusNotice(`RLS guard: cost update denied for rehab scope ${scopeId}.`);
      return;
    }
    setRehabScopes((current) =>
      current.map((item) => (item.id === scopeId ? { ...item, spent: Math.max(0, spent) } : item))
    );
  }

  function addBidLineItem(): void {
    setBidLineItems((current) => [
      ...current,
      { id: makeId('line'), label: 'New line item', quantity: 1, unitCost: 0 }
    ]);
  }

  function removeBidLineItem(lineId: string): void {
    setBidLineItems((current) => current.filter((line) => line.id !== lineId));
  }

  function updateBidLineItem(lineId: string, patch: Partial<BidLineItem>): void {
    setBidLineItems((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
    );
  }

  function submitBidEstimate(): void {
    setBidSubmittedAt(new Date().toISOString());
    setStatusNotice('Bid and estimate submitted for review.');
  }

  function addFieldDoc(): void {
    if (!docFileName.trim()) {
      return;
    }
    const newDoc: FieldDoc = {
      id: makeId('doc'),
      type: docType,
      relatedModule: docModule,
      relatedId: docRelatedId.trim(),
      fileName: docFileName.trim(),
      note: docNote.trim(),
      createdAt: new Date().toISOString()
    };
    setFieldDocs((current) => [newDoc, ...current]);
    setDocNote('');
    setDocFileName('');
  }

  function removeFieldDoc(docId: string): void {
    setFieldDocs((current) => current.filter((doc) => doc.id !== docId));
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
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>Contractor Portal</h1>
        <p style={{ marginTop: 8, color: '#334155', maxInlineSize: 940 }}>
          Execution view for scope items, maintenance assignments, cost tracking, and progress
          status updates tied to authorized RLS rules.
        </p>
        <p style={{ marginTop: 8, color: '#1d4ed8', fontSize: 13 }}>
          Active contractor account: {ACTIVE_CONTRACTOR_ID}
        </p>

        {statusNotice ? (
          <div
            style={{
              marginTop: 12,
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              padding: '10px 12px',
              background: '#eff6ff',
              color: '#1e3a8a'
            }}
          >
            {statusNotice}
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#ffffff', padding: 12 }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Assigned maintenance expected</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: 22, color: '#0f172a' }}>{currency(maintenanceTotalExpected)}</p>
          </div>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#ffffff', padding: 12 }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Assigned maintenance actual</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: 22, color: '#0f172a' }}>{currency(maintenanceTotalActual)}</p>
          </div>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#ffffff', padding: 12 }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Assigned rehab budget</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: 22, color: '#0f172a' }}>{currency(rehabBudget)}</p>
          </div>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#ffffff', padding: 12 }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Assigned rehab spent</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: 22, color: '#0f172a' }}>{currency(rehabSpent)}</p>
          </div>
        </div>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Assigned maintenance queue</h2>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['ID', 'Property', 'Task', 'Priority', 'Due', 'Status', 'Expected', 'Actual', 'Assigned To'].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maintenanceTasks.map((task) => {
                  const assigned = task.assignedContractorId === ACTIVE_CONTRACTOR_ID;
                  return (
                    <tr key={task.id} style={{ background: assigned ? '#ffffff' : '#fff7ed' }}>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontWeight: 700 }}>{task.id}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{task.property}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{task.title}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', textTransform: 'capitalize' }}>{task.priority}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{formatDate(task.dueDate)}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                        <select
                          value={task.status}
                          disabled={!assigned}
                          onChange={(event) => updateMaintenanceStatus(task.id, event.target.value as TaskStatus)}
                          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: assigned ? '#ffffff' : '#f1f5f9' }}
                        >
                          <option value="open">open</option>
                          <option value="in_progress">in_progress</option>
                          <option value="blocked">blocked</option>
                          <option value="completed">completed</option>
                        </select>
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{currency(task.expectedCost)}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                        <input
                          type="number"
                          value={task.actualCost}
                          disabled={!assigned}
                          onChange={(event) => updateActualCost(task.id, Number(event.target.value) || 0)}
                          style={{ width: 110, border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: assigned ? '#ffffff' : '#f1f5f9' }}
                        />
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontSize: 12 }}>{task.assignedContractorId}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Rehab scope status updates</h2>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Scope ID', 'Project', 'Item', 'Status', 'Budget', 'Spent', 'Assigned To'].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rehabScopes.map((scope) => {
                  const assigned = scope.assignedContractorId === ACTIVE_CONTRACTOR_ID;
                  return (
                    <tr key={scope.id} style={{ background: assigned ? '#ffffff' : '#fff7ed' }}>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontWeight: 700 }}>{scope.id}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{scope.project}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{scope.scopeItem}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                        <select
                          value={scope.status}
                          disabled={!assigned}
                          onChange={(event) => updateRehabStatus(scope.id, event.target.value as TaskStatus)}
                          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: assigned ? '#ffffff' : '#f1f5f9' }}
                        >
                          <option value="open">open</option>
                          <option value="in_progress">in_progress</option>
                          <option value="blocked">blocked</option>
                          <option value="completed">completed</option>
                        </select>
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{currency(scope.budget)}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                        <input
                          type="number"
                          value={scope.spent}
                          disabled={!assigned}
                          onChange={(event) => updateRehabSpent(scope.id, Number(event.target.value) || 0)}
                          style={{ width: 110, border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: assigned ? '#ffffff' : '#f1f5f9' }}
                        />
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontSize: 12 }}>{scope.assignedContractorId}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Bid and estimate submission</h2>
            <button
              type="button"
              onClick={addBidLineItem}
              style={{ border: '1px solid #0ea5e9', borderRadius: 10, padding: '8px 12px', background: '#e0f2fe', color: '#0c4a6e', fontWeight: 700, cursor: 'pointer' }}
            >
              Add line item
            </button>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, color: '#334155' }}>Property</label>
              <input
                value={bidProperty}
                onChange={(event) => setBidProperty(event.target.value)}
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#334155' }}>Margin (%)</label>
              <input
                type="number"
                value={bidMarginPct}
                onChange={(event) => setBidMarginPct(Number(event.target.value) || 0)}
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 13, color: '#334155' }}>Scope summary</label>
            <textarea
              value={bidScopeSummary}
              onChange={(event) => setBidScopeSummary(event.target.value)}
              rows={2}
              style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', resize: 'vertical' }}
            />
          </div>

          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Line Item', 'Qty', 'Unit Cost', 'Extended', 'Action'].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bidLineItems.map((line) => (
                  <tr key={line.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                      <input
                        value={line.label}
                        onChange={(event) => updateBidLineItem(line.id, { label: event.target.value })}
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' }}
                      />
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 90 }}>
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(event) => updateBidLineItem(line.id, { quantity: Number(event.target.value) || 0 })}
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' }}
                      />
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', width: 120 }}>
                      <input
                        type="number"
                        value={line.unitCost}
                        onChange={(event) => updateBidLineItem(line.id, { unitCost: Number(event.target.value) || 0 })}
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' }}
                      />
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontWeight: 700 }}>{currency(line.quantity * line.unitCost)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                      <button
                        type="button"
                        onClick={() => removeBidLineItem(line.id)}
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

          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div style={{ border: '1px solid #dbeafe', borderRadius: 10, background: '#f8fafc', padding: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Subtotal</p>
              <p style={{ margin: '6px 0 0', fontWeight: 700, color: '#0f172a' }}>{currency(bidSubtotal)}</p>
            </div>
            <div style={{ border: '1px solid #dbeafe', borderRadius: 10, background: '#f8fafc', padding: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Total with margin</p>
              <p style={{ margin: '6px 0 0', fontWeight: 700, color: '#0f172a' }}>{currency(bidTotal)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={submitBidEstimate}
            style={{ marginTop: 12, border: '1px solid #1d4ed8', borderRadius: 10, padding: '8px 12px', background: '#1d4ed8', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
          >
            Submit bid estimate
          </button>
          {bidSubmittedAt ? (
            <p style={{ margin: '8px 0 0', color: '#1e3a8a', fontSize: 13 }}>
              Last submitted: {new Date(bidSubmittedAt).toLocaleString()}
            </p>
          ) : null}
        </section>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Field photo and documentation uploads</h2>
          <p style={{ marginTop: 8, color: '#475569', fontSize: 13 }}>
            This module captures metadata for field evidence. It is ready to connect to storage buckets.
          </p>

          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, color: '#334155' }}>Type</label>
              <select
                value={docType}
                onChange={(event) => setDocType(event.target.value as 'photo' | 'document')}
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', background: '#ffffff' }}
              >
                <option value="photo">photo</option>
                <option value="document">document</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#334155' }}>Related module</label>
              <select
                value={docModule}
                onChange={(event) => setDocModule(event.target.value as 'maintenance' | 'rehab' | 'bid')}
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', background: '#ffffff' }}
              >
                <option value="maintenance">maintenance</option>
                <option value="rehab">rehab</option>
                <option value="bid">bid</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#334155' }}>Related ID</label>
              <input
                value={docRelatedId}
                onChange={(event) => setDocRelatedId(event.target.value)}
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#334155' }}>File name</label>
              <input
                value={docFileName}
                onChange={(event) => setDocFileName(event.target.value)}
                placeholder="for example kitchen-before.jpg"
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 13, color: '#334155' }}>Note</label>
              <textarea
                value={docNote}
                onChange={(event) => setDocNote(event.target.value)}
                rows={2}
                style={{ width: '100%', marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', resize: 'vertical' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addFieldDoc}
            style={{ marginTop: 10, border: '1px solid #0f766e', borderRadius: 10, padding: '8px 12px', background: '#ccfbf1', color: '#134e4a', fontWeight: 700, cursor: 'pointer' }}
          >
            Add field document
          </button>

          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {fieldDocs.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b' }}>No field documents captured yet.</p>
            ) : (
              fieldDocs.map((doc) => (
                <article key={doc.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                      {doc.type.toUpperCase()} · {doc.fileName}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFieldDoc(doc.id)}
                      style={{ border: '1px solid #fda4af', borderRadius: 8, padding: '6px 8px', background: '#fff1f2', color: '#be123c', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                  <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 13 }}>
                    Module: {doc.relatedModule} · Record: {doc.relatedId}
                  </p>
                  {doc.note ? <p style={{ margin: '6px 0 0', color: '#475569' }}>{doc.note}</p> : null}
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 12 }}>
                    Captured: {new Date(doc.createdAt).toLocaleString()}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
