'use client'

// The actual WebGL scene. This module is dynamically imported with ssr:false
// so three.js never runs on the server (no hydration mismatch, no SSR cost).
// The model is procedurally generated from real property data so it reads as a
// genuine digital twin rather than decoration.

import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, RoundedBox, ContactShadows, Html } from '@react-three/drei'
import * as THREE from 'three'
import { GRID, getBlockType } from '@/lib/builder-utils'
import { PropertyDTO, formatCompactCurrency, formatCurrency, formatPercent } from '@/lib/property-utils'
import { TwinModel, TwinOverlayMode } from '@/lib/twin-utils'

const NAVY = '#0B1F3A'
const TAN = '#B6A17A'
const GOLD = '#C59D3D'
const IVORY = '#F8F7F2'
const WALL = '#E8E1D1'
const RISK = '#C2410C'
const DANGER = '#DC2626'
const GOOD = '#16A34A'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Deterministic hash so any procedural variation is identical on every render.
function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function GlassPane(props: { position: [number, number, number]; size: [number, number]; dusk: boolean; rotation?: [number, number, number] }) {
  const [w, h] = props.size
  return (
    <mesh position={props.position} rotation={props.rotation ?? [0, 0, 0]} castShadow>
      <boxGeometry args={[w, h, 0.08]} />
      <meshStandardMaterial
        color={props.dusk ? GOLD : '#9FB4C9'}
        emissive={props.dusk ? GOLD : '#1c2c3f'}
        emissiveIntensity={props.dusk ? 0.85 : 0.12}
        metalness={0.1}
        roughness={0.25}
      />
    </mesh>
  )
}

function Tree(props: { position: [number, number, number]; scale?: number }) {
  const s = props.scale ?? 1
  return (
    <group position={props.position} scale={s}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 0.8, 8]} />
        <meshStandardMaterial color="#6b4f2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <coneGeometry args={[0.55, 1.3, 10]} />
        <meshStandardMaterial color="#4f6f4a" roughness={0.85} />
      </mesh>
    </group>
  )
}

function SingleFamilyModel(props: { property: PropertyDTO; dusk: boolean }) {
  const sqft = props.property.sqft ?? 1800
  const floors = sqft >= 2400 ? 2 : 1
  const width = clamp(3.4 + sqft / 900, 3.6, 7)
  const depth = width * 0.78
  const floorH = 1.55
  const bodyH = floors * floorH
  const roofH = 1.45
  const half = width / 2
  const frontZ = depth / 2

  const windows = useMemo(() => {
    const panes: { position: [number, number, number]; size: [number, number]; rotation?: [number, number, number] }[] = []
    for (let f = 0; f < floors; f += 1) {
      const y = 0.85 + f * floorH
      const cols = width > 5 ? [-half * 0.55, half * 0.55] : [-half * 0.5, half * 0.5]
      cols.forEach((x) => {
        // skip ground-floor center for door clearance is handled by offset cols
        panes.push({ position: [x, y, frontZ + 0.04], size: [0.7, 0.9] })
      })
      // side windows
      panes.push({ position: [half + 0.04, y, 0], size: [0.7, 0.9], rotation: [0, Math.PI / 2, 0] })
      panes.push({ position: [-half - 0.04, y, 0], size: [0.7, 0.9], rotation: [0, Math.PI / 2, 0] })
    }
    return panes
  }, [floors, floorH, half, frontZ, width])

  return (
    <group position={[0, 0, 0]}>
      {/* body */}
      <RoundedBox args={[width, bodyH, depth]} radius={0.05} smoothness={3} position={[0, bodyH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={WALL} roughness={0.8} metalness={0.02} />
      </RoundedBox>
      {/* hip roof */}
      <mesh position={[0, bodyH + roofH / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[width * 0.82, roofH, 4]} />
        <meshStandardMaterial color={NAVY} roughness={0.6} metalness={0.05} />
      </mesh>
      {/* chimney */}
      <mesh position={[half * 0.5, bodyH + roofH * 0.55, -depth * 0.15]} castShadow>
        <boxGeometry args={[0.4, 1.1, 0.4]} />
        <meshStandardMaterial color={TAN} roughness={0.85} />
      </mesh>
      {/* door */}
      <mesh position={[0, 0.65, frontZ + 0.05]} castShadow>
        <boxGeometry args={[0.85, 1.3, 0.1]} />
        <meshStandardMaterial color={GOLD} metalness={0.4} roughness={0.35} emissive={props.dusk ? GOLD : '#000000'} emissiveIntensity={props.dusk ? 0.3 : 0} />
      </mesh>
      {/* stoop */}
      <mesh position={[0, 0.08, frontZ + 0.45]} receiveShadow castShadow>
        <boxGeometry args={[1.5, 0.16, 0.8]} />
        <meshStandardMaterial color={TAN} roughness={0.9} />
      </mesh>
      {windows.map((pane, index) => (
        <GlassPane key={index} position={pane.position} size={pane.size} rotation={pane.rotation} dusk={props.dusk} />
      ))}
    </group>
  )
}

function MultiFamilyModel(props: { property: PropertyDTO; dusk: boolean }) {
  const sqft = props.property.sqft ?? 6000
  const beds = props.property.bedrooms ?? 0
  const floors = clamp(Math.max(beds ? Math.ceil(beds / 2) : 0, Math.round(sqft / 1400), 3), 3, 8)
  const width = clamp(4 + sqft / 4000, 4.2, 7.5)
  const depth = width * 0.85
  const floorH = 1.35
  const bodyH = floors * floorH
  const half = width / 2
  const frontZ = depth / 2

  const panes = useMemo(() => {
    const out: { position: [number, number, number]; size: [number, number]; rotation?: [number, number, number] }[] = []
    const cols = Math.max(3, Math.round(width / 1.4))
    for (let f = 0; f < floors; f += 1) {
      const y = 0.85 + f * floorH
      for (let c = 0; c < cols; c += 1) {
        const x = -half + (half * 2 * (c + 0.5)) / cols
        out.push({ position: [x, y, frontZ + 0.03], size: [0.55, 0.75] })
        out.push({ position: [x, y, -frontZ - 0.03], size: [0.55, 0.75], rotation: [0, Math.PI, 0] })
      }
      const sideCols = Math.max(2, Math.round(depth / 1.5))
      for (let c = 0; c < sideCols; c += 1) {
        const z = -depth / 2 + (depth * (c + 0.5)) / sideCols
        out.push({ position: [half + 0.03, y, z], size: [0.55, 0.75], rotation: [0, Math.PI / 2, 0] })
        out.push({ position: [-half - 0.03, y, z], size: [0.55, 0.75], rotation: [0, Math.PI / 2, 0] })
      }
    }
    return out
  }, [floors, floorH, half, frontZ, width, depth])

  return (
    <group position={[0, 0, 0]}>
      <RoundedBox args={[width, bodyH, depth]} radius={0.08} smoothness={3} position={[0, bodyH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={NAVY} roughness={0.55} metalness={0.08} />
      </RoundedBox>
      {/* parapet cap */}
      <mesh position={[0, bodyH + 0.1, 0]} castShadow>
        <boxGeometry args={[width + 0.15, 0.2, depth + 0.15]} />
        <meshStandardMaterial color={TAN} roughness={0.7} />
      </mesh>
      {/* rooftop unit */}
      <mesh position={[half * 0.3, bodyH + 0.5, -depth * 0.2]} castShadow>
        <boxGeometry args={[1.4, 0.7, 1.2]} />
        <meshStandardMaterial color={TAN} roughness={0.8} />
      </mesh>
      {/* entrance canopy */}
      <mesh position={[0, 1.35, frontZ + 0.45]} castShadow>
        <boxGeometry args={[2, 0.16, 0.9]} />
        <meshStandardMaterial color={GOLD} metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.7, frontZ + 0.06]} castShadow>
        <boxGeometry args={[1.6, 1.4, 0.1]} />
        <meshStandardMaterial color={GOLD} metalness={0.45} roughness={0.3} emissive={props.dusk ? GOLD : '#000000'} emissiveIntensity={props.dusk ? 0.35 : 0} />
      </mesh>
      {panes.map((pane, index) => (
        <GlassPane key={index} position={pane.position} size={pane.size} rotation={pane.rotation} dusk={props.dusk} />
      ))}
    </group>
  )
}

function LandModel(props: { property: PropertyDTO; dusk: boolean }) {
  const lot = props.property.lotSize ?? 0.5
  const span = clamp(4 + Math.sqrt(Math.max(lot, 0.05)) * 6, 5, 9)
  const half = span / 2

  const trees = useMemo(() => {
    const out: { position: [number, number, number]; scale: number }[] = []
    const count = 5
    for (let i = 0; i < count; i += 1) {
      const r = (hashString(`${props.property.id}-${i}-x`) - 0.5) * span * 0.8
      const z = (hashString(`${props.property.id}-${i}-z`) - 0.5) * span * 0.8
      const s = 0.7 + hashString(`${props.property.id}-${i}-s`) * 0.7
      out.push({ position: [r, 0, z], scale: s })
    }
    return out
  }, [props.property.id, span])

  return (
    <group position={[0, 0, 0]}>
      {/* terrain plate */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[span, 0.2, span]} />
        <meshStandardMaterial color={props.dusk ? '#3f5a3c' : '#5d7a4f'} roughness={0.95} />
      </mesh>
      {/* navy survey border */}
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[half * 0.96, half, 4]} />
        <meshStandardMaterial color={NAVY} side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
      {/* corner stakes */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], index) => (
        <group key={index} position={[sx * half * 0.92, 0, sz * half * 0.92]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
            <meshStandardMaterial color={IVORY} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.12, 0]} castShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.3} emissive={props.dusk ? GOLD : '#000000'} emissiveIntensity={props.dusk ? 0.4 : 0} />
          </mesh>
        </group>
      ))}
      {/* development sign */}
      <group position={[half * 0.2, 0, half * 0.1]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.8, 6]} />
          <meshStandardMaterial color={TAN} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.7, 0]} castShadow>
          <boxGeometry args={[1.6, 0.9, 0.08]} />
          <meshStandardMaterial color={NAVY} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.7, 0.05]}>
          <boxGeometry args={[1.4, 0.7, 0.04]} />
          <meshStandardMaterial color={GOLD} metalness={0.4} roughness={0.35} emissive={props.dusk ? GOLD : '#000000'} emissiveIntensity={props.dusk ? 0.3 : 0} />
        </mesh>
      </group>
      {trees.map((tree, index) => (
        <Tree key={index} position={tree.position} scale={tree.scale} />
      ))}
    </group>
  )
}

function GenericModel(props: { property: PropertyDTO; dusk: boolean }) {
  const sqft = props.property.sqft ?? 4000
  const width = clamp(4 + sqft / 2200, 4.5, 8)
  const depth = width * 0.7
  const bodyH = 2.6
  const frontZ = depth / 2
  const half = width / 2

  const panes = useMemo(() => {
    const out: { position: [number, number, number]; size: [number, number] }[] = []
    const cols = Math.max(3, Math.round(width / 1.3))
    for (let c = 0; c < cols; c += 1) {
      const x = -half + (half * 2 * (c + 0.5)) / cols
      out.push({ position: [x, 1.3, frontZ + 0.04], size: [0.8, 1.6] })
    }
    return out
  }, [width, half, frontZ])

  return (
    <group position={[0, 0, 0]}>
      <RoundedBox args={[width, bodyH, depth]} radius={0.06} smoothness={3} position={[0, bodyH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={NAVY} roughness={0.55} metalness={0.1} />
      </RoundedBox>
      {/* gold band */}
      <mesh position={[0, bodyH - 0.3, 0]} castShadow>
        <boxGeometry args={[width + 0.08, 0.28, depth + 0.08]} />
        <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* canopy */}
      <mesh position={[0, 1.1, frontZ + 0.4]} castShadow>
        <boxGeometry args={[width * 0.6, 0.14, 0.8]} />
        <meshStandardMaterial color={TAN} roughness={0.7} />
      </mesh>
      {panes.map((pane, index) => (
        <GlassPane key={index} position={pane.position} size={pane.size} dusk={props.dusk} />
      ))}
    </group>
  )
}

function PropertyModel(props: { property: PropertyDTO; dusk: boolean }) {
  const type = props.property.propertyType
  if (type === 'multi-family') return <MultiFamilyModel property={props.property} dusk={props.dusk} />
  if (type === 'land') return <LandModel property={props.property} dusk={props.dusk} />
  if (type === 'single-family') return <SingleFamilyModel property={props.property} dusk={props.dusk} />
  return <GenericModel property={props.property} dusk={props.dusk} />
}

function zoneColor(status: string): string {
  if (status === 'risk') return DANGER
  if (status === 'watch') return RISK
  if (status === 'good') return GOOD
  return '#94A3B8'
}

function ConditionOverlay(props: { twin: TwinModel }) {
  const roof = props.twin.conditionZones.find((zone) => zone.id === 'roof')
  const hvac = props.twin.conditionZones.find((zone) => zone.id === 'hvac')
  const kitchen = props.twin.conditionZones.find((zone) => zone.id === 'kitchen')
  const baths = props.twin.conditionZones.find((zone) => zone.id === 'bathrooms')
  const foundation = props.twin.conditionZones.find((zone) => zone.id === 'foundation')
  return (
    <group>
      {roof && (
        <mesh position={[0, 3.55, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[4.9, 0.35, 4]} />
          <meshStandardMaterial color={zoneColor(roof.status)} transparent opacity={0.58} emissive={zoneColor(roof.status)} emissiveIntensity={0.12} />
        </mesh>
      )}
      {hvac && (
        <mesh position={[2.25, 2.95, -1.1]}>
          <boxGeometry args={[1.05, 0.35, 0.85]} />
          <meshStandardMaterial color={zoneColor(hvac.status)} transparent opacity={0.78} />
        </mesh>
      )}
      {kitchen && (
        <mesh position={[1.55, 1.25, 2.35]}>
          <boxGeometry args={[1.55, 1.55, 0.18]} />
          <meshStandardMaterial color={zoneColor(kitchen.status)} transparent opacity={0.72} />
        </mesh>
      )}
      {baths && (
        <mesh position={[-1.55, 1.25, 2.35]}>
          <boxGeometry args={[1.25, 1.35, 0.18]} />
          <meshStandardMaterial color={zoneColor(baths.status)} transparent opacity={0.72} />
        </mesh>
      )}
      {foundation && (
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[6.1, 0.18, 4.6]} />
          <meshStandardMaterial color={zoneColor(foundation.status)} transparent opacity={0.42} />
        </mesh>
      )}
    </group>
  )
}

function BuilderGeometry(props: { twin: TwinModel }) {
  if (!props.twin.hasBuilderGeometry) return null
  const scale = props.twin.activeMode === 'land' ? 0.18 : 0.16
  const offsetX = -(GRID.cols * scale) / 2
  const offsetZ = -(GRID.rows * scale) / 2
  return (
    <group position={[0, 0.08, 0]}>
      {props.twin.activeBlocks.map((block) => {
        const type = getBlockType(block.kind)
        const h = props.twin.activeMode === 'land' ? 0.28 + (type?.units ?? 0) * 0.18 : 0.2
        const x = offsetX + (block.x + block.w / 2) * scale
        const z = offsetZ + (block.y + block.h / 2) * scale
        return (
          <group key={block.id} position={[x, h / 2, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[block.w * scale, h, block.h * scale]} />
              <meshStandardMaterial color={type?.fill ?? TAN} roughness={0.72} transparent opacity={0.82} />
            </mesh>
            <Html position={[0, h + 0.1, 0]} center distanceFactor={13} style={{ pointerEvents: 'none' }} zIndexRange={[15, 0]}>
              <div className="rounded-md bg-[#0B1F3A]/88 px-2 py-1 text-[10px] font-black text-[#F8F7F2] shadow-lg">
                {block.label}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

function ProgressOverlay(props: { twin: TwinModel }) {
  return (
    <group>
      {props.twin.progress.stages.map((stage, index) => {
        const x = -4.5 + index * 1.8
        const color = stage.active ? GOLD : stage.complete ? GOOD : '#94A3B8'
        return (
          <group key={stage.id} position={[x, 0.08, -4.7]}>
            <mesh castShadow>
              <boxGeometry args={[1.35, stage.complete || stage.active ? 0.32 : 0.16, 0.38]} />
              <meshStandardMaterial color={color} roughness={0.6} emissive={stage.active ? color : '#000000'} emissiveIntensity={stage.active ? 0.18 : 0} />
            </mesh>
            <Html position={[0, 0.55, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
              <div className="whitespace-nowrap rounded-md bg-[#0B1F3A]/88 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#F8F7F2]">
                {stage.label}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

function CompareOverlay() {
  return (
    <group position={[2.9, 0, -0.4]}>
      <RoundedBox args={[4.8, 2.7, 3.4]} radius={0.05} smoothness={3} position={[0, 1.35, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={GOOD} roughness={0.72} transparent opacity={0.24} />
      </RoundedBox>
      <Html position={[0, 3.1, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div className="rounded-lg border border-[#16A34A]/50 bg-[#0B1F3A]/92 px-3 py-1.5 text-center shadow-xl">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#16A34A]">Projected</div>
          <div className="text-xs font-black text-[#F8F7F2]">After rehab</div>
        </div>
      </Html>
    </group>
  )
}

function Hotspot(props: { position: [number, number, number]; label: string; value: string; tone?: string }) {
  return (
    <Html position={props.position} center distanceFactor={11} style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
      <div className="flex min-w-[88px] flex-col items-center rounded-lg border border-[#C59D3D]/60 bg-[#0B1F3A]/92 px-3 py-1.5 text-center shadow-xl backdrop-blur-sm">
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: props.tone ?? '#C59D3D' }}>{props.label}</span>
        <span className="whitespace-nowrap text-[13px] font-black text-[#F8F7F2]">{props.value}</span>
      </div>
    </Html>
  )
}

function SceneHotspots(props: { property: PropertyDTO; twin: TwinModel; overlayMode: TwinOverlayMode }) {
  const p = props.property
  const value = p.currentValue ?? p.purchasePrice
  const bedBath: string[] = []
  if (p.bedrooms !== null) bedBath.push(`${p.bedrooms} bd`)
  if (p.bathrooms !== null) bedBath.push(`${p.bathrooms} ba`)
  if (props.overlayMode === 'rehab') {
    return (
      <group>
        {props.twin.rehabRooms.slice(0, 4).map((room, index) => (
          <Hotspot
            key={room.room}
            position={[-3.6 + index * 2.4, 3.1 + (index % 2) * 0.55, 2.4]}
            label={room.room}
            value={formatCurrency(room.total)}
            tone={GOLD}
          />
        ))}
        {props.twin.rehabRooms.length === 0 && <Hotspot position={[0, 4.8, 0]} label="Rehab scope" value="No line items" />}
      </group>
    )
  }
  if (props.overlayMode === 'condition') {
    return (
      <group>
        {props.twin.conditionZones.map((zone, index) => (
          <Hotspot
            key={zone.id}
            position={[-4.4 + index * 2.2, 4.3 + (index % 2) * 0.5, 0.7]}
            label={zone.label}
            value={zone.status === 'unknown' ? 'No scope' : zone.note}
            tone={zoneColor(zone.status)}
          />
        ))}
      </group>
    )
  }
  if (props.overlayMode === 'progress') {
    return (
      <group>
        <Hotspot position={[0, 5.4, 0]} label="Construction" value={`${formatPercent(props.twin.progress.percent)} ${props.twin.progress.stage}`} tone={GOLD} />
      </group>
    )
  }
  if (props.overlayMode === 'compare') {
    return (
      <group>
        <Hotspot position={[-2.8, 4.4, 0]} label="Current" value={value !== null ? formatCompactCurrency(value) : 'Baseline'} />
        <Hotspot position={[3.4, 4.8, 0]} label="Projected ARV" value={formatCompactCurrency(props.twin.acquisition.arv)} tone={GOOD} />
      </group>
    )
  }
  return (
    <group>
      {value !== null && <Hotspot position={[0, 5.4, 0]} label="Est. value" value={formatCompactCurrency(value)} />}
      <Hotspot position={[0, 4.5, 1.7]} label="Profit" value={formatCompactCurrency(props.twin.acquisition.profit)} tone={props.twin.acquisition.riskTone === 'good' ? GOOD : props.twin.acquisition.riskTone === 'watch' ? RISK : DANGER} />
      <Hotspot position={[0, 3.6, -1.9]} label="ROI" value={formatPercent(props.twin.acquisition.roi)} />
      {bedBath.length > 0 && <Hotspot position={[-3.6, 2.4, 1.6]} label="Layout" value={bedBath.join(' / ')} />}
      {p.sqft !== null && <Hotspot position={[3.6, 1.6, 1.6]} label="Size" value={`${p.sqft.toLocaleString('en-US')} sqft`} />}
    </group>
  )
}

type Property3DSceneProps = {
  property: PropertyDTO
  twin: TwinModel
  overlayMode: TwinOverlayMode
  autoRotate: boolean
  dusk: boolean
  showHotspots: boolean
  resetSignal: number
}

function Rig(props: { resetSignal: number; autoRotate: boolean }) {
  const controlsRef = useRef<any>(null)
  useEffect(() => {
    if (controlsRef.current?.reset) {
      controlsRef.current.reset()
    }
  }, [props.resetSignal])
  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={6}
      maxDistance={20}
      maxPolarAngle={Math.PI / 2.05}
      autoRotate={props.autoRotate}
      autoRotateSpeed={0.9}
      target={[0, 1.5, 0]}
    />
  )
}

export default function Property3DScene(props: Property3DSceneProps) {
  const bg = props.dusk ? '#161d2e' : '#e9edf3'
  const groundColor = props.dusk ? '#cdbf9f' : IVORY

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [9, 6.5, 11], fov: 42 }} gl={{ antialias: true, preserveDrawingBuffer: false }}>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 22, 42]} />

      <hemisphereLight args={[props.dusk ? '#2a3550' : '#ffffff', '#5a4f3a', props.dusk ? 0.35 : 0.7]} />
      <ambientLight intensity={props.dusk ? 0.25 : 0.5} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={props.dusk ? 0.9 : 1.5}
        color={props.dusk ? '#ffd9a0' : '#ffffff'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {props.dusk && <pointLight position={[-6, 3, -4]} intensity={0.6} color={GOLD} distance={20} />}

      {/* ground pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[7.2, 7.6, 64]} />
        <meshStandardMaterial color={TAN} side={THREE.DoubleSide} roughness={0.8} transparent opacity={0.5} />
      </mesh>

      <PropertyModel property={props.property} dusk={props.dusk} />
      {props.overlayMode === 'condition' && <ConditionOverlay twin={props.twin} />}
      {props.overlayMode === 'progress' && <ProgressOverlay twin={props.twin} />}
      {props.overlayMode === 'compare' && <CompareOverlay />}
      {props.twin.hasBuilderGeometry && <BuilderGeometry twin={props.twin} />}
      {props.showHotspots && <SceneHotspots property={props.property} twin={props.twin} overlayMode={props.overlayMode} />}

      <ContactShadows position={[0, 0.02, 0]} opacity={props.dusk ? 0.5 : 0.38} scale={22} blur={2.4} far={9} resolution={512} color="#0B1F3A" />

      <Rig resetSignal={props.resetSignal} autoRotate={props.autoRotate} />
    </Canvas>
  )
}
