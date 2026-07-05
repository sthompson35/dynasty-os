'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Calculator, DollarSign, Save, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PropertyDTO, calculateDealMetrics, formatCurrency, formatPercent } from '@/lib/property-utils'

type DealFormState = {
  purchasePrice: string
  arv: string
  repairCosts: string
  holdingCosts: string
  closingCosts: string
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function createDealState(property: PropertyDTO | null | undefined): DealFormState {
  return {
    purchasePrice: stringValue(property?.purchasePrice),
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
    console.error('Unable to parse deal analyzer response', error)
    return {}
  }
}

export function DealAnalyzer(props: { property: PropertyDTO; onSaved: (property: PropertyDTO) => void }) {
  const [form, setForm] = useState<DealFormState>(() => createDealState(props?.property ?? null))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setForm(createDealState(props?.property ?? null))
    // Depend on the individual fields createDealState reads, not props.property itself:
    // the parent may pass a new object reference on every render, and resetting the
    // form on reference churn (instead of real value changes) would wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.property?.id, props?.property?.purchasePrice, props?.property?.arv, props?.property?.repairCosts, props?.property?.holdingCosts, props?.property?.closingCosts])

  const projectedProperty = useMemo<PropertyDTO>(() => ({
    ...(props?.property ?? {}),
    purchasePrice: Number(form?.purchasePrice ?? 0),
    arv: Number(form?.arv ?? 0),
    repairCosts: Number(form?.repairCosts ?? 0),
    holdingCosts: Number(form?.holdingCosts ?? 0),
    closingCosts: Number(form?.closingCosts ?? 0),
  } as PropertyDTO), [props?.property, form])

  const metrics = useMemo(() => calculateDealMetrics(projectedProperty), [projectedProperty])
  const toneClass = metrics?.tone === 'good'
    ? 'bg-emerald-700 text-white'
    : metrics?.tone === 'bad'
      ? 'bg-red-700 text-white'
      : 'bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)]'
  const ToneIcon = metrics?.tone === 'bad' ? TrendingDown : TrendingUp

  const updateField = (field: keyof DealFormState, value: string) => {
    setForm((previous: DealFormState) => ({ ...(previous ?? createDealState(null)), [field]: value ?? '' }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event?.preventDefault?.()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(props?.property?.id ?? '')}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(props?.property ?? {}),
          purchasePrice: form?.purchasePrice,
          arv: form?.arv,
          repairCosts: form?.repairCosts,
          holdingCosts: form?.holdingCosts,
          closingCosts: form?.closingCosts,
        }),
      })
      const payload = await safeJson(response)

      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to save deal analysis.')
      }

      const savedProperty = payload?.property as PropertyDTO | undefined
      if (savedProperty?.id) {
        props?.onSaved?.(savedProperty)
        toast.success('Deal analysis saved.')
      }
    } catch (error: unknown) {
      console.error('Save deal analysis failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to save deal analysis.')
    } finally {
      setIsSaving(false)
    }
  }

  const field = (id: keyof DealFormState, label: string) => (
    <div className="space-y-2" key={id}>
      <Label htmlFor={`deal-${id}`} className="flex items-center gap-2 text-[var(--dynasty-navy)]">
        <DollarSign className="h-4 w-4 text-[var(--dynasty-gold)]" /> {label}
      </Label>
      <div className="relative">
        <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dynasty-tan)]" />
        <Input id={`deal-${id}`} type="number" step="100" value={form?.[id] ?? ''} onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateField(id, event?.target?.value ?? '')} className="pl-10" />
      </div>
    </div>
  )

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
          <Calculator className="h-5 w-5 text-[var(--dynasty-gold)]" /> Deal analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`rounded-lg p-5 shadow-md ${toneClass}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em]"><ToneIcon className="h-4 w-4" /> {metrics?.decision}</div>
              <p className="font-display text-3xl font-black tracking-tight">{formatCurrency(metrics?.profit)} projected profit</p>
              <p className="mt-2 text-sm opacity-85">ROI {formatPercent(metrics?.roi)} · Total investment {formatCurrency(metrics?.totalInvestment)}</p>
            </div>
            <div className="rounded-lg bg-white/18 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">Maximum allowable offer</p>
              <p className="mt-1 font-display text-2xl font-black">{formatCurrency(metrics?.mao)}</p>
              <p className="mt-1 text-xs opacity-80">ARV × 70% − repairs</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {field('arv', 'ARV')}
            {field('repairCosts', 'Repair costs')}
            {field('purchasePrice', 'Purchase price')}
            {field('holdingCosts', 'Holding costs')}
            {field('closingCosts', 'Closing costs')}
          </div>

          <div className="grid gap-3 rounded-lg bg-white/75 p-4 text-sm shadow-sm md:grid-cols-3">
            <div>
              <p className="text-[var(--dynasty-black)]/55">Profit formula</p>
              <p className="font-semibold text-[var(--dynasty-navy)]">ARV − price − repairs − holding − closing</p>
            </div>
            <div>
              <p className="text-[var(--dynasty-black)]/55">ROI formula</p>
              <p className="font-semibold text-[var(--dynasty-navy)]">Profit ÷ total investment × 100</p>
            </div>
            <div>
              <p className="text-[var(--dynasty-black)]/55">MAO spread</p>
              <p className={metrics?.spreadToMao >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{formatCurrency(metrics?.spreadToMao)}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSaving} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
              <Save className="h-4 w-4" /> Save deal analysis
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
