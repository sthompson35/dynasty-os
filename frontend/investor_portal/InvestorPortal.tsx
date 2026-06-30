import { fetchInvestorSnapshot } from '../lib/api';

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function InvestorPortal() {
  const snapshotResult = await fetchInvestorSnapshot();
  const snapshot = snapshotResult.snapshot;

  return (
    <main
      style={{
        minBlockSize: '100vh',
        padding: '32px 20px',
        background:
          'radial-gradient(circle at top right, #e0f2fe 0%, #f8fafc 45%, #ecfeff 100%)',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
      }}
    >
      <section style={{ maxInlineSize: 960, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Investor Portal</h1>
        <p style={{ marginBlockStart: 8, color: '#334155' }}>
          Live snapshot from the backend investor endpoint.
        </p>

        {!snapshot ? (
          <div
            style={{
              marginBlockStart: 20,
              borderRadius: 16,
              border: '1px solid #fecaca',
              background: '#fff1f2',
              padding: 16,
              color: '#9f1239'
            }}
          >
            Unable to load market snapshot. Start backend API on port 8000 and refresh.
            <p style={{ margin: '10px 0 0', fontSize: 12 }}>
              Request Correlation ID: {snapshotResult.requestCorrelationId}
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                marginBlockStart: 20,
                borderRadius: 18,
                border: '1px solid #bae6fd',
                background: '#ffffff',
                padding: 20,
                boxShadow: '0 10px 30px rgba(2, 132, 199, 0.12)'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{snapshot.market}</h2>
              <p style={{ marginBlockStart: 8, color: '#475569' }}>
                Exit horizon: {snapshot.avg_days_to_exit} days · Target margin: {percent(snapshot.target_margin)}
              </p>
              <div
                style={{
                  display: 'inline-block',
                  marginBlockStart: 12,
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: snapshot.decision === 'GO' ? '#dcfce7' : '#fef2f2',
                  color: snapshot.decision === 'GO' ? '#166534' : '#991b1b',
                  fontWeight: 700,
                  letterSpacing: 0.3
                }}
              >
                Decision: {snapshot.decision}
              </div>
              <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: 12 }}>
                Request Correlation ID: {snapshotResult.requestCorrelationId}
              </p>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                Response Correlation ID: {snapshotResult.responseCorrelationId ?? 'missing'}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                marginBlockStart: 16
              }}
            >
              {[
                ['Median Purchase', currency(snapshot.median_purchase_price)],
                ['Median ARV', currency(snapshot.median_arv)],
                ['Renovation Budget', currency(snapshot.renovation_budget)],
                ['Estimated Total Cost', currency(snapshot.estimated_total_cost)],
                ['Estimated Profit', currency(snapshot.estimated_profit)],
                ['Estimated ROI', percent(snapshot.estimated_roi)]
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 14,
                    background: '#ffffff',
                    border: '1px solid #dbeafe',
                    padding: 14
                  }}
                >
                  <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>{label}</p>
                  <p style={{ margin: '8px 0 0', fontWeight: 700, fontSize: 20, color: '#0f172a' }}>{value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
