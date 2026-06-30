'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Hammer, Plus, Trash2, Pencil, X, Check, ArrowRightLeft, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  REHAB_CATEGORY_OPTIONS,
  REHAB_ROOM_OPTIONS,
  REHAB_STATUS_OPTIONS,
  RehabItemDTO,
  getRehabStatusLabel,
  serializeRehabItem,
  summarizeRehabItems,
} from '@/lib/rehab-utils'
import { PropertyDTO, formatCurrency } from '@/lib/property-utils'

type RehabFormState = {
  room: string
  category: string
  description: string
  quantity: string
  unitCost: string
  status: string
}

function emptyForm(): RehabFormState {
  return {
    room: 'Kitchen',
    category: 'Materials',
    description: '',
    quantity: '1',
    unitCost: '',
    status: 'planned',
  }
}

function formFromItem(item: RehabItemDTO): RehabFormState {
  return {
    room: item?.room ?? 'General',
    category: item?.category ?? 'Materials',
    description: item?.description ?? '',
    quantity: String(item?.quantity ?? 1),
    unitCost: String(item?.unitCost ?? 0),
    status: item?.status ?? 'planned',
  }
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse rehab response', error)
    return {}
  }
}

const statusBadgeClass: Record<string, string> = {
  planned: 'border-0 bg-[var(--dynasty-tan)]/22 text-[var(--dynasty-navy)]',
  'in-progress': 'border-0 bg-[var(--dynasty-gold)]/22 text-[var(--dynasty-navy)]',
  complete: 'border-0 bg-emerald-100 text-emerald-800',
}

export function RehabEstimator(props: {
  property: PropertyDTO
  items: RehabItemDTO[]
  onItemsChange: (value: RehabItemDTO[] | ((previous: RehabItemDTO[]) => RehabItemDTO[])) => void
  onRepairCostsApplied?: (property: PropertyDTO) => void
}) {
  const propertyId = props?.property?.id ?? ''
  // Controlled by the parent so builder pushes and the estimator stay in sync.
  const items = props?.items ?? []
  const setItems = props?.onItemsChange ?? (() => {})
  const [form, setForm] = useState<RehabFormState>(() => emptyForm())
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<RehabFormState>(() => emptyForm())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const summary = useMemo(() => summarizeRehabItems(items), [items])
  const lineTotal = (quantity: string, unitCost: string) => (Number(quantity) || 0) * (Number(unitCost) || 0)

  const updateForm = (field: keyof RehabFormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }
  const updateEditForm = (field: keyof RehabFormState, value: string) => {
    setEditForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event?.preventDefault?.()
    if (!form?.description?.trim?.()) {
      toast.error('Add a description for the line item.')
      return
    }
    setIsAdding(true)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/rehab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to add line item.')
      }
      const created = payload?.item ? serializeRehabItem(payload.item) : null
      if (created?.id) {
        setItems((previous) => [...previous, created])
        setForm(emptyForm())
        toast.success('Line item added.')
      }
    } catch (error: unknown) {
      console.error('Add rehab item failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to add line item.')
    } finally {
      setIsAdding(false)
    }
  }

  const startEdit = (item: RehabItemDTO) => {
    setEditingId(item?.id ?? null)
    setEditForm(formFromItem(item))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm())
  }

  const handleSaveEdit = async (itemId: string) => {
    if (!editForm?.description?.trim?.()) {
      toast.error('Add a description for the line item.')
      return
    }
    setPendingId(itemId)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/rehab/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to update line item.')
      }
      const updated = payload?.item ? serializeRehabItem(payload.item) : null
      if (updated?.id) {
        setItems((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
        cancelEdit()
        toast.success('Line item updated.')
      }
    } catch (error: unknown) {
      console.error('Update rehab item failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to update line item.')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (itemId: string) => {
    setPendingId(itemId)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/rehab/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to delete line item.')
      }
      setItems((previous) => previous.filter((item) => item.id !== itemId))
      toast.success('Line item removed.')
    } catch (error: unknown) {
      console.error('Delete rehab item failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to delete line item.')
    } finally {
      setPendingId(null)
    }
  }

  const handleApplyToRepairCosts = async () => {
    setIsApplying(true)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(props?.property ?? {}), repairCosts: summary.total }),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to update repair costs.')
      }
      const saved = payload?.property as PropertyDTO | undefined
      if (saved?.id) {
        props?.onRepairCostsApplied?.(saved)
        toast.success('Repair costs synced to the deal analyzer.')
      }
    } catch (error: unknown) {
      console.error('Apply rehab total failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to update repair costs.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader>
        <CardTitle className="flex flex-col gap-3 font-display text-2xl text-[var(--dynasty-navy)] sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><Hammer className="h-5 w-5 text-[var(--dynasty-gold)]" /> Rehab cost estimator</span>
          <span className="text-sm font-semibold text-[var(--dynasty-black)]/55">{summary.itemCount} line item{summary.itemCount === 1 ? '' : 's'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary banner */}
        <div className="rounded-lg bg-[var(--dynasty-navy)] p-5 text-[#F8F7F2] shadow-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">Total rehab budget</p>
              <p className="mt-1 font-display text-4xl font-black tracking-tight">{formatCurrency(summary.total)}</p>
              <p className="mt-2 text-sm text-[#F8F7F2]/70">Current property repair costs: {formatCurrency(props?.property?.repairCosts ?? 0)}</p>
            </div>
            <Button
              type="button"
              onClick={handleApplyToRepairCosts}
              loading={isApplying}
              disabled={summary.itemCount === 0}
              className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#d8ad48]"
            >
              <ArrowRightLeft className="h-4 w-4" /> Sync to deal analyzer
            </Button>
          </div>
          {summary.byStatus.some((entry) => entry.total > 0) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {summary.byStatus.map((entry) => (
                <div key={entry.status} className="rounded-lg bg-white/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#F8F7F2]/60">{entry.label}</p>
                  <p className="font-display text-lg font-black">{formatCurrency(entry.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add line item form */}
        <form onSubmit={handleAdd} className="rounded-lg bg-white/75 p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[var(--dynasty-black)]/55"><Plus className="h-4 w-4 text-[var(--dynasty-gold)]" /> Add scope item</p>
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs text-[var(--dynasty-navy)]">Room / area</Label>
              <Select value={form.room} onValueChange={(value) => updateForm('room', value)}>
                <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
                <SelectContent>
                  {REHAB_ROOM_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs text-[var(--dynasty-navy)]">Category</Label>
              <Select value={form.category} onValueChange={(value) => updateForm('category', value)}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {REHAB_CATEGORY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 lg:col-span-4">
              <Label className="text-xs text-[var(--dynasty-navy)]">Description</Label>
              <Input value={form.description} onChange={(event) => updateForm('description', event?.target?.value ?? '')} placeholder="e.g. Shaker cabinets + quartz counters" />
            </div>
            <div className="space-y-1 lg:col-span-1">
              <Label className="text-xs text-[var(--dynasty-navy)]">Qty</Label>
              <Input type="number" step="0.5" min="0" value={form.quantity} onChange={(event) => updateForm('quantity', event?.target?.value ?? '')} />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs text-[var(--dynasty-navy)]">Unit cost</Label>
              <Input type="number" step="50" min="0" value={form.unitCost} onChange={(event) => updateForm('unitCost', event?.target?.value ?? '')} placeholder="0" />
            </div>
            <div className="flex items-end lg:col-span-1">
              <Button type="submit" loading={isAdding} className="w-full bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-right text-xs text-[var(--dynasty-black)]/55">Line total preview: <span className="font-bold text-[var(--dynasty-navy)]">{formatCurrency(lineTotal(form.quantity, form.unitCost))}</span></p>
        </form>

        {/* Line items list */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--dynasty-tan)]/50 bg-white/40 p-10 text-center">
            <ClipboardList className="h-8 w-8 text-[var(--dynasty-tan)]" />
            <p className="font-semibold text-[var(--dynasty-navy)]">No scope items yet</p>
            <p className="text-sm text-[var(--dynasty-black)]/55">Add line items above to build a room-by-room rehab budget.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white/75 shadow-sm">
            <div className="hidden grid-cols-12 gap-2 border-b border-[var(--dynasty-tan)]/30 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--dynasty-black)]/50 md:grid">
              <span className="col-span-2">Room</span>
              <span className="col-span-4">Description</span>
              <span className="col-span-1 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1 text-right">Actions</span>
            </div>
            {items.map((item) => {
              const isEditing = editingId === item.id
              const isPending = pendingId === item.id
              if (isEditing) {
                return (
                  <div key={item.id} className="grid gap-2 border-b border-[var(--dynasty-tan)]/20 bg-[var(--dynasty-gold)]/8 px-4 py-3 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-2">
                      <Select value={editForm.room} onValueChange={(value) => updateEditForm('room', value)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REHAB_ROOM_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-4">
                      <Input className="h-9" value={editForm.description} onChange={(event) => updateEditForm('description', event?.target?.value ?? '')} />
                    </div>
                    <div className="md:col-span-1">
                      <Input className="h-9 text-right" type="number" step="0.5" min="0" value={editForm.quantity} onChange={(event) => updateEditForm('quantity', event?.target?.value ?? '')} />
                    </div>
                    <div className="md:col-span-2">
                      <Input className="h-9 text-right" type="number" step="50" min="0" value={editForm.unitCost} onChange={(event) => updateEditForm('unitCost', event?.target?.value ?? '')} />
                    </div>
                    <div className="text-right font-bold text-[var(--dynasty-navy)] md:col-span-2">{formatCurrency(lineTotal(editForm.quantity, editForm.unitCost))}</div>
                    <div className="flex justify-end gap-1 md:col-span-1">
                      <Button type="button" size="icon" variant="ghost" loading={isPending} onClick={() => handleSaveEdit(item.id)} className="h-8 w-8 text-emerald-700 hover:bg-emerald-50"><Check className="h-4 w-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8 text-[var(--dynasty-black)]/60 hover:bg-[var(--dynasty-tan)]/20"><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={item.id} className="grid gap-2 border-b border-[var(--dynasty-tan)]/20 px-4 py-3 last:border-b-0 md:grid-cols-12 md:items-center">
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Badge className="border-0 bg-[var(--dynasty-tan)]/20 text-[var(--dynasty-navy)]">{item.room}</Badge>
                  </div>
                  <div className="md:col-span-4">
                    <p className="font-semibold text-[var(--dynasty-navy)]">{item.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--dynasty-black)]/50">{item.category}</span>
                      <Badge className={statusBadgeClass[item.status] ?? statusBadgeClass.planned}>{getRehabStatusLabel(item.status)}</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-[var(--dynasty-black)]/70 md:col-span-1 md:text-right"><span className="md:hidden">Qty: </span>{item.quantity}</div>
                  <div className="text-sm text-[var(--dynasty-black)]/70 md:col-span-2 md:text-right"><span className="md:hidden">Unit: </span>{formatCurrency(item.unitCost)}</div>
                  <div className="font-display font-black text-[var(--dynasty-navy)] md:col-span-2 md:text-right">{formatCurrency(item.lineTotal)}</div>
                  <div className="flex justify-end gap-1 md:col-span-1">
                    <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(item)} className="h-8 w-8 text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20"><Pencil className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" loading={isPending} onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* By-room breakdown */}
        {summary.byRoom.length > 0 && (
          <div className="rounded-lg bg-white/60 p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--dynasty-black)]/50">Budget by room</p>
            <div className="flex flex-wrap gap-2">
              {summary.byRoom.map((entry) => (
                <div key={entry.room} className="flex items-center gap-2 rounded-lg bg-[var(--dynasty-navy)]/5 px-3 py-2">
                  <span className="text-sm font-semibold text-[var(--dynasty-navy)]">{entry.room}</span>
                  <span className="text-sm font-black text-[var(--dynasty-gold)]">{formatCurrency(entry.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
