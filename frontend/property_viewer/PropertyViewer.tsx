'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import WalkthroughViewer from './WalkthroughViewer';
import type { WalkthroughManifest } from './walkthrough.types';

export default function PropertyViewer() {
  const [manifest, setManifest] = useState<WalkthroughManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/walkthrough.json')
      .then((response) => {
        if (!response.ok) throw new Error('Walkthrough manifest not found');
        return response.json();
      })
      .then((data: WalkthroughManifest) => setManifest(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={{ marginTop: 24, padding: 16, border: '1px dashed #999', borderRadius: 12 }}>
        <h3>Walkthrough unavailable</h3>
        <p>{error}</p>
        <p>Run the Blender generator to export the GLB and walkthrough manifest.</p>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div style={{ marginTop: 24, padding: 16, border: '1px dashed #999', borderRadius: 12 }}>
        Loading walkthrough...
      </div>
    );
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Property Walkthrough</h2>
          <p style={{ marginTop: 0, color: '#475569' }}>
            Guided room-to-room tour or free first-person walk through the USDA 1-bedroom digital twin.
          </p>
        </div>
        <Link href="/walkthrough" style={{ color: '#2563eb', fontWeight: 600 }}>
          Open full-screen walkthrough
        </Link>
      </div>
      <WalkthroughViewer manifest={manifest} />
    </section>
  );
}
