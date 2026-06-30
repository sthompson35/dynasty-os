'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Building2 } from 'lucide-react'

export function PropertyPhoto(props: { src?: string | null; alt: string; className?: string }) {
  const [hasError, setHasError] = useState(false)
  const hasSrc = Boolean(props?.src?.trim?.()) && !hasError
  const src = hasSrc ? props?.src ?? '/property-placeholder.svg' : '/property-placeholder.svg'

  return (
    <div className={`relative overflow-hidden rounded-lg bg-[var(--dynasty-navy)] shadow-md ${props?.className ?? ''}`}>
      <Image
        src={src}
        alt={props?.alt ?? 'Property photo'}
        fill
        sizes="(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw"
        className="object-cover transition-transform duration-500 hover:scale-[1.03]"
        onError={() => setHasError(true)}
      />
      {!hasSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--dynasty-navy)]/8">
          <Building2 className="h-10 w-10 text-[var(--dynasty-gold)]" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
