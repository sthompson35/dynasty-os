import { Building2 } from 'lucide-react'

export function BrandMark(props: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Dynasty PropertyOS">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--dynasty-navy)] shadow-md ring-1 ring-[var(--dynasty-gold)]/30">
        <Building2 className="h-5 w-5 text-[var(--dynasty-gold)]" aria-hidden="true" />
      </div>
      {!props?.compact && (
        <div className="leading-tight">
          <p className="font-display text-lg font-black tracking-tight text-[var(--dynasty-navy)]">Dynasty</p>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--dynasty-tan)]">PropertyOS</p>
        </div>
      )}
    </div>
  )
}
