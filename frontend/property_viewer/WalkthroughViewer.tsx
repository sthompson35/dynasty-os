'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { KeyboardControls, PointerLockControls, useGLTF, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { blenderFeetToThreeVector } from './coordinates';
import type { WalkthroughManifest, WalkthroughStop } from './walkthrough.types';

const MOVE_SPEED = 4.5;
const TOUR_BLEND = 0.06;

enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
}

const keyMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'w', 'W'] },
  { name: Controls.back, keys: ['ArrowDown', 's', 'S'] },
  { name: Controls.left, keys: ['ArrowLeft', 'a', 'A'] },
  { name: Controls.right, keys: ['ArrowRight', 'd', 'D'] },
];

function PropertyModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} />;
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[20, 35, 12]} intensity={1.1} />
      <directionalLight position={[-15, 20, -10]} intensity={0.35} />
    </>
  );
}

function FirstPersonMovement({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();

  useFrame((_, delta) => {
    if (!enabled) return;

    const { forward, back, left, right } = getKeys();
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    if (direction.lengthSq() === 0) return;
    direction.normalize();

    const rightVec = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    const velocity = new THREE.Vector3();

    if (forward) velocity.add(direction);
    if (back) velocity.sub(direction);
    if (left) velocity.sub(rightVec);
    if (right) velocity.add(rightVec);

    if (velocity.lengthSq() > 0) {
      velocity.normalize().multiplyScalar(MOVE_SPEED * delta);
      camera.position.add(velocity);
    }
  });

  return null;
}

function GuidedTourCamera({ stop, active }: { stop: WalkthroughStop; active: boolean }) {
  const { camera } = useThree();
  const targetPos = useMemo(() => blenderFeetToThreeVector(stop.position_ft), [stop]);
  const lookTarget = useMemo(() => blenderFeetToThreeVector(stop.look_at_ft), [stop]);

  useFrame(() => {
    if (!active) return;
    camera.position.lerp(targetPos, TOUR_BLEND);
    const lookMatrix = new THREE.Matrix4().lookAt(camera.position, lookTarget, new THREE.Vector3(0, 1, 0));
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
    camera.quaternion.slerp(targetQuat, TOUR_BLEND);
  });

  return null;
}

function WalkthroughScene({
  manifest,
  mode,
  stopIndex,
}: {
  manifest: WalkthroughManifest;
  mode: 'explore' | 'tour';
  stopIndex: number;
}) {
  const stop = manifest.stops[stopIndex];

  return (
    <>
      <SceneLighting />
      <Suspense fallback={null}>
        <PropertyModel url={manifest.model_url} />
      </Suspense>
      <FirstPersonMovement enabled={mode === 'explore'} />
      {mode === 'explore' && <PointerLockControls />}
      {mode === 'tour' && stop && <GuidedTourCamera stop={stop} active />}
    </>
  );
}

function InitialCamera({ stop }: { stop: WalkthroughStop }) {
  const { camera } = useThree();
  useEffect(() => {
    const pos = blenderFeetToThreeVector(stop.position_ft);
    const look = blenderFeetToThreeVector(stop.look_at_ft);
    camera.position.copy(pos);
    camera.lookAt(look);
  }, [camera, stop]);
  return null;
}

type WalkthroughViewerProps = {
  manifest: WalkthroughManifest;
  fullScreen?: boolean;
};

export default function WalkthroughViewer({ manifest, fullScreen = false }: WalkthroughViewerProps) {
  const [mode, setMode] = useState<'explore' | 'tour'>('tour');
  const [stopIndex, setStopIndex] = useState(0);
  const stop = manifest.stops[stopIndex];

  const goNext = useCallback(() => {
    setStopIndex((index) => Math.min(index + 1, manifest.stops.length - 1));
  }, [manifest.stops.length]);

  const goPrev = useCallback(() => {
    setStopIndex((index) => Math.max(index - 1, 0));
  }, []);

  const height = fullScreen ? '100vh' : 520;

  return (
    <div
      style={{
        marginTop: fullScreen ? 0 : 24,
        height,
        border: fullScreen ? 'none' : '1px solid #ddd',
        borderRadius: fullScreen ? 0 : 12,
        overflow: 'hidden',
        position: 'relative',
        background: '#0b1220',
      }}
    >
      <KeyboardControls map={keyMap}>
        <Canvas camera={{ fov: 68, near: 0.1, far: 500 }}>
          <InitialCamera stop={manifest.stops[0]} />
          <WalkthroughScene manifest={manifest} mode={mode} stopIndex={stopIndex} />
        </Canvas>
      </KeyboardControls>

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        <div style={{ ...panelStyle, pointerEvents: 'auto' }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{manifest.property_id}</div>
          <div style={{ fontWeight: 700 }}>{stop?.name ?? 'Walkthrough'}</div>
          {stop?.room_code && <div style={{ fontSize: 12, opacity: 0.8 }}>Room: {stop.room_code}</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <button type="button" onClick={() => setMode('tour')} style={tabStyle(mode === 'tour')}>
            Guided Tour
          </button>
          <button type="button" onClick={() => setMode('explore')} style={tabStyle(mode === 'explore')}>
            Free Walk
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {mode === 'tour' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={goPrev} disabled={stopIndex === 0} style={buttonStyle}>
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={stopIndex >= manifest.stops.length - 1}
              style={buttonStyle}
            >
              Next
            </button>
          </div>
        ) : (
          <div style={hintStyle}>Click the view to lock the mouse, then use WASD or arrow keys to walk.</div>
        )}

        <div style={hintStyle}>
          Stop {stopIndex + 1} / {manifest.stops.length}
        </div>
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.82)',
  color: '#f8fafc',
  padding: '10px 14px',
  borderRadius: 10,
};

const tabStyle = (active: boolean): CSSProperties => ({
  border: 'none',
  borderRadius: 8,
  padding: '8px 12px',
  cursor: 'pointer',
  background: active ? '#2563eb' : 'rgba(15, 23, 42, 0.82)',
  color: '#f8fafc',
  fontWeight: 600,
});

const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '10px 14px',
  cursor: 'pointer',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
};

const hintStyle: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.82)',
  color: '#e2e8f0',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 13,
};
