'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Command Center' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/properties', label: 'Properties' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/engines/land-build', label: 'Land + Build UW' },
  { href: '/investor', label: 'Investor' },
  { href: '/appraiser', label: 'Appraiser' },
  { href: '/contractor', label: 'Contractor' },
  { href: '/lender', label: 'Lender' },
  { href: '/property-manager', label: 'Property Manager' },
  { href: '/walkthrough', label: 'Walkthrough' },
];

export default function AppNavigation() {
  const pathname = usePathname() ?? '';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(11,31,58,0.97)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(197,157,61,0.25)',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      overflowX: 'auto',
      minHeight: 52,
    }}>
      <Link href="/" style={{ marginRight: 12, textDecoration: 'none', flexShrink: 0 }}>
        <span style={{ color: '#C59D3D', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>
          Dynasty
        </span>
        <span style={{ color: '#B6A17A', fontWeight: 400, fontSize: 14, marginLeft: 4 }}>
          PropertyOS
        </span>
      </Link>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            textDecoration: 'none',
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: isActive(item.href) ? 700 : 400,
            color: isActive(item.href) ? '#C59D3D' : '#B6A17A',
            background: isActive(item.href) ? 'rgba(197,157,61,0.12)' : 'transparent',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          {item.label}
        </Link>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
        <Link href="/login" style={{ textDecoration: 'none', padding: '5px 12px', borderRadius: 8, fontSize: 13, color: '#B6A17A', border: '1px solid rgba(182,161,122,0.3)' }}>
          Sign in
        </Link>
      </div>
    </nav>
  );
}
