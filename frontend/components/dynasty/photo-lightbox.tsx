'use client'

import { useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export type LightboxImage = {
  url: string
  caption?: string | null
}

// A full-screen image viewer with keyboard + arrow navigation. Controlled via
// `index` (null = closed). Reused by the gallery manager and the detail header.
export function PhotoLightbox(props: {
  images: LightboxImage[]
  index: number | null
  onClose: () => void
  onIndexChange: (index: number) => void
}) {
  const { images, index, onClose, onIndexChange } = props
  const isOpen = index !== null && index >= 0 && index < (images?.length ?? 0)

  const goPrev = useCallback(() => {
    if (index === null || !images?.length) return
    onIndexChange((index - 1 + images.length) % images.length)
  }, [index, images, onIndexChange])

  const goNext = useCallback(() => {
    if (index === null || !images?.length) return
    onIndexChange((index + 1) % images.length)
  }, [index, images, onIndexChange])

  useEffect(() => {
    if (!isOpen) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose, goPrev, goNext])

  if (!isOpen || index === null) {
    return null
  }

  const current = images[index]
  const hasMultiple = images.length > 1

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/25"
      >
        <X className="h-5 w-5" />
      </button>

      {hasMultiple && (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); goPrev() }}
          aria-label="Previous photo"
          className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/25 sm:left-6"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      <figure className="flex max-h-[90vh] max-w-[92vw] flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current?.url}
          alt={current?.caption || `Photo ${index + 1}`}
          className="max-h-[80vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
        />
        <figcaption className="flex items-center gap-3 text-sm text-white/80">
          {current?.caption ? <span>{current.caption}</span> : null}
          <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold">{index + 1} / {images.length}</span>
        </figcaption>
      </figure>

      {hasMultiple && (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); goNext() }}
          aria-label="Next photo"
          className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/25 sm:right-6"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
