'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import WalkthroughViewer from '../../property_viewer/WalkthroughViewer';
import type { WalkthroughManifest } from '../../property_viewer/walkthrough.types';

export default function WalkthroughPage() {
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
      <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <Link href="/">&larr; Back to command center</Link>
        <h1>Walkthrough unavailable</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!manifest) {
    return (
      <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <p>Loading walkthrough...</p>
      </main>
    );
  }

  return (
    <main>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 20,
          pointerEvents: 'auto',
        }}
      >
        <Link href="/" style={{ color: '#93c5fd', fontWeight: 600 }}>
          &larr; Back to command center
        </Link>
      </div>
      <WalkthroughViewer manifest={manifest} fullScreen />
    </main>
  );
}
