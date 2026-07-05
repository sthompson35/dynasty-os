'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PROPERTY_STATUS_OPTIONS, PROPERTY_TYPE_OPTIONS, PropertyMutationData } from '@/lib/property-utils'

type ReviewForm = {
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  status: string
  bedrooms: string
  bathrooms: string
  sqft: string
  lotSize: string
  yearBuilt: string
  purchasePrice: string
  currentValue: string
  arv: string
  repairCosts: string
  holdingCosts: string
  closingCosts: string
  notes: string
}

function stringValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function toReviewForm(data: PropertyMutationData): ReviewForm {
  return {
    address: data.address ?? '',
    city: data.city ?? '',
    state: data.state ?? '',
    zip: data.zip ?? '',
    propertyType: data.propertyType || 'single-family',
    status: data.status || 'prospect',
    bedrooms: stringValue(data.bedrooms),
    bathrooms: stringValue(data.bathrooms),
    sqft: stringValue(data.sqft),
    lotSize: stringValue(data.lotSize),
    yearBuilt: stringValue(data.yearBuilt),
    purchasePrice: stringValue(data.purchasePrice),
    currentValue: stringValue(data.currentValue),
    arv: stringValue(data.arv),
    repairCosts: stringValue(data.repairCosts),
    holdingCosts: stringValue(data.holdingCosts),
    closingCosts: stringValue(data.closingCosts),
    notes: data.notes ?? '',
  }
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function PropertyImportPdfDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState<ReviewForm | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setForm(null)
    setError(null)
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    props.onOpenChange(open)
  }

  const updateField = (field: keyof ReviewForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files?.[0]
    if (!file) return
    setIsExtracting(true)
    setError(null)
    setForm(null)

    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/properties/import/pdf', { method: 'POST', body })
      const payload = await safeJson(response)

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to extract property details from this PDF.')
      }

      setForm(toReviewForm(payload.row as PropertyMutationData))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to extract property details from this PDF.')
    } finally {
      setIsExtracting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!form) return
    if (!form.address || !form.city || !form.state) {
      toast.error('Address, city, and state are required.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await safeJson(response)

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to save this property.')
      }

      toast.success('Property imported.')
      props.onImported()
      handleClose(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save this property.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-black text-[var(--dynasty-navy)]">Import a property from PDF</DialogTitle>
          <DialogDescription>
            Upload a listing sheet, appraisal, or property report. A local LLM (LM Studio) extracts the details — review and correct them before saving.
          </DialogDescription>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFile} />

        {!form ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--dynasty-navy)]/20 bg-[#F8F7F2] p-10 text-center">
            <FileText className="h-10 w-10 text-[var(--dynasty-gold)]" />
            <p className="text-sm text-[var(--dynasty-black)]/65">Extraction runs on your local LM Studio instance and can take up to a minute.</p>
            <Button type="button" onClick={() => fileInputRef?.current?.click?.()} loading={isExtracting} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
              <Upload className="h-4 w-4" /> Choose PDF file
            </Button>
            {error && <p className="max-w-md text-sm font-semibold text-red-600">{error}</p>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="pdf-address">Address</Label>
              <Input id="pdf-address" value={form.address} onChange={(e) => updateField('address', e.target.value)} className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="pdf-city">City</Label>
              <Input id="pdf-city" value={form.city} onChange={(e) => updateField('city', e.target.value)} className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="pdf-state">State</Label>
              <Input id="pdf-state" value={form.state} onChange={(e) => updateField('state', e.target.value)} className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="pdf-zip">Zip</Label>
              <Input id="pdf-zip" value={form.zip} onChange={(e) => updateField('zip', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Property type</Label>
              <Select value={form.propertyType} onValueChange={(value) => updateField('propertyType', value)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => updateField('status', value)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pdf-bedrooms">Bedrooms</Label>
              <Input id="pdf-bedrooms" type="number" value={form.bedrooms} onChange={(e) => updateField('bedrooms', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-bathrooms">Bathrooms</Label>
              <Input id="pdf-bathrooms" type="number" step="0.5" value={form.bathrooms} onChange={(e) => updateField('bathrooms', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-sqft">Square feet</Label>
              <Input id="pdf-sqft" type="number" value={form.sqft} onChange={(e) => updateField('sqft', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-lotsize">Lot size</Label>
              <Input id="pdf-lotsize" type="number" value={form.lotSize} onChange={(e) => updateField('lotSize', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-yearbuilt">Year built</Label>
              <Input id="pdf-yearbuilt" type="number" value={form.yearBuilt} onChange={(e) => updateField('yearBuilt', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-purchaseprice">Purchase price</Label>
              <Input id="pdf-purchaseprice" type="number" value={form.purchasePrice} onChange={(e) => updateField('purchasePrice', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-currentvalue">Current value</Label>
              <Input id="pdf-currentvalue" type="number" value={form.currentValue} onChange={(e) => updateField('currentValue', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-arv">ARV</Label>
              <Input id="pdf-arv" type="number" value={form.arv} onChange={(e) => updateField('arv', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-repaircosts">Repair costs</Label>
              <Input id="pdf-repaircosts" type="number" value={form.repairCosts} onChange={(e) => updateField('repairCosts', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-holdingcosts">Holding costs</Label>
              <Input id="pdf-holdingcosts" type="number" value={form.holdingCosts} onChange={(e) => updateField('holdingCosts', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pdf-closingcosts">Closing costs</Label>
              <Input id="pdf-closingcosts" type="number" value={form.closingCosts} onChange={(e) => updateField('closingCosts', e.target.value)} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pdf-notes">Notes</Label>
              <Textarea id="pdf-notes" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} className="mt-1.5" rows={3} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleClose(false)} className="text-[var(--dynasty-navy)]">Cancel</Button>
          {form && (
            <Button type="button" onClick={handleSave} loading={isSaving} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
              Save property
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
