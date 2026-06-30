'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CONTACT_ROLE_OPTIONS, ContactDTO, getContactRoleLabel } from '@/lib/contact-utils'

type ContactFormState = {
  name: string
  role: string
  email: string
  phone: string
  company: string
  notes: string
}

const EMPTY_FORM: ContactFormState = {
  name: '',
  role: 'partner',
  email: '',
  phone: '',
  company: '',
  notes: '',
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse contacts response', error)
    return {}
  }
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'lender':
      return 'border-0 bg-emerald-100 text-emerald-800'
    case 'buyer':
      return 'border-0 bg-sky-100 text-sky-800'
    case 'seller':
      return 'border-0 bg-amber-100 text-amber-800'
    case 'contractor':
      return 'border-0 bg-orange-100 text-orange-800'
    case 'agent':
      return 'border-0 bg-violet-100 text-violet-800'
    default:
      return 'border-0 bg-[var(--dynasty-tan)]/22 text-[var(--dynasty-navy)]'
  }
}

const CONTACT_PAGE_SIZE = 60

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

function parseNotes(notes: string | null): { plainNotes: string; importFields: Array<[string, string]> } {
  const text = notes?.trim?.() ?? ''
  if (!text) {
    return { plainNotes: '', importFields: [] }
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const fields: Array<[string, string]> = []
  const plain: string[] = []

  for (const line of lines) {
    const separator = line.indexOf(':')
    if (separator <= 0) {
      plain.push(line)
      continue
    }

    const label = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (!value) {
      continue
    }

    if (label === 'Propwire Source' || label === 'Owner Slot') {
      continue
    }

    if (/^(Owner Mailing|Owner Type|Owner Occupied|APN|County)/.test(label)) {
      fields.push([label.replace(/^Owner Mailing /, 'Mailing '), value])
    } else {
      plain.push(line)
    }
  }

  return { plainNotes: plain.join('\n'), importFields: fields }
}

export function ContactsManager(props: { initialContacts?: ContactDTO[] }) {
  const [contacts, setContacts] = useState<ContactDTO[]>(props?.initialContacts ?? [])
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(CONTACT_PAGE_SIZE)

  const updateField = (field: keyof ContactFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return contacts.filter((contact) => {
      const matchesRole = roleFilter === 'all' || contact.role === roleFilter
      if (!matchesRole) {
        return false
      }
      if (!needle) {
        return true
      }
      const haystack = [contact.name, contact.company, contact.email, contact.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [contacts, query, roleFilter])

  useEffect(() => {
    setVisibleCount(CONTACT_PAGE_SIZE)
  }, [query, roleFilter])

  const visibleContacts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (contact: ContactDTO) => {
    setEditingId(contact.id)
    setForm({
      name: contact.name ?? '',
      role: contact.role ?? 'partner',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      company: contact.company ?? '',
      notes: contact.notes ?? '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error('Please enter a contact name.')
      return
    }

    setIsSaving(true)
    try {
      const isEdit = Boolean(editingId)
      const url = isEdit ? `/api/contacts/${encodeURIComponent(editingId ?? '')}` : '/api/contacts'
      const response = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to save contact.')
      }
      const saved = payload?.contact as ContactDTO | undefined
      if (!saved?.id) {
        throw new Error('Unable to save contact.')
      }
      setContacts((prev) => {
        if (isEdit) {
          return prev.map((item) => (item.id === saved.id ? saved : item)).sort((a, b) => a.name.localeCompare(b.name))
        }
        return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(isEdit ? 'Contact updated.' : 'Contact added.')
      setDialogOpen(false)
    } catch (error: unknown) {
      console.error('Save contact failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to save contact.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (contact: ContactDTO) => {
    const confirmed = window.confirm(`Remove ${contact.name} from your contacts? This also unlinks them from any properties.`)
    if (!confirmed) {
      return
    }
    setDeletingId(contact.id)
    try {
      const response = await fetch(`/api/contacts/${encodeURIComponent(contact.id)}`, { method: 'DELETE' })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to remove contact.')
      }
      setContacts((prev) => prev.filter((item) => item.id !== contact.id))
      toast.success('Contact removed.')
    } catch (error: unknown) {
      console.error('Delete contact failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to remove contact.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <div className="mb-6 flex flex-col gap-4 rounded-lg bg-[var(--dynasty-navy)] p-6 text-[#F8F7F2] shadow-lg md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
            <Users className="h-4 w-4" /> Relationship ledger
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Contacts &amp; deal partners</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F8F7F2]/76">
            Keep every buyer, seller, lender, contractor, and partner in one disciplined ledger and link them to the deals they touch.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#F8F7F2]">
          <Plus className="h-4 w-4" /> Add contact
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-lg bg-[#F8F7F2] p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dynasty-black)]/40" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, company, email, or phone"
            className="pl-9"
          />
        </div>
        <div className="sm:w-56">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {CONTACT_ROLE_OPTIONS?.map?.((option) => (
                <SelectItem key={option?.value} value={option?.value}>{option?.label}</SelectItem>
              )) ?? []}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 bg-[#F8F7F2] shadow-md">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dynasty-navy)]/8">
              <Users className="h-7 w-7 text-[var(--dynasty-navy)]" />
            </div>
            <h3 className="font-display text-xl font-black text-[var(--dynasty-navy)]">
              {contacts.length === 0 ? 'No contacts yet' : 'No contacts match your filters'}
            </h3>
            <p className="max-w-md text-sm leading-6 text-[var(--dynasty-black)]/60">
              {contacts.length === 0
                ? 'Add the people behind your deals so you always know who to call when it is time to move.'
                : 'Try a different search term or role filter.'}
            </p>
            {contacts.length === 0 && (
              <Button type="button" onClick={openCreate} className="mt-2 bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-navy)]/90">
                <Plus className="h-4 w-4" /> Add your first contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleContacts.map((contact) => {
            const parsedNotes = parseNotes(contact.notes)
            return (
              <Card key={contact.id} className="group border-0 bg-[#F8F7F2] shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--dynasty-navy)] font-display text-sm font-black text-[var(--dynasty-gold)]">
                        {initialsOf(contact.name)}
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-black leading-tight text-[var(--dynasty-navy)]">{contact.name}</h3>
                        <Badge className={`mt-1 ${roleBadgeClass(contact.role)}`}>{getContactRoleLabel(contact.role)}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(contact)} className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-navy)]/10">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" loading={deletingId === contact.id} onClick={() => handleDelete(contact)} className="text-red-600 hover:bg-red-100">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-[var(--dynasty-black)]/72">
                    {contact.company && (
                      <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[var(--dynasty-gold)]" /> {contact.company}</p>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-[var(--dynasty-navy)]"><Mail className="h-4 w-4 text-[var(--dynasty-gold)]" /> {contact.email}</a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-[var(--dynasty-navy)]"><Phone className="h-4 w-4 text-[var(--dynasty-gold)]" /> {contact.phone}</a>
                    )}
                    {!contact.company && !contact.email && !contact.phone && (
                      <p className="text-[var(--dynasty-black)]/45">Imported owner record. Add phone or email when enriched.</p>
                    )}
                  </div>

                  {(parsedNotes.plainNotes || parsedNotes.importFields.length > 0) && (
                    <div className="mt-3 rounded-lg bg-white/70 p-3 text-xs leading-5 text-[var(--dynasty-black)]/65">
                      {parsedNotes.plainNotes && <p className="whitespace-pre-line">{parsedNotes.plainNotes}</p>}
                      {parsedNotes.importFields.length > 0 && (
                        <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
                          {parsedNotes.importFields.map(([label, value]) => (
                            <div key={`${contact.id}-${label}-${value}`} className="min-w-0">
                              <dt className="font-bold text-[var(--dynasty-navy)]/70">{label}</dt>
                              <dd className="truncate text-[var(--dynasty-black)]/65" title={value}>{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  )}

                  <div className="mt-4 border-t border-[var(--dynasty-navy)]/8 pt-3">
                    {contact.links.length === 0 ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--dynasty-black)]/40">Not linked to a property</p>
                    ) : (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--dynasty-black)]/45">
                          Linked to {contact.linkedCount} {contact.linkedCount === 1 ? 'property' : 'properties'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {contact.links.map((link) => (
                            <Link
                              key={link.id}
                              href={`/properties/${encodeURIComponent(link.propertyId)}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--dynasty-navy)]/8 px-2.5 py-1 text-xs font-semibold text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-navy)]/16"
                            >
                              <MapPin className="h-3 w-3 text-[var(--dynasty-gold)]" /> {link.address || 'Property'}{link.city ? `, ${link.city}` : ''}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filtered.length > visibleContacts.length && (
            <div className="md:col-span-2 xl:col-span-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisibleCount((count) => count + CONTACT_PAGE_SIZE)}
                className="w-full border-[var(--dynasty-navy)]/20 text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-navy)]/8"
              >
                Load {Math.min(CONTACT_PAGE_SIZE, filtered.length - visibleContacts.length)} more contacts
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-black text-[var(--dynasty-navy)]">
              {editingId ? 'Edit contact' : 'Add a contact'}
            </DialogTitle>
            <DialogDescription>
              Capture the key details so this relationship is always at your fingertips.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="contact-name">Full name</Label>
                <Input id="contact-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Jordan Banks" className="mt-1.5" required />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(value: string) => updateField('role', value)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    {CONTACT_ROLE_OPTIONS?.map?.((option) => (
                      <SelectItem key={option?.value} value={option?.value}>{option?.label}</SelectItem>
                    )) ?? []}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="contact-company">Company</Label>
                <Input id="contact-company" value={form.company} onChange={(event) => updateField('company', event.target.value)} placeholder="Banks Capital" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input id="contact-email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="jordan@example.com" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="contact-phone">Phone</Label>
                <Input id="contact-phone" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="(555) 123-4567" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="contact-notes">Notes</Label>
                <Textarea id="contact-notes" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="How you know them, terms they offer, preferred contact times..." className="mt-1.5" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-[var(--dynasty-navy)]">Cancel</Button>
              <Button type="submit" loading={isSaving} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-navy)]/90">
                {editingId ? 'Save changes' : 'Add contact'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
