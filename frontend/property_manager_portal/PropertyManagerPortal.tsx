'use client';

import { useMemo, useState } from 'react';

type LeaseStatus = 'active' | 'renewal_pending' | 'notice_given' | 'vacant';
type MaintenanceStatus = 'open' | 'in_progress' | 'blocked' | 'completed';

type Lease = {
  id: string;
  property: string;
  unit: string;
  tenant: string;
  status: LeaseStatus;
  rent: number;
  startDate: string;
  endDate: string;
  delinquentDays: number;
};

type MaintenanceItem = {
  id: string;
  property: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  dueByHours: number;
  status: MaintenanceStatus;
  assignedVendorId: string;
};

type Vendor = {
  id: string;
  name: string;
  trade: string;
  activeAssignments: number;
  completedJobs: number;
  avgResponseHours: number;
  onTimeRate: number;
  rating: number;
};

type MonthlyOps = {
  month: string;
  operatingCost: number;
  incidentCount: number;
  occupancyRate: number;
};

// Static demo data — hoisted so it's a stable reference across renders
// (a component-local const literal would be recreated every render, defeating
// the useMemo hooks below that depend on it).
const MONTHLY_OPS: MonthlyOps[] = [
  { month: 'Jan', operatingCost: 18400, incidentCount: 18, occupancyRate: 94.2 },
  { month: 'Feb', operatingCost: 17600, incidentCount: 14, occupancyRate: 95.0 },
  { month: 'Mar', operatingCost: 19150, incidentCount: 19, occupancyRate: 93.4 },
  { month: 'Apr', operatingCost: 16980, incidentCount: 12, occupancyRate: 96.1 },
  { month: 'May', operatingCost: 20500, incidentCount: 22, occupancyRate: 92.7 },
  { month: 'Jun', operatingCost: 18840, incidentCount: 16, occupancyRate: 94.8 }
];

function currency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString();
}

function hoursSince(isoTimestamp: string): number {
  const ms = Date.now() - new Date(isoTimestamp).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60)));
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function PropertyManagerPortal() {
  const [leases, setLeases] = useState<Lease[]>([
    {
      id: 'lease-1001',
      property: '101 Verification Way',
      unit: 'A',
      tenant: 'Maya Carter',
      status: 'active',
      rent: 2350,
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      delinquentDays: 0
    },
    {
      id: 'lease-1002',
      property: '77 Pine Hollow Dr',
      unit: 'Main',
      tenant: 'Jordan Lee',
      status: 'renewal_pending',
      rent: 2180,
      startDate: '2025-07-15',
      endDate: '2026-07-14',
      delinquentDays: 4
    },
    {
      id: 'lease-1003',
      property: '14 Brookline Ct',
      unit: 'B',
      tenant: 'Vacant',
      status: 'vacant',
      rent: 0,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      delinquentDays: 0
    }
  ]);

  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([
    {
      id: 'mnt-5001',
      property: '101 Verification Way',
      title: 'AC airflow imbalance',
      priority: 'high',
      createdAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
      dueByHours: 24,
      status: 'in_progress',
      assignedVendorId: 'ven-1'
    },
    {
      id: 'mnt-5002',
      property: '77 Pine Hollow Dr',
      title: 'Leaking under-sink valve',
      priority: 'urgent',
      createdAt: new Date(Date.now() - 31 * 60 * 60 * 1000).toISOString(),
      dueByHours: 24,
      status: 'open',
      assignedVendorId: 'ven-2'
    },
    {
      id: 'mnt-5003',
      property: '14 Brookline Ct',
      title: 'Exterior lighting outage',
      priority: 'normal',
      createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      dueByHours: 48,
      status: 'open',
      assignedVendorId: 'ven-3'
    }
  ]);

  const [vendors, setVendors] = useState<Vendor[]>([
    {
      id: 'ven-1',
      name: 'Delta Mechanical',
      trade: 'HVAC',
      activeAssignments: 2,
      completedJobs: 42,
      avgResponseHours: 3.8,
      onTimeRate: 92.4,
      rating: 4.7
    },
    {
      id: 'ven-2',
      name: 'BlueLine Plumbing',
      trade: 'Plumbing',
      activeAssignments: 3,
      completedJobs: 37,
      avgResponseHours: 5.2,
      onTimeRate: 87.1,
      rating: 4.3
    },
    {
      id: 'ven-3',
      name: 'WestGrid Electric',
      trade: 'Electrical',
      activeAssignments: 1,
      completedJobs: 29,
      avgResponseHours: 4.1,
      onTimeRate: 90.0,
      rating: 4.5
    }
  ]);

  const monthlyOps = MONTHLY_OPS;

  const [notice, setNotice] = useState<string>('');

  const occupancyHealth = useMemo(() => {
    const occupied = leases.filter((lease) => lease.status !== 'vacant').length;
    const total = leases.length || 1;
    return (occupied / total) * 100;
  }, [leases]);

  const leaseGross = useMemo(
    () => leases.reduce((sum, lease) => sum + lease.rent, 0),
    [leases]
  );

  const delinquentLeases = useMemo(
    () => leases.filter((lease) => lease.delinquentDays > 0),
    [leases]
  );

  const slaSummary = useMemo(() => {
    const active = maintenanceItems.filter((item) => item.status !== 'completed');
    const completed = maintenanceItems.filter((item) => item.status === 'completed');
    const breached = active.filter((item) => hoursSince(item.createdAt) > item.dueByHours).length;
    const met = Math.max(0, completed.length - breached);
    return {
      openCount: active.length,
      breachCount: breached,
      metCount: met
    };
  }, [maintenanceItems]);

  const totalOperatingCost = useMemo(
    () => monthlyOps.reduce((sum, month) => sum + month.operatingCost, 0),
    [monthlyOps]
  );

  const avgIncidentCount = useMemo(
    () => monthlyOps.reduce((sum, month) => sum + month.incidentCount, 0) / monthlyOps.length,
    [monthlyOps]
  );

  function updateLeaseStatus(leaseId: string, status: LeaseStatus): void {
    setLeases((current) =>
      current.map((lease) => (lease.id === leaseId ? { ...lease, status } : lease))
    );
    setNotice(`Lease ${leaseId} updated to ${status}.`);
  }

  function updateMaintenanceStatus(itemId: string, status: MaintenanceStatus): void {
    setMaintenanceItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, status } : item))
    );
    setNotice(`Maintenance ticket ${itemId} updated to ${status}.`);
  }

  function updateMaintenanceVendor(itemId: string, vendorId: string): void {
    setMaintenanceItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, assignedVendorId: vendorId } : item))
    );
    setNotice(`Maintenance ticket ${itemId} reassigned to ${vendorId}.`);
  }

  function updateVendorRating(vendorId: string, rating: number): void {
    const nextRating = Math.max(1, Math.min(5, rating));
    setVendors((current) =>
      current.map((vendor) => (vendor.id === vendorId ? { ...vendor, rating: nextRating } : vendor))
    );
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
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>Property Manager Portal</h1>
        <p style={{ marginTop: 8, color: '#334155', maxInlineSize: 940 }}>
          Operations command for leases, maintenance lifecycle, vendor coordination, and occupancy
          health across managed properties.
        </p>

        {notice ? (
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
            {notice}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10
          }}
        >
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#ffffff', padding: 12 }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Occupancy health</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: 22, color: '#0f172a' }}>
              {pct(occupancyHealth)}
            </p>
          </div>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#ffffff', padding: 12 }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Monthly gross rent roll</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: 22, color: '#0f172a' }}>
              {currency(leaseGross)}
            </p>
          </div>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#ffffff', padding: 12 }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Open SLA tickets</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: 22, color: '#0f172a' }}>
              {slaSummary.openCount}
            </p>
          </div>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#ffffff', padding: 12 }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>SLA breaches</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: 22, color: '#0f172a' }}>
              {slaSummary.breachCount}
            </p>
          </div>
        </div>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Lease roll and tenant activity</h2>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Lease', 'Property', 'Unit', 'Tenant', 'Status', 'Start', 'End', 'Rent', 'Delinquent'].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leases.map((lease) => (
                  <tr key={lease.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontWeight: 700 }}>{lease.id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{lease.property}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{lease.unit}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{lease.tenant}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                      <select
                        value={lease.status}
                        onChange={(event) => updateLeaseStatus(lease.id, event.target.value as LeaseStatus)}
                        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' }}
                      >
                        <option value="active">active</option>
                        <option value="renewal_pending">renewal_pending</option>
                        <option value="notice_given">notice_given</option>
                        <option value="vacant">vacant</option>
                      </select>
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{formatDate(lease.startDate)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{formatDate(lease.endDate)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{currency(lease.rent)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{lease.delinquentDays} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, border: '1px solid #fee2e2', borderRadius: 10, background: '#fff1f2', padding: 10 }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#9f1239', fontSize: 13 }}>
              Delinquency watchlist ({delinquentLeases.length})
            </p>
            <p style={{ margin: '6px 0 0', color: '#9f1239', fontSize: 13 }}>
              {delinquentLeases.length === 0
                ? 'No delinquent tenants this cycle.'
                : delinquentLeases.map((lease) => `${lease.tenant} (${lease.delinquentDays}d)`).join(' · ')}
            </p>
          </div>
        </section>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Maintenance SLA dashboard</h2>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Ticket', 'Property', 'Issue', 'Priority', 'Age (hrs)', 'SLA (hrs)', 'Status', 'Vendor'].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maintenanceItems.map((item) => {
                  const age = hoursSince(item.createdAt);
                  const breached = age > item.dueByHours && item.status !== 'completed';
                  return (
                    <tr key={item.id} style={{ background: breached ? '#fff7ed' : '#ffffff' }}>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontWeight: 700 }}>{item.id}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{item.property}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{item.title}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', textTransform: 'capitalize' }}>{item.priority}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{age}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{item.dueByHours}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                        <select
                          value={item.status}
                          onChange={(event) => updateMaintenanceStatus(item.id, event.target.value as MaintenanceStatus)}
                          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' }}
                        >
                          <option value="open">open</option>
                          <option value="in_progress">in_progress</option>
                          <option value="blocked">blocked</option>
                          <option value="completed">completed</option>
                        </select>
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                        <select
                          value={item.assignedVendorId}
                          onChange={(event) => updateMaintenanceVendor(item.id, event.target.value)}
                          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' }}
                        >
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Vendor assignment and performance</h2>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Vendor', 'Trade', 'Active', 'Completed', 'Avg Response', 'On-Time', 'Rating'].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontWeight: 700 }}>{vendor.name}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{vendor.trade}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{vendor.activeAssignments}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{vendor.completedJobs}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{vendor.avgResponseHours.toFixed(1)}h</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{pct(vendor.onTimeRate)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        value={vendor.rating}
                        onChange={(event) => updateVendorRating(vendor.id, Number(event.target.value) || vendor.rating)}
                        style={{ width: 80, border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginTop: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#ffffff', padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Operating cost and incident trends</h2>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Month', 'Operating Cost', 'Incident Count', 'Occupancy'].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyOps.map((row) => (
                  <tr key={row.month}>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7', fontWeight: 700 }}>{row.month}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{currency(row.operatingCost)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{row.incidentCount}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #eef2f7' }}>{pct(row.occupancyRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div style={{ border: '1px solid #dbeafe', borderRadius: 10, background: '#f8fafc', padding: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>6-month operating total</p>
              <p style={{ margin: '6px 0 0', fontWeight: 700, color: '#0f172a' }}>{currency(totalOperatingCost)}</p>
            </div>
            <div style={{ border: '1px solid #dbeafe', borderRadius: 10, background: '#f8fafc', padding: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Average incidents / month</p>
              <p style={{ margin: '6px 0 0', fontWeight: 700, color: '#0f172a' }}>{avgIncidentCount.toFixed(1)}</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
