'use client'

import { FormEvent, useState } from 'react'
import { Copy, Eye, FileDown, Link2, Plus, Power, Share2, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { DealShareDTO, serializeShare } from '@/lib/share-utils'
import { PropertyDTO, getPropertyDisplayName } from '@/lib/property-utils'

type ShareFormState = {
  title: string
  preparedBy: string
  contactEmail: string
  message: string
  showFinancials: boolean
  showRehab: boolean
}

function defaultForm(property: PropertyDTO): ShareFormState {
  return {
    title: `Investment opportunity — ${getPropertyDisplayName(property)}`,
    preparedBy: '',
    contactEmail: '',
    message: '',
    showFinancials: true,
    showRehab: true,
  }
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse share response', error)
    return {}
  }
}

function shareUrl(token: string): string {
  if (typeof window === 'undefined') {
    return `/share/${token}`
  }
  return `${window.location.origin}/share/${token}`
}

export function ShareManager(props: { property: PropertyDTO; initialShares: DealShareDTO[] }) {
  const propertyId = props?.property?.id ?? ''
  const [shares, setShares] = useState<DealShareDTO[]>(() => props?.initialShares ?? [])
  const [form, setForm] = useState<ShareFormState>(() => defaultForm(props?.property))
  const [isCreating, setIsCreating] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const downloadReport = async (shareId?: string) => {
    const key = shareId ?? 'full'
    setDownloadingId(key)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareId ? { shareId } : {}),
      })
      if (!response?.ok) {
        const payload = await safeJson(response)
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to generate report.')
      }
      const blob = await response.blob()
      const slug = (getPropertyDisplayName(props?.property) || 'deal-report')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'deal-report'
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${slug}-deal-report.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Deal report PDF downloaded.')
    } catch (error: unknown) {
      console.error('Download report failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to generate report.')
    } finally {
      setDownloadingId(null)
    }
  }

  const updateForm = (field: keyof ShareFormState, value: string | boolean) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const copyLink = async (token: string) => {
    const url = shareUrl(token)
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Investor link copied to clipboard.')
    } catch (error: unknown) {
      console.error('Clipboard write failed', error)
      toast.error('Copy failed — select and copy the link manually.')
    }
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event?.preventDefault?.()
    setIsCreating(true)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to create share link.')
      }
      const created = payload?.share ? serializeShare(payload.share) : null
      if (created?.id) {
        setShares((previous) => [created, ...previous])
        setForm(defaultForm(props?.property))
        setShowForm(false)
        toast.success('Investor link created.')
        await copyLink(created.token)
      }
    } catch (error: unknown) {
      console.error('Create share failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to create share link.')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleActive = async (share: DealShareDTO) => {
    setPendingId(share.id)
    try {
      const response = await fetch(`/api/shares/${encodeURIComponent(share.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...share, isActive: !share.isActive }),
      })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to update link.')
      }
      const updated = payload?.share ? serializeShare(payload.share) : null
      if (updated?.id) {
        setShares((previous) => previous.map((entry) => (entry.id === updated.id ? updated : entry)))
        toast.success(updated.isActive ? 'Link activated.' : 'Link deactivated.')
      }
    } catch (error: unknown) {
      console.error('Toggle share failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to update link.')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (shareId: string) => {
    const confirmed = window.confirm('Revoke this investor link? Anyone with the link will lose access.')
    if (!confirmed) {
      return
    }
    setPendingId(shareId)
    try {
      const response = await fetch(`/api/shares/${encodeURIComponent(shareId)}`, { method: 'DELETE' })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to revoke link.')
      }
      setShares((previous) => previous.filter((entry) => entry.id !== shareId))
      toast.success('Investor link revoked.')
    } catch (error: unknown) {
      console.error('Delete share failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to revoke link.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader>
        <CardTitle className="flex flex-col gap-3 font-display text-2xl text-[var(--dynasty-navy)] sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><Share2 className="h-5 w-5 text-[var(--dynasty-gold)]" /> Investor portal</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" loading={downloadingId === 'full'} onClick={() => downloadReport()} className="border border-[var(--dynasty-navy)]/15 text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20">
              <FileDown className="h-4 w-4" /> Download PDF report
            </Button>
            <Button type="button" onClick={() => setShowForm((value) => !value)} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
              <Plus className="h-4 w-4" /> New investor link
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-6 text-[var(--dynasty-black)]/65">
          Generate a polished, shareable deal package for potential investors. Each link opens a public, branded page with the property summary, deal math, and rehab scope — no login required for your investors.
        </p>

        {showForm && (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg bg-white/75 p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[var(--dynasty-navy)]">Package title</Label>
                <Input value={form.title} onChange={(event) => updateForm('title', event?.target?.value ?? '')} placeholder="Investment opportunity" />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--dynasty-navy)]">Prepared by</Label>
                <Input value={form.preparedBy} onChange={(event) => updateForm('preparedBy', event?.target?.value ?? '')} placeholder="Your name or company" />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--dynasty-navy)]">Contact email</Label>
                <Input type="email" value={form.contactEmail} onChange={(event) => updateForm('contactEmail', event?.target?.value ?? '')} placeholder="you@email.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[var(--dynasty-navy)]">Message to investors</Label>
                <Textarea value={form.message} onChange={(event) => updateForm('message', event?.target?.value ?? '')} placeholder="Add context, highlights, or your pitch for this deal..." className="min-h-[90px]" />
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg bg-[var(--dynasty-navy)]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3 text-sm font-semibold text-[var(--dynasty-navy)]">
                <Switch checked={form.showFinancials} onCheckedChange={(value) => updateForm('showFinancials', value)} /> Show financials &amp; deal math
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-[var(--dynasty-navy)]">
                <Switch checked={form.showRehab} onCheckedChange={(value) => updateForm('showRehab', value)} /> Show rehab scope
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20">Cancel</Button>
              <Button type="submit" loading={isCreating} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#d8ad48]">
                <Link2 className="h-4 w-4" /> Generate link
              </Button>
            </div>
          </form>
        )}

        {shares.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--dynasty-tan)]/50 bg-white/40 p-10 text-center">
            <Share2 className="h-8 w-8 text-[var(--dynasty-tan)]" />
            <p className="font-semibold text-[var(--dynasty-navy)]">No investor links yet</p>
            <p className="text-sm text-[var(--dynasty-black)]/55">Create a link to share this deal with potential investors.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => (
              <div key={share.id} className="rounded-lg bg-white/75 p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-[var(--dynasty-navy)]">{share.title ?? 'Investor deal package'}</p>
                      <Badge className={share.isActive ? 'border-0 bg-emerald-100 text-emerald-800' : 'border-0 bg-[var(--dynasty-black)]/10 text-[var(--dynasty-black)]/60'}>
                        {share.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--dynasty-black)]/55">
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {share.viewCount} view{share.viewCount === 1 ? '' : 's'}</span>
                      <span className="truncate font-mono text-[var(--dynasty-navy)]/70">/share/{share.token}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="ghost" onClick={() => copyLink(share.token)} className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20">
                      <Copy className="h-4 w-4" /> Copy
                    </Button>
                    <Button type="button" variant="ghost" asChild className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20">
                      <a href={shareUrl(share.token)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Preview</a>
                    </Button>
                    <Button type="button" variant="ghost" loading={downloadingId === share.id} onClick={() => downloadReport(share.id)} className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20">
                      <FileDown className="h-4 w-4" /> PDF
                    </Button>
                    <Button type="button" variant="ghost" loading={pendingId === share.id} onClick={() => toggleActive(share)} className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20">
                      <Power className="h-4 w-4" /> {share.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button type="button" variant="ghost" loading={pendingId === share.id} onClick={() => handleDelete(share.id)} className="text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" /> Revoke
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
