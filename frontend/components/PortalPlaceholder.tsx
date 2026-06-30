import Link from 'next/link';

type PortalPlaceholderProps = {
  title: string;
  summary: string;
  modules: string[];
};

export default function PortalPlaceholder({ title, summary, modules }: PortalPlaceholderProps) {
  return (
    <main
      style={{
        minBlockSize: 'calc(100vh - 70px)',
        padding: '32px 20px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
      }}
    >
      <section style={{ maxInlineSize: 960, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>{title}</h1>
        <p style={{ marginTop: 10, color: '#334155', maxInlineSize: 760 }}>{summary}</p>

        <div
          style={{
            marginTop: 18,
            border: '1px solid #cbd5e1',
            borderRadius: 14,
            padding: 18,
            background: '#ffffff'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Planned modules</h2>
          <ul style={{ margin: '12px 0 0', paddingInlineStart: 18, color: '#334155', lineHeight: 1.5 }}>
            {modules.map((moduleName) => (
              <li key={moduleName}>{moduleName}</li>
            ))}
          </ul>
          <p style={{ margin: '14px 0 0', color: '#64748b', fontSize: 13 }}>
            This portal shell is wired into global navigation and ready for feature implementation.
          </p>
        </div>

        <p style={{ marginTop: 16 }}>
          <Link href="/">Back to command center</Link>
        </p>
      </section>
    </main>
  );
}
