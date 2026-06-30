'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  Link2,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  CONTACT_ROLE_OPTIONS,
  ContactDTO,
  DEAL_TEAM_STATUS_OPTIONS,
  RELATIONSHIP_TYPE_OPTIONS,
  getContactRoleLabel,
  getDealTeamStatusLabel,
  getRelationshipTypeLabel,
} from '@/lib/contact-utils'
import { PropertyDTO, formatCurrency } from '@/lib/property-utils'

type LinkedContact = ContactDTO & {
  linkId: string
  roleOnDeal: string | null
  relationshipType: string | null
  dealResponsibility: string | null
  status: string
  nextActionDate: string | null
  lastContacted: string | null
  documentsNeeded: string | null
  paymentOwed: number | null
  receivesUpdates: boolean
  communicationHistory: string | null
}

type DealTeamForm = {
  name: string
  role: string
  email: string
  phone: string
  company: string
  roleOnDeal: string
  relationshipType: string
  dealResponsibility: string
  status: string
  nextActionDate: string
  lastContacted: string
  documentsNeeded: string
  paymentOwed: string
  receivesUpdates: boolean
  communicationHistory: string
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse property contacts response', error)
    return {}
  }
}

function dateInputValue(value: string | null): string {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function displayDate(value: string | null): string {
  if (!value) {
    return 'Not set'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Not set'
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function isTodayOrPast(value: string | null): boolean {
  if (!value) {
    return false
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return false
  }
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date <= today
}

function initialsOf(name: string): string {
  const alphaParts = name
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z]/gi, ''))
    .filter(Boolean)
  if (alphaParts.length === 0) {
    return '?'
  }
  if (alphaParts.length === 1) {
    return alphaParts[0].slice(0, 2).toUpperCase()
  }
  return (alphaParts[0][0] + alphaParts[alphaParts.length - 1][0]).toUpperCase()
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'lender':
    case 'investor':
      return 'border-0 bg-emerald-100 text-emerald-800'
    case 'buyer':
    case 'tenant':
      return 'border-0 bg-sky-100 text-sky-800'
    case 'seller':
      return 'border-0 bg-amber-100 text-amber-800'
    case 'contractor':
    case 'architect-engineer':
      return 'border-0 bg-orange-100 text-orange-800'
    case 'attorney':
    case 'title-company':
      return 'border-0 bg-violet-100 text-violet-800'
    default:
      return 'border-0 bg-[var(--dynasty-tan)]/22 text-[var(--dynasty-navy)]'
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'blocked':
      return 'border-0 bg-red-100 text-red-800'
    case 'call-today':
      return 'border-0 bg-sky-100 text-sky-800'
    case 'documents-due':
      return 'border-0 bg-amber-100 text-amber-800'
    case 'payment-due':
      return 'border-0 bg-emerald-100 text-emerald-800'
    case 'waiting':
      return 'border-0 bg-slate-100 text-slate-700'
    case 'inactive':
      return 'border-0 bg-zinc-100 text-zinc-600'
    default:
      return 'border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2]'
  }
}

const NEW_FORM: DealTeamForm = {
  name: '',
  role: 'seller',
  email: '',
  phone: '',
  company: '',
  roleOnDeal: '',
  relationshipType: 'decision-maker',
  dealResponsibility: '',
  status: 'active',
  nextActionDate: '',
  lastContacted: '',
  documentsNeeded: '',
  paymentOwed: '',
  receivesUpdates: true,
  communicationHistory: '',
}

const LINK_FORM: DealTeamForm = {
  ...NEW_FORM,
  name: '',
  email: '',
  phone: '',
  company: '',
}

function formFromContact(contact: LinkedContact): DealTeamForm {
  return {
    name: contact.name,
    role: contact.role,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    company: contact.company ?? '',
    roleOnDeal: contact.roleOnDeal ?? '',
    relationshipType: contact.relationshipType ?? 'other',
    dealResponsibility: contact.dealResponsibility ?? '',
    status: contact.status ?? 'active',
    nextActionDate: dateInputValue(contact.nextActionDate),
    lastContacted: dateInputValue(contact.lastContacted),
    documentsNeeded: contact.documentsNeeded ?? '',
    paymentOwed: contact.paymentOwed === null ? '' : String(contact.paymentOwed),
    receivesUpdates: contact.receivesUpdates,
    communicationHistory: contact.communicationHistory ?? '',
  }
}

function linkPayload(form: DealTeamForm): Record<string, unknown> {
  return {
    roleOnDeal: form.roleOnDeal,
    relationshipType: form.relationshipType,
    dealResponsibility: form.dealResponsibility,
    status: form.status,
    nextActionDate: form.nextActionDate || null,
    lastContacted: form.lastContacted || null,
    documentsNeeded: form.documentsNeeded,
    paymentOwed: form.paymentOwed || null,
    receivesUpdates: form.receivesUpdates,
    communicationHistory: form.communicationHistory,
  }
}

function AccountabilityCard(props: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  tone?: 'critical' | 'warning' | 'money' | 'info' | 'good'
}) {
  const toneClass =
    props.tone === 'critical'
      ? 'bg-red-50 text-red-800'
      : props.tone === 'warning'
        ? 'bg-amber-50 text-amber-800'
        : props.tone === 'money'
          ? 'bg-emerald-50 text-emerald-800'
          : props.tone === 'good'
            ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]'
            : 'bg-white/75 text-[var(--dynasty-navy)]'

  return (
    <div className={`rounded-lg p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] opacity-75">
        {props.icon} {props.label}
      </div>
      <p className="mt-2 font-display text-lg font-black">{props.value}</p>
      <p className="mt-1 text-xs font-semibold opacity-75">{props.detail}</p>
    </div>
  )
}

export function PropertyContacts(props: { property: PropertyDTO; initialContacts?: LinkedContact[] }) {
  const propertyId = props?.property?.id ?? ''
  const [linked, setLinked] = useState<LinkedContact[]>(props?.initialContacts ?? [])
  const [allContacts, setAllContacts] = useState<ContactDTO[]>([])
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [form, setForm] = useState<DealTeamForm>(NEW_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<DealTeamForm>(LINK_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const linkedIds = useMemo(() => new Set(linked.map((item) => item.id)), [linked])
  const availableContacts = useMemo(
    () => allContacts.filter((contact) => !linkedIds.has(contact.id)),
    [allContacts, linkedIds],
  )

  const accountability = useMemo(() => {
    const blockers = linked.filter((contact) => contact.status === 'blocked')
    const calls = linked.filter((contact) => contact.status === 'call-today' || isTodayOrPast(contact.nextActionDate))
    const docsDue = linked.filter((contact) => contact.status === 'documents-due' || Boolean(contact.documentsNeeded))
    const payments = linked.filter((contact) => contact.status === 'payment-due' || (contact.paymentOwed ?? 0) > 0)
    const updates = linked.filter((contact) => contact.receivesUpdates)
    const nextOwner = [...linked]
      .filter((contact) => contact.nextActionDate)
      .sort((a, b) => new Date(a.nextActionDate ?? '').getTime() - new Date(b.nextActionDate ?? '').getTime())[0]
    return { blockers, calls, docsDue, payments, updates, nextOwner }
  }, [linked])

  useEffect(() => {
    if (!dialogOpen || contactsLoaded) {
      return
    }
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/contacts')
        const payload = await safeJson(response)
        if (!response?.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to load contacts.')
        }
        if (active) {
          setAllContacts(Array.isArray(payload?.contacts) ? (payload.contacts as ContactDTO[]) : [])
          setContactsLoaded(true)
        }
      } catch (error: unknown) {
        console.error('Load contacts for linking failed', error)
        toast.error(error instanceof Error ? error.message : 'Unable to load contacts.')
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [dialogOpen, contactsLoaded])

  const openDialog = () => {
    setMode('existing')
    setSelectedContactId('')
    setForm(NEW_FORM)
    setDialogOpen(true)
  }

  const updateForm = (field: keyof DealTeamForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateEditForm = (field: keyof DealTeamForm, value: string | boolean) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    let body: Record<string, unknown>
    if (mode === 'existing') {
      if (!selectedContactId) {
        toast.error('Choose a contact to link.')
        return
      }
      body = { contactId: selectedContactId, ...linkPayload(form) }
    } else {
      if (!form.name.trim()) {
        toast.error('Please enter a contact name.')
        return
      }
      body = {
        name: form.name,
        role: form.role,
        email: form.email,
        phone: form.phone,
        company: form.company,
        ...linkPayload(form),
      }
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to link contact.')
      }
      const saved = payload?.contact as LinkedContact | undefined
      if (!saved?.id) {
        throw new Error('Unable to link contact.')
      }
      setLinked((prev) => [saved, ...prev])
      setAllContacts((prev) => {
        const exists = prev.some((item) => item.id === saved.id)
        return exists ? prev : [...prev, saved]
      })
      toast.success('Deal-team member linked.')
      setDialogOpen(false)
    } catch (error: unknown) {
      console.error('Link contact failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to link contact.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (contact: LinkedContact, nextForm: DealTeamForm) => {
    setUpdatingId(contact.linkId)
    try {
      const response = await fetch(
        `/api/properties/${encodeURIComponent(propertyId)}/contacts/${encodeURIComponent(contact.linkId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linkPayload(nextForm)),
        },
      )
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to update team member.')
      }
      const updated = payload?.link as Partial<LinkedContact> | undefined
      setLinked((prev) =>
        prev.map((item) => (item.linkId === contact.linkId ? { ...item, ...updated, linkId: item.linkId } : item)),
      )
      setEditingId(null)
      toast.success('Deal-team accountability updated.')
    } catch (error: unknown) {
      console.error('Update property contact failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to update team member.')
    } finally {
      setUpdatingId(null)
    }
  }

  const markContactedToday = async (contact: LinkedContact) => {
    const today = new Date().toISOString().slice(0, 10)
    await handleUpdate(contact, { ...formFromContact(contact), lastContacted: today, status: 'active' })
  }

  const handleRemove = async (contact: LinkedContact) => {
    const confirmed = window.confirm(`Unlink ${contact.name} from this property? The contact stays in your ledger.`)
    if (!confirmed) {
      return
    }
    setRemovingId(contact.linkId)
    try {
      const response = await fetch(
        `/api/properties/${encodeURIComponent(propertyId)}/contacts/${encodeURIComponent(contact.linkId)}`,
        { method: 'DELETE' },
      )
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to unlink contact.')
      }
      setLinked((prev) => prev.filter((item) => item.linkId !== contact.linkId))
      toast.success('Contact unlinked.')
    } catch (error: unknown) {
      console.error('Unlink contact failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to unlink contact.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col gap-3 border-b border-[var(--dynasty-navy)]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-black text-[var(--dynasty-navy)]">
              <Users className="h-6 w-6 text-[var(--dynasty-gold)]" /> Live deal team
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--dynasty-black)]/60">
              Track who owns the next step, who is blocking progress, who needs a call, who has documents due, who gets paid, and who receives updates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-navy)]/10">
              <Link href="/contacts">
                <Users className="h-4 w-4" /> Contacts
              </Link>
            </Button>
            <Button type="button" onClick={openDialog} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-navy)]/90">
              <Plus className="h-4 w-4" /> Link person
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <AccountabilityCard
            icon={<UserCheck className="h-4 w-4" />}
            label="Next step"
            value={accountability.nextOwner?.name ?? 'Unassigned'}
            detail={accountability.nextOwner ? displayDate(accountability.nextOwner.nextActionDate) : 'No action date'}
            tone="good"
          />
          <AccountabilityCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Blocking"
            value={String(accountability.blockers.length)}
            detail={accountability.blockers[0]?.name ?? 'No blockers'}
            tone={accountability.blockers.length ? 'critical' : 'info'}
          />
          <AccountabilityCard
            icon={<Phone className="h-4 w-4" />}
            label="Call today"
            value={String(accountability.calls.length)}
            detail={accountability.calls[0]?.name ?? 'No calls due'}
            tone={accountability.calls.length ? 'warning' : 'info'}
          />
          <AccountabilityCard
            icon={<FileWarning className="h-4 w-4" />}
            label="Docs due"
            value={String(accountability.docsDue.length)}
            detail={accountability.docsDue[0]?.documentsNeeded ?? 'Clear'}
            tone={accountability.docsDue.length ? 'warning' : 'info'}
          />
          <AccountabilityCard
            icon={<WalletCards className="h-4 w-4" />}
            label="Payables"
            value={formatCurrency(accountability.payments.reduce((sum, item) => sum + (item.paymentOwed ?? 0), 0))}
            detail={`${accountability.payments.length} people`}
            tone={accountability.payments.length ? 'money' : 'info'}
          />
          <AccountabilityCard
            icon={<Bell className="h-4 w-4" />}
            label="Updates"
            value={String(accountability.updates.length)}
            detail="Investor/ops recipients"
            tone="info"
          />
        </div>

        {linked.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dynasty-navy)]/8">
              <Link2 className="h-7 w-7 text-[var(--dynasty-navy)]" />
            </div>
            <h3 className="font-display text-xl font-black text-[var(--dynasty-navy)]">No deal team yet</h3>
            <p className="max-w-md text-sm leading-6 text-[var(--dynasty-black)]/60">
              Link sellers, buyers, lenders, investors, contractors, title, inspectors, and operators so accountability has a home.
            </p>
            <Button type="button" onClick={openDialog} className="mt-2 bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-navy)]/90">
              <UserPlus className="h-4 w-4" /> Link your first person
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {linked.map((contact) => {
              const isEditing = editingId === contact.linkId
              return (
                <div key={contact.linkId} className="rounded-lg bg-white/75 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--dynasty-navy)] font-display text-sm font-black text-[var(--dynasty-gold)]">
                        {initialsOf(contact.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-black leading-tight text-[var(--dynasty-navy)]">{contact.name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge className={roleBadgeClass(contact.role)}>{getContactRoleLabel(contact.role)}</Badge>
                          <Badge className={statusBadgeClass(contact.status)}>{getDealTeamStatusLabel(contact.status)}</Badge>
                          {contact.relationshipType && (
                            <span className="text-xs font-semibold text-[var(--dynasty-black)]/55">
                              {getRelationshipTypeLabel(contact.relationshipType)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        loading={updatingId === contact.linkId}
                        onClick={() => markContactedToday(contact)}
                        className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-navy)]/10"
                        title="Mark contacted today"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingId(contact.linkId)
                          setEditForm(formFromContact(contact))
                        }}
                        className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-navy)]/10"
                        title="Edit accountability"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" loading={removingId === contact.linkId} onClick={() => handleRemove(contact)} className="text-red-600 hover:bg-red-100">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isEditing ? (
                    <form
                      className="mt-4 grid gap-3 sm:grid-cols-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void handleUpdate(contact, editForm)
                      }}
                    >
                      <LinkFields form={editForm} updateForm={updateEditForm} compact />
                      <div className="flex justify-end gap-2 sm:col-span-2">
                        <Button type="button" variant="ghost" onClick={() => setEditingId(null)} className="text-[var(--dynasty-navy)]">
                          Cancel
                        </Button>
                        <Button type="submit" loading={updatingId === contact.linkId} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-navy)]/90">
                          Save accountability
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-4 grid gap-3 text-sm text-[var(--dynasty-black)]/72 sm:grid-cols-2">
                      <InfoLine icon={<Building2 className="h-4 w-4" />} label="Company" value={contact.company} />
                      <InfoLine icon={<CalendarClock className="h-4 w-4" />} label="Next action" value={displayDate(contact.nextActionDate)} />
                      <InfoLine icon={<MessageSquareText className="h-4 w-4" />} label="Last contacted" value={displayDate(contact.lastContacted)} />
                      <InfoLine icon={<WalletCards className="h-4 w-4" />} label="Payment owed" value={contact.paymentOwed ? formatCurrency(contact.paymentOwed) : 'None'} />
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-[var(--dynasty-navy)]">
                          <Mail className="h-4 w-4 text-[var(--dynasty-gold)]" /> {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-[var(--dynasty-navy)]">
                          <Phone className="h-4 w-4 text-[var(--dynasty-gold)]" /> {contact.phone}
                        </a>
                      )}
                      {contact.roleOnDeal && <p className="sm:col-span-2"><strong>Role:</strong> {contact.roleOnDeal}</p>}
                      {contact.dealResponsibility && <p className="sm:col-span-2"><strong>Responsibility:</strong> {contact.dealResponsibility}</p>}
                      {contact.documentsNeeded && <p className="sm:col-span-2"><strong>Documents needed:</strong> {contact.documentsNeeded}</p>}
                      {contact.communicationHistory && <p className="sm:col-span-2"><strong>Communication:</strong> {contact.communicationHistory}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-black text-[var(--dynasty-navy)]">Link a deal-team member</DialogTitle>
            <DialogDescription>Add the person and the accountability record for this property.</DialogDescription>
          </DialogHeader>

          <div className="mb-1 flex gap-1 rounded-lg bg-[var(--dynasty-navy)]/8 p-1">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${mode === 'existing' ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]' : 'text-[var(--dynasty-navy)]'}`}
            >
              Existing contact
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${mode === 'new' ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]' : 'text-[var(--dynasty-navy)]'}`}
            >
              New contact
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'existing' ? (
              <div>
                <Label>Contact</Label>
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={availableContacts.length === 0 ? 'No contacts available' : 'Choose a contact'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} - {getContactRoleLabel(contact.role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contactsLoaded && availableContacts.length === 0 && (
                  <p className="mt-2 text-xs text-[var(--dynasty-black)]/55">Every contact is already linked. Switch to New contact to add someone.</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="new-name">Full name</Label>
                  <Input id="new-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Jordan Banks" className="mt-1.5" required />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(value: string) => updateForm('role', value)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="new-company">Company</Label>
                  <Input id="new-company" value={form.company} onChange={(event) => updateForm('company', event.target.value)} placeholder="Banks Capital" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="jordan@example.com" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="new-phone">Phone</Label>
                  <Input id="new-phone" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="(555) 123-4567" className="mt-1.5" />
                </div>
              </div>
            )}

            <div className="grid gap-4 rounded-lg border border-[var(--dynasty-navy)]/10 bg-white/65 p-4 sm:grid-cols-2">
              <LinkFields form={form} updateForm={updateForm} />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-[var(--dynasty-navy)]">Cancel</Button>
              <Button type="submit" loading={isSaving} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-navy)]/90">
                <Link2 className="h-4 w-4" /> Link person
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function InfoLine(props: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <p className="flex items-center gap-2">
      <span className="text-[var(--dynasty-gold)]">{props.icon}</span>
      <span><strong>{props.label}:</strong> {props.value || 'Not set'}</span>
    </p>
  )
}

function LinkFields(props: {
  form: DealTeamForm
  updateForm: (field: keyof DealTeamForm, value: string | boolean) => void
  compact?: boolean
}) {
  return (
    <>
      <div>
        <Label>Role on deal</Label>
        <Input value={props.form.roleOnDeal} onChange={(event) => props.updateForm('roleOnDeal', event.target.value)} placeholder="Primary lender, listing agent, GC" className="mt-1.5" />
      </div>
      <div>
        <Label>Relationship type</Label>
        <Select value={props.form.relationshipType} onValueChange={(value: string) => props.updateForm('relationshipType', value)}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Relationship" /></SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={props.form.status} onValueChange={(value: string) => props.updateForm('status', value)}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {DEAL_TEAM_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Next action date</Label>
        <Input type="date" value={props.form.nextActionDate} onChange={(event) => props.updateForm('nextActionDate', event.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label>Last contacted</Label>
        <Input type="date" value={props.form.lastContacted} onChange={(event) => props.updateForm('lastContacted', event.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label>Payment owed</Label>
        <Input inputMode="decimal" value={props.form.paymentOwed} onChange={(event) => props.updateForm('paymentOwed', event.target.value)} placeholder="0.00" className="mt-1.5" />
      </div>
      <div className="sm:col-span-2">
        <Label>Deal responsibility</Label>
        <Textarea value={props.form.dealResponsibility} onChange={(event) => props.updateForm('dealResponsibility', event.target.value)} placeholder="Owns lender docs, seller signatures, inspection access, draw review..." className="mt-1.5 min-h-[72px]" />
      </div>
      <div className="sm:col-span-2">
        <Label>Documents needed</Label>
        <Textarea value={props.form.documentsNeeded} onChange={(event) => props.updateForm('documentsNeeded', event.target.value)} placeholder="Proof of funds, W-9, title commitment, insurance binder..." className="mt-1.5 min-h-[72px]" />
      </div>
      {!props.compact && (
        <div className="sm:col-span-2">
          <Label>Communication history</Label>
          <Textarea value={props.form.communicationHistory} onChange={(event) => props.updateForm('communicationHistory', event.target.value)} placeholder="Call notes, email summary, decision history..." className="mt-1.5 min-h-[72px]" />
        </div>
      )}
      <label className="flex items-center gap-2 rounded-lg bg-[var(--dynasty-navy)]/6 px-3 py-2 text-sm font-semibold text-[var(--dynasty-navy)] sm:col-span-2">
        <Checkbox checked={props.form.receivesUpdates} onCheckedChange={(checked) => props.updateForm('receivesUpdates', checked === true)} />
        Receives deal updates for Investor Portal, Operations, Capital, and Disposition flows
      </label>
    </>
  )
}
