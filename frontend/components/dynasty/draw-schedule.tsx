'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  Banknote,
  CalendarClock,
  Check,
  ChevronRight,
  GanttChart,
  Layers,
  LayoutList,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DRAW_STATUS_OPTIONS,
  DrawDTO,
  buildPresetDraws,
  getDrawStatusLabel,
  getNextDrawStatus,
  serializeDraw,
  summarizeDraws,
} from '@/lib/draw-utils'
import { PropertyDTO, formatCurrency, toNumber } from '@/lib/property-utils'
import { DrawTimeline } from '@/components/dynasty/draw-timeline'

type DrawFormState = {
  name: string
  description: string
  amount: string
  status: string
  scheduledDate: string
  lender: string
}

function emptyForm(): DrawFormState {
  return {
    name: '',
    description: '',
    amount: '',
    status: 'pending',
    scheduledDate: '',
    lender: '',
  }
}

function formFromDraw(draw: DrawDTO): DrawFormState {
  return {
    name: draw?.name ?? '',
    description: draw?.description ?? '',
    amount: draw?.amount ? String(draw.amount) : '',
    status: draw?.status ?? 'pending',
    scheduledDate: draw?.scheduledDate ? draw.scheduledDate.slice(0, 10) : '',
    lender: draw?.lender ?? '',
  }
}

function formatDrawDate(value: string): string {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  // Deterministic UTC formatting to avoid hydration mismatches.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse draw response', error)
    return {}
  }
}

const statusBadgeClass: Record<string, string> = {
  pending: 'border-0 bg-[var(--dynasty-tan)]/22 text-[var(--dynasty-navy)]',
  requested: 'border-0 bg-[var(--dynasty-gold)]/24 text-[var(--dynasty-navy)]',
  approved: 'border-0 bg-sky-100 text-sky-800',
  funded: 'border-0 bg-emerald-100 text-emerald-800',
}

export function DrawSchedule(props: { property: PropertyDTO; initialDraws?: DrawDTO[] }) {
  const propertyId = props?.property?.id ?? ''
  const rehabBudget = toNumber(props?.property?.repairCosts)
  const [draws, setDraws] = useState<DrawDTO[]>(props?.initialDraws ?? [])
  const [form, setForm] = useState<DrawFormState>(() => emptyForm())
  const [isAdding, setIsAdding] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<DrawFormState>(() => emptyForm())
  const [pendingId, setPendingId] = useState<string | null>(null)

  const summary = useMemo(() => summarizeDraws(draws), [draws])
  const [view, setView] = useState<'list' | 'timeline'>('list')

  const updateForm = (field: keyof DrawFormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }
  const updateEditForm = (field: keyof DrawFormState, value: string) => {
    setEditForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event?.preventDefault?.()
    if (!form?.name?.trim?.()) {
      toast.error('Give the draw a name first.')
      return
    }
    setIsAdding(true)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/draws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to add draw.')
      }
      const created = payload?.draw ? serializeDraw(payload.draw) : null
      if (created?.id) {
        setDraws((previous) => [...previous, created])
        setForm(emptyForm())
        toast.success('Draw added to the schedule.')
      }
    } catch (error: unknown) {
      console.error('Add draw failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to add draw.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleGenerate = async () => {
    if (draws.length > 0) {
      const confirmed = window.confirm(
        'This adds a standard 5-stage draw schedule based on your rehab budget. Continue?',
      )
      if (!confirmed) {
        return
      }
    }
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/draws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draws: buildPresetDraws(rehabBudget) }),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to generate schedule.')
      }
      const created = Array.isArray(payload?.draws)
        ? (payload.draws as unknown[]).map((draw) => serializeDraw(draw))
        : []
      if (created.length > 0) {
        setDraws((previous) => [...previous, ...created])
        toast.success(`Added ${created.length} draws from your rehab budget.`)
      }
    } catch (error: unknown) {
      console.error('Generate draws failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to generate schedule.')
    } finally {
      setIsGenerating(false)
    }
  }

  const patchDraw = async (draw: DrawDTO, changes: Partial<DrawFormState>) => {
    setPendingId(draw.id)
    try {
      const body = {
        name: draw.name,
        description: draw.description,
        amount: draw.amount,
        status: draw.status,
        scheduledDate: draw.scheduledDate ? draw.scheduledDate.slice(0, 10) : '',
        lender: draw.lender,
        ...changes,
      }
      const response = await fetch(
        `/api/properties/${encodeURIComponent(propertyId)}/draws/${encodeURIComponent(draw.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to update draw.')
      }
      const updated = payload?.draw ? serializeDraw(payload.draw) : null
      if (updated?.id) {
        setDraws((previous) => previous.map((entry) => (entry.id === updated.id ? updated : entry)))
        return updated
      }
      return null
    } catch (error: unknown) {
      console.error('Update draw failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to update draw.')
      return null
    } finally {
      setPendingId(null)
    }
  }

  const handleAdvance = async (draw: DrawDTO) => {
    const next = getNextDrawStatus(draw.status)
    if (!next) {
      return
    }
    const updated = await patchDraw(draw, { status: next })
    if (updated) {
      toast.success(
        next === 'funded'
          ? `${draw.name} marked funded.`
          : `${draw.name} moved to ${getDrawStatusLabel(next)}.`,
      )
    }
  }

  const startEdit = (draw: DrawDTO) => {
    setEditingId(draw?.id ?? null)
    setEditForm(formFromDraw(draw))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm())
  }

  const handleSaveEdit = async (draw: DrawDTO) => {
    if (!editForm?.name?.trim?.()) {
      toast.error('Give the draw a name first.')
      return
    }
    const updated = await patchDraw(draw, editForm)
    if (updated) {
      cancelEdit()
      toast.success('Draw updated.')
    }
  }

  const handleDelete = async (drawId: string) => {
    const confirmed = window.confirm('Remove this draw from the schedule?')
    if (!confirmed) {
      return
    }
    setPendingId(drawId)
    try {
      const response = await fetch(
        `/api/properties/${encodeURIComponent(propertyId)}/draws/${encodeURIComponent(drawId)}`,
        { method: 'DELETE' },
      )
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to delete draw.')
      }
      setDraws((previous) => previous.filter((entry) => entry.id !== drawId))
      toast.success('Draw removed.')
    } catch (error: unknown) {
      console.error('Delete draw failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to delete draw.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader>
        <CardTitle className="flex flex-col gap-3 font-display text-2xl text-[var(--dynasty-navy)] sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[var(--dynasty-gold)]" /> Draw schedule</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--dynasty-black)]/55">{summary.count} draw{summary.count === 1 ? '' : 's'}</span>
            <div className="flex overflow-hidden rounded-lg border border-[var(--dynasty-tan)]/50">
              <button
                type="button"
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${view === 'list' ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]' : 'bg-white/60 text-[var(--dynasty-black)]/55 hover:bg-[var(--dynasty-tan)]/30'}`}
              >
                <LayoutList className="h-3.5 w-3.5" /> List
              </button>
              <button
                type="button"
                onClick={() => setView('timeline')}
                aria-pressed={view === 'timeline'}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${view === 'timeline' ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]' : 'bg-white/60 text-[var(--dynasty-black)]/55 hover:bg-[var(--dynasty-tan)]/30'}`}
              >
                <GanttChart className="h-3.5 w-3.5" /> Timeline
              </button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary banner */}
        <div className="rounded-lg bg-[var(--dynasty-navy)] p-5 text-[#F8F7F2] shadow-md">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--dynasty-gold)]">Scheduled</p>
              <p className="mt-1 font-display text-3xl font-black tracking-tight">{formatCurrency(summary.scheduledTotal)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F8F7F2]/60">Funded</p>
              <p className="mt-1 font-display text-3xl font-black tracking-tight text-emerald-300">{formatCurrency(summary.fundedTotal)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F8F7F2]/60">Outstanding</p>
              <p className="mt-1 font-display text-3xl font-black tracking-tight">{formatCurrency(summary.outstandingTotal)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F8F7F2]/60">Remaining</p>
              <p className="mt-1 font-display text-3xl font-black tracking-tight">{formatCurrency(summary.remainingTotal)}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[#F8F7F2]/70">
              <span>Funding progress</span>
              <span>{summary.percentFunded.toFixed(0)}% funded</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[var(--dynasty-gold)] transition-all"
                style={{ width: `${summary.percentFunded}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Timeline view ── */}
        {view === 'timeline' && (
          <DrawTimeline draws={draws} />
        )}

        {/* ── List view controls (only shown in list mode) ── */}
        {view === 'list' && (<>

        {/* Generate-from-rehab helper */}
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--dynasty-tan)]/50 bg-white/55 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--dynasty-gold)]/20 text-[var(--dynasty-gold)]"><Sparkles className="h-5 w-5" /></span>
            <div>
              <p className="font-semibold text-[var(--dynasty-navy)]">Generate from rehab budget</p>
              <p className="text-sm text-[var(--dynasty-black)]/60">
                Build a standard 5-stage schedule from your {formatCurrency(rehabBudget)} rehab budget. You can fine-tune every line after.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            loading={isGenerating}
            className="flex-none bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]"
          >
            <Layers className="h-4 w-4" /> Generate schedule
          </Button>
        </div>

        {/* Add draw form */}
        <form onSubmit={handleAdd} className="rounded-lg bg-white/75 p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[var(--dynasty-black)]/55"><Plus className="h-4 w-4 text-[var(--dynasty-gold)]" /> Add a draw</p>
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="space-y-1 lg:col-span-4">
              <Label className="text-xs text-[var(--dynasty-navy)]">Milestone name</Label>
              <Input value={form.name} onChange={(event) => updateForm('name', event?.target?.value ?? '')} placeholder="e.g. Draw 1 — Demo & Roof" />
            </div>
            <div className="space-y-1 lg:col-span-3">
              <Label className="text-xs text-[var(--dynasty-navy)]">Lender (optional)</Label>
              <Input value={form.lender} onChange={(event) => updateForm('lender', event?.target?.value ?? '')} placeholder="e.g. Kiavi" />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs text-[var(--dynasty-navy)]">Amount</Label>
              <Input type="number" step="100" min="0" value={form.amount} onChange={(event) => updateForm('amount', event?.target?.value ?? '')} placeholder="0" />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs text-[var(--dynasty-navy)]">Target date</Label>
              <Input type="date" value={form.scheduledDate} onChange={(event) => updateForm('scheduledDate', event?.target?.value ?? '')} />
            </div>
            <div className="flex items-end lg:col-span-1">
              <Button type="submit" loading={isAdding} className="w-full bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-[var(--dynasty-navy)]">Scope / notes (optional)</Label>
            <Input value={form.description} onChange={(event) => updateForm('description', event?.target?.value ?? '')} placeholder="What work this draw covers" />
          </div>
        </form>

        {/* Draw list */}
        {draws.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--dynasty-tan)]/50 bg-white/40 p-10 text-center">
            <Banknote className="h-8 w-8 text-[var(--dynasty-tan)]" />
            <p className="font-semibold text-[var(--dynasty-navy)]">No draws scheduled yet</p>
            <p className="text-sm text-[var(--dynasty-black)]/55">Generate a schedule from your rehab budget or add draws manually above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {draws.map((draw) => {
              const isEditing = editingId === draw.id
              const isPending = pendingId === draw.id
              const nextStatus = getNextDrawStatus(draw.status)

              if (isEditing) {
                return (
                  <div key={draw.id} className="rounded-lg border border-[var(--dynasty-gold)]/40 bg-[var(--dynasty-gold)]/8 p-4 shadow-sm">
                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="space-y-1 lg:col-span-4">
                        <Label className="text-xs text-[var(--dynasty-navy)]">Milestone name</Label>
                        <Input value={editForm.name} onChange={(event) => updateEditForm('name', event?.target?.value ?? '')} />
                      </div>
                      <div className="space-y-1 lg:col-span-3">
                        <Label className="text-xs text-[var(--dynasty-navy)]">Lender</Label>
                        <Input value={editForm.lender} onChange={(event) => updateEditForm('lender', event?.target?.value ?? '')} />
                      </div>
                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-xs text-[var(--dynasty-navy)]">Amount</Label>
                        <Input type="number" step="100" min="0" value={editForm.amount} onChange={(event) => updateEditForm('amount', event?.target?.value ?? '')} />
                      </div>
                      <div className="space-y-1 lg:col-span-3">
                        <Label className="text-xs text-[var(--dynasty-navy)]">Status</Label>
                        <Select value={editForm.status} onValueChange={(value) => updateEditForm('status', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DRAW_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 lg:col-span-3">
                        <Label className="text-xs text-[var(--dynasty-navy)]">Target date</Label>
                        <Input type="date" value={editForm.scheduledDate} onChange={(event) => updateEditForm('scheduledDate', event?.target?.value ?? '')} />
                      </div>
                      <div className="space-y-1 lg:col-span-9">
                        <Label className="text-xs text-[var(--dynasty-navy)]">Scope / notes</Label>
                        <Input value={editForm.description} onChange={(event) => updateEditForm('description', event?.target?.value ?? '')} />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={cancelEdit} className="text-[var(--dynasty-black)]/60 hover:bg-[var(--dynasty-tan)]/20"><X className="h-4 w-4" /> Cancel</Button>
                      <Button type="button" loading={isPending} onClick={() => handleSaveEdit(draw)} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]"><Check className="h-4 w-4" /> Save</Button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={draw.id} className="rounded-lg bg-white/80 p-4 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{draw.name}</p>
                        <Badge className={statusBadgeClass[draw.status] ?? statusBadgeClass.pending}>{getDrawStatusLabel(draw.status)}</Badge>
                      </div>
                      {draw.description && <p className="mt-1 text-sm text-[var(--dynasty-black)]/65">{draw.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--dynasty-black)]/55">
                        {draw.lender && <span className="flex items-center gap-1"><Banknote className="h-3.5 w-3.5 text-[var(--dynasty-gold)]" /> {draw.lender}</span>}
                        {draw.scheduledDate && <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5 text-[var(--dynasty-gold)]" /> Target {formatDrawDate(draw.scheduledDate)}</span>}
                        {draw.fundedDate && <span className="flex items-center gap-1 text-emerald-700"><Check className="h-3.5 w-3.5" /> Funded {formatDrawDate(draw.fundedDate)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{formatCurrency(draw.amount)}</p>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(draw)} className="h-8 w-8 text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20"><Pencil className="h-4 w-4" /></Button>
                        <Button type="button" size="icon" variant="ghost" loading={isPending} onClick={() => handleDelete(draw.id)} className="h-8 w-8 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                  {nextStatus && (
                    <div className="mt-3 border-t border-[var(--dynasty-tan)]/25 pt-3">
                      <Button
                        type="button"
                        size="sm"
                        loading={isPending}
                        onClick={() => handleAdvance(draw)}
                        className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#d8ad48]"
                      >
                        Mark {getDrawStatusLabel(nextStatus)} <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Status breakdown */}
        {summary.count > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary.byStatus.map((entry) => (
              <div key={entry.status} className="rounded-lg bg-white/60 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dynasty-black)]/50">{entry.label}</span>
                  <Badge className={statusBadgeClass[entry.status] ?? statusBadgeClass.pending}>{entry.count}</Badge>
                </div>
                <p className="mt-2 font-display text-xl font-black text-[var(--dynasty-navy)]">{formatCurrency(entry.total)}</p>
              </div>
            ))}
          </div>
        )}
        </>)}
      </CardContent>
    </Card>
  )
}
