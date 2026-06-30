'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Star, Trash2, Images, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PhotoLightbox } from '@/components/dynasty/photo-lightbox'
import { PropertyDTO, getPropertyDisplayName } from '@/lib/property-utils'
import { PropertyImageDTO } from '@/lib/gallery-utils'

const MAX_PHOTO_BYTES = 15 * 1024 * 1024

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    return {}
  }
}

export function PropertyGallery(props: {
  property: PropertyDTO
  images: PropertyImageDTO[]
  onImagesChange: (images: PropertyImageDTO[]) => void
  onCoverChanged?: (property: PropertyDTO) => void
}) {
  const { property, images, onImagesChange, onCoverChanged } = props
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const propertyId = property?.id ?? ''

  const applyImages = (next: PropertyImageDTO[]) => {
    onImagesChange(next)
    const cover = next.find((image) => image.isPrimary) ?? next[0] ?? null
    onCoverChanged?.({ ...property, photoUrl: cover?.url ?? null })
  }

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event?.target?.files
    if (event?.target) {
      event.target.value = ''
    }
    if (!fileList || fileList.length === 0) {
      return
    }
    const files = Array.from(fileList)

    setIsUploading(true)
    setProgress({ done: 0, total: files.length })
    let successCount = 0
    let lastImages: PropertyImageDTO[] = []
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        if (!file.type?.startsWith('image/')) {
          toast.error(`"${file.name}" is not an image and was skipped.`)
          setProgress({ done: i + 1, total: files.length })
          continue
        }
        if (file.size > MAX_PHOTO_BYTES) {
          toast.error(`"${file.name}" is larger than 15MB and was skipped.`)
          setProgress({ done: i + 1, total: files.length })
          continue
        }
        try {
          const form = new FormData()
          form.append('file', file)
          const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/upload-photo`, {
            method: 'POST',
            body: form,
          })
          const payload = await safeJson(response)
          if (!response?.ok) {
            throw new Error(typeof payload?.error === 'string' ? payload.error : `Failed to upload "${file.name}".`)
          }
          if (Array.isArray(payload?.images)) {
            lastImages = payload.images as PropertyImageDTO[]
          }
          successCount += 1
        } catch (error: unknown) {
          console.error('Single photo upload failed', error)
          toast.error(error instanceof Error ? error.message : `Failed to upload "${file.name}".`)
        }
        setProgress({ done: i + 1, total: files.length })
      }

      if (successCount === 0) {
        return
      }
      applyImages(lastImages)
      toast.success(successCount === 1 ? 'Photo added.' : `${successCount} photos added.`)
    } catch (error: unknown) {
      console.error('Gallery upload failed', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
      setProgress(null)
    }
  }

  const handleSetCover = async (imageId: string) => {
    setPendingId(imageId)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/images/${encodeURIComponent(imageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makePrimary: true }),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to set cover photo.')
      }
      const next = Array.isArray(payload?.images) ? (payload.images as PropertyImageDTO[]) : []
      applyImages(next)
      toast.success('Cover photo updated.')
    } catch (error: unknown) {
      console.error('Set cover failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to set cover photo.')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (imageId: string) => {
    const confirmed = window.confirm('Remove this photo? This cannot be undone.')
    if (!confirmed) {
      return
    }
    setPendingId(imageId)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/images/${encodeURIComponent(imageId)}`, { method: 'DELETE' })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to remove photo.')
      }
      const next = Array.isArray(payload?.images) ? (payload.images as PropertyImageDTO[]) : []
      applyImages(next)
      toast.success('Photo removed.')
    } catch (error: unknown) {
      console.error('Delete photo failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to remove photo.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <Images className="h-5 w-5 text-[var(--dynasty-gold)]" /> Photo gallery
          </CardTitle>
          <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">
            {images.length === 0
              ? 'Upload listing photos for this property. The cover photo appears on cards, the dashboard, and investor share pages.'
              : `${images.length} photo${images.length === 1 ? '' : 's'} · the starred photo is the cover.`}
          </p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <Button
            type="button"
            loading={isUploading}
            onClick={() => fileInputRef?.current?.click?.()}
            className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]"
          >
            <ImagePlus className="h-4 w-4" /> Upload photos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {progress && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-[var(--dynasty-navy)]/8 px-4 py-2 text-sm font-semibold text-[var(--dynasty-navy)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading {progress.done} of {progress.total}...
          </div>
        )}

        {images.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef?.current?.click?.()}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--dynasty-tan)]/60 bg-white/60 px-6 py-14 text-center transition hover:border-[var(--dynasty-gold)] hover:bg-white"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dynasty-tan)]/20 text-[var(--dynasty-gold)]"><ImagePlus className="h-6 w-6" /></span>
            <span className="font-display text-lg font-bold text-[var(--dynasty-navy)]">Add property photos</span>
            <span className="text-sm text-[var(--dynasty-black)]/60">Click to upload JPG, PNG, or WebP images (up to 15MB each). You can select multiple at once.</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => {
              const busy = pendingId === image.id
              return (
                <div key={image.id} className="group relative overflow-hidden rounded-lg bg-[var(--dynasty-navy)] shadow-sm">
                  <div className="relative aspect-[4/3] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.caption || `${getPropertyDisplayName(property)} photo ${index + 1}`}
                      className="h-full w-full cursor-zoom-in object-cover transition duration-300 group-hover:scale-[1.04]"
                      onClick={() => setLightboxIndex(index)}
                    />
                    {image.isPrimary && (
                      <Badge className="absolute left-2 top-2 border-0 bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] shadow"><Star className="mr-1 h-3 w-3 fill-current" /> Cover</Badge>
                    )}
                    {busy && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>
                    )}
                    <button
                      type="button"
                      aria-label="View larger"
                      onClick={() => setLightboxIndex(index)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-1 bg-[var(--dynasty-navy)] px-2 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy || image.isPrimary}
                      onClick={() => handleSetCover(image.id)}
                      className="h-8 px-2 text-xs text-[#F8F7F2] hover:bg-white/15 disabled:opacity-40"
                    >
                      <Star className={`h-3.5 w-3.5 ${image.isPrimary ? 'fill-[var(--dynasty-gold)] text-[var(--dynasty-gold)]' : ''}`} /> {image.isPrimary ? 'Cover' : 'Set cover'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      onClick={() => handleDelete(image.id)}
                      aria-label="Remove photo"
                      className="text-[#F8F7F2] hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <PhotoLightbox
        images={images.map((image) => ({ url: image.url, caption: image.caption }))}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </Card>
  )
}
