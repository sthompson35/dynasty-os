'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bath, BedDouble, Building2, CalendarDays, DollarSign, FileText, Home, ImageIcon, MapPin, Ruler, Save, StickyNote, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PROPERTY_STATUS_OPTIONS, PROPERTY_TYPE_OPTIONS, PropertyDTO } from '@/lib/property-utils'
import { PropertyPhoto } from '@/components/dynasty/property-photo'

const MAX_PHOTO_BYTES = 15 * 1024 * 1024

type PropertyFormMode = 'create' | 'edit'

type PropertyFormState = {
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  bedrooms: string
  bathrooms: string
  sqft: string
  lotSize: string
  yearBuilt: string
  purchasePrice: string
  currentValue: string
  status: string
  photoUrl: string
  notes: string
  arv: string
  repairCosts: string
  holdingCosts: string
  closingCosts: string
}

type PropertyFormProps = {
  mode: PropertyFormMode
  property?: PropertyDTO | null
  onSaved?: (property: PropertyDTO) => void
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function createFormState(property: PropertyDTO | null | undefined): PropertyFormState {
  return {
    address: property?.address ?? '',
    city: property?.city ?? '',
    state: property?.state ?? '',
    zip: property?.zip ?? '',
    propertyType: property?.propertyType ?? 'single-family',
    bedrooms: stringValue(property?.bedrooms),
    bathrooms: stringValue(property?.bathrooms),
    sqft: stringValue(property?.sqft),
    lotSize: stringValue(property?.lotSize),
    yearBuilt: stringValue(property?.yearBuilt),
    purchasePrice: stringValue(property?.purchasePrice),
    currentValue: stringValue(property?.currentValue),
    status: property?.status ?? 'prospect',
    photoUrl: property?.photoUrl ?? '',
    notes: property?.notes ?? '',
    arv: stringValue(property?.arv),
    repairCosts: stringValue(property?.repairCosts),
    holdingCosts: stringValue(property?.holdingCosts),
    closingCosts: stringValue(property?.closingCosts),
  }
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse property form response', error)
    return {}
  }
}

function TextField(props: {
  id: keyof PropertyFormState
  label: string
  icon: React.ReactNode
  value: string
  type?: string
  placeholder?: string
  step?: string
  required?: boolean
  onChange: (field: keyof PropertyFormState, value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props?.id} className="flex items-center gap-2 text-[var(--dynasty-navy)]">
        {props?.icon} {props?.label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dynasty-tan)]">{props?.icon}</span>
        <Input
          id={props?.id}
          type={props?.type ?? 'text'}
          value={props?.value ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => props?.onChange?.(props?.id, event?.target?.value ?? '')}
          placeholder={props?.placeholder}
          step={props?.step}
          required={props?.required}
          className="pl-10"
        />
      </div>
    </div>
  )
}

export function PropertyForm(props: PropertyFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<PropertyFormState>(() => createFormState(props?.property ?? null))
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mode = props?.mode ?? 'create'
  const isEdit = mode === 'edit'

  useEffect(() => {
    setForm(createFormState(props?.property ?? null))
    // Reset only when switching to a different property record (id change), not on
    // every parent re-render that creates a new props.property reference with the
    // same values — that would discard whatever the user is currently typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.property?.id])

  const updateField = (field: keyof PropertyFormState, value: string) => {
    setForm((previous: PropertyFormState) => ({ ...(previous ?? createFormState(null)), [field]: value ?? '' }))
  }

  const handlePhotoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files?.[0]
    // Reset so the same file can be picked again later.
    if (event?.target) {
      event.target.value = ''
    }
    if (!file) {
      return
    }
    if (!file.type?.startsWith?.('image/')) {
      toast.error('Please choose an image file (JPG, PNG, or WebP).')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Image is too large. Please upload an image up to 15MB.')
      return
    }

    setIsUploading(true)
    try {
      const presignResponse = await fetch('/api/uploads/property-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'image/jpeg' }),
      })
      const presignPayload = await safeJson(presignResponse)
      if (!presignResponse?.ok) {
        throw new Error(typeof presignPayload?.error === 'string' ? presignPayload.error : 'Unable to prepare upload.')
      }
      const uploadUrl = typeof presignPayload?.uploadUrl === 'string' ? presignPayload.uploadUrl : ''
      const publicUrl = typeof presignPayload?.publicUrl === 'string' ? presignPayload.publicUrl : ''
      if (!uploadUrl || !publicUrl) {
        throw new Error('Upload could not be prepared.')
      }

      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      })
      if (!putResponse?.ok) {
        throw new Error('Upload to storage failed.')
      }

      updateField('photoUrl', publicUrl)
      toast.success('Photo uploaded.')
    } catch (error: unknown) {
      console.error('Photo upload failed', error)
      toast.error(error instanceof Error ? error.message : 'Photo upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event?.preventDefault?.()

    if (!form?.address?.trim?.() || !form?.city?.trim?.() || !form?.state?.trim?.()) {
      toast.error('Address, city, and state are required.')
      return
    }

    setIsSaving(true)

    try {
      const endpoint = isEdit ? `/api/properties/${encodeURIComponent(props?.property?.id ?? '')}` : '/api/properties'
      const response = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await safeJson(response)

      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to save property.')
      }

      const savedProperty = payload?.property as PropertyDTO | undefined

      if (savedProperty?.id) {
        toast.success(isEdit ? 'Property updated.' : 'Property created.')
        props?.onSaved?.(savedProperty)
        if (!isEdit) {
          router.replace(`/properties/${savedProperty.id}`)
        }
      }
    } catch (error: unknown) {
      console.error('Save property failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to save property.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
          <Home className="h-5 w-5 text-[var(--dynasty-gold)]" /> {isEdit ? 'Edit property details' : 'Add a property'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="grid gap-4 md:grid-cols-2">
            <TextField id="address" label="Address" icon={<MapPin className="h-4 w-4" />} value={form?.address} onChange={updateField} placeholder="123 Main Street" required />
            <TextField id="city" label="City" icon={<Building2 className="h-4 w-4" />} value={form?.city} onChange={updateField} placeholder="Dallas" required />
            <TextField id="state" label="State" icon={<MapPin className="h-4 w-4" />} value={form?.state} onChange={updateField} placeholder="TX" required />
            <TextField id="zip" label="ZIP" icon={<MapPin className="h-4 w-4" />} value={form?.zip} onChange={updateField} placeholder="75208" />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[var(--dynasty-navy)]"><Home className="h-4 w-4 text-[var(--dynasty-gold)]" /> Property type</Label>
              <Select value={form?.propertyType} onValueChange={(value: string) => updateField('propertyType', value)}>
                <SelectTrigger><SelectValue placeholder="Property type" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS?.map?.((option) => <SelectItem key={option?.value} value={option?.value}>{option?.label}</SelectItem>) ?? []}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[var(--dynasty-navy)]"><FileText className="h-4 w-4 text-[var(--dynasty-gold)]" /> Status</Label>
              <Select value={form?.status} onValueChange={(value: string) => updateField('status', value)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUS_OPTIONS?.map?.((option) => <SelectItem key={option?.value} value={option?.value}>{option?.label}</SelectItem>) ?? []}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <TextField id="bedrooms" label="Bedrooms" icon={<BedDouble className="h-4 w-4" />} value={form?.bedrooms} onChange={updateField} type="number" step="1" />
            <TextField id="bathrooms" label="Bathrooms" icon={<Bath className="h-4 w-4" />} value={form?.bathrooms} onChange={updateField} type="number" step="0.5" />
            <TextField id="sqft" label="Square feet" icon={<Ruler className="h-4 w-4" />} value={form?.sqft} onChange={updateField} type="number" step="1" />
            <TextField id="lotSize" label="Lot size acres" icon={<Ruler className="h-4 w-4" />} value={form?.lotSize} onChange={updateField} type="number" step="0.01" />
            <TextField id="yearBuilt" label="Year built" icon={<CalendarDays className="h-4 w-4" />} value={form?.yearBuilt} onChange={updateField} type="number" step="1" />
          </section>

          <section className="space-y-3">
            <Label className="flex items-center gap-2 text-[var(--dynasty-navy)]">
              <ImageIcon className="h-4 w-4 text-[var(--dynasty-gold)]" /> Property photo
            </Label>
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <PropertyPhoto src={form?.photoUrl} alt={form?.address?.trim?.() ? `${form.address} photo` : 'Property photo'} className="aspect-[4/3] w-full" />
              <div className="flex flex-col gap-3">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    loading={isUploading}
                    onClick={() => fileInputRef?.current?.click?.()}
                    className="border-[var(--dynasty-tan)] text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/15"
                  >
                    <Upload className="h-4 w-4" /> {form?.photoUrl?.trim?.() ? 'Replace photo' : 'Upload photo'}
                  </Button>
                  {form?.photoUrl?.trim?.() ? (
                    <Button type="button" variant="ghost" onClick={() => updateField('photoUrl', '')} className="text-[var(--dynasty-navy)]">
                      <X className="h-4 w-4" /> Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--dynasty-navy)]/60">
                  Upload a JPG, PNG, or WebP image (up to 15MB) from your device, or paste an image URL below.
                </p>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dynasty-tan)]"><ImageIcon className="h-4 w-4" /></span>
                  <Input
                    id="photoUrl"
                    type="text"
                    value={form?.photoUrl ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateField('photoUrl', event?.target?.value ?? '')}
                    placeholder="Or paste an image URL..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <TextField id="purchasePrice" label="Purchase price" icon={<DollarSign className="h-4 w-4" />} value={form?.purchasePrice} onChange={updateField} type="number" step="100" />
            <TextField id="currentValue" label="Current value" icon={<DollarSign className="h-4 w-4" />} value={form?.currentValue} onChange={updateField} type="number" step="100" />
            <TextField id="arv" label="ARV" icon={<DollarSign className="h-4 w-4" />} value={form?.arv} onChange={updateField} type="number" step="100" />
            <TextField id="repairCosts" label="Repair costs" icon={<DollarSign className="h-4 w-4" />} value={form?.repairCosts} onChange={updateField} type="number" step="100" />
            <TextField id="holdingCosts" label="Holding costs" icon={<DollarSign className="h-4 w-4" />} value={form?.holdingCosts} onChange={updateField} type="number" step="100" />
            <TextField id="closingCosts" label="Closing costs" icon={<DollarSign className="h-4 w-4" />} value={form?.closingCosts} onChange={updateField} type="number" step="100" />
          </section>

          <section className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2 text-[var(--dynasty-navy)]"><StickyNote className="h-4 w-4 text-[var(--dynasty-gold)]" /> Notes</Label>
            <Textarea id="notes" value={form?.notes} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => updateField('notes', event?.target?.value ?? '')} placeholder="Deal notes, strategy, comps, or follow-up items..." className="min-h-[120px]" />
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" loading={isSaving} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
              <Save className="h-4 w-4" /> {isEdit ? 'Save changes' : 'Create property'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
