'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, Copy, FileDown, FolderOpen, Images, Mail, MessageSquare, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ContactDTO } from '@/lib/contact-utils'
import { DealShareDTO } from '@/lib/share-utils'
import { DrawDTO, summarizeDraws } from '@/lib/draw-utils'
import { PropertyDocumentDTO } from '@/lib/document-utils'
import { PropertyDTO, formatCurrency, getPropertyDisplayName } from '@/lib/property-utils'
import { PropertyImageDTO } from '@/lib/gallery-utils'

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

function shareUrl(token: string): string {
  if (typeof window === 'undefined') return `/share/${token}`
  return `${window.location.origin}/share/${token}`
}

function mailtoUrl(recipients: string[], subject: string, body: string): string {
  return `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function smsUrl(phone: string, body: string): string {
  return `sms:${phone}?&body=${encodeURIComponent(body)}`
}

export function PropertyDeliveryCenter(props: {
  property: PropertyDTO
  contacts: LinkedContact[]
  shares: DealShareDTO[]
  documents: PropertyDocumentDTO[]
  images: PropertyImageDTO[]
  draws: DrawDTO[]
  onNavigateToTab: (tab: string) => void
}) {
  const [downloading, setDownloading] = useState(false)
  const propertyName = getPropertyDisplayName(props.property)
  const activeShare = props.shares.find((share) => share.isActive) ?? props.shares[0] ?? null
  const drawSummary = useMemo(() => summarizeDraws(props.draws), [props.draws])
  const updateRecipients = props.contacts.filter((contact) => contact.receivesUpdates)
  const emailRecipients = updateRecipients.map((contact) => contact.email).filter((email): email is string => Boolean(email))
  const smsRecipient = updateRecipients.find((contact) => contact.phone)?.phone ?? props.contacts.find((contact) => contact.phone)?.phone ?? ''
  const summaryBody = [
    `Dynasty PropertyOS update for ${propertyName}`,
    '',
    `Purchase: ${formatCurrency(props.property.purchasePrice ?? 0)}`,
    `ARV: ${formatCurrency(props.property.arv ?? props.property.currentValue ?? 0)}`,
    `Repair budget: ${formatCurrency(props.property.repairCosts ?? 0)}`,
    `Draw schedule: ${drawSummary.count} draws / ${formatCurrency(drawSummary.scheduledTotal)} scheduled / ${drawSummary.percentFunded.toFixed(0)}% funded`,
    `Documents: ${props.documents.length}`,
    `Photos: ${props.images.length}`,
    activeShare ? `Investor link: ${shareUrl(activeShare.token)}` : '',
  ].filter(Boolean).join('\n')

  const downloadReport = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(props.property.id)}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeShare ? { shareId: activeShare.id } : {}),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to generate report.')
      }
      const blob = await response.blob()
      const slug = propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'deal-report'
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${slug}-professional-report.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Professional report downloaded.')
    } catch (error: unknown) {
      console.error('Download report failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to generate report.')
    } finally {
      setDownloading(false)
    }
  }

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryBody)
      toast.success('Deal update copied.')
    } catch {
      toast.error('Copy failed.')
    }
  }

  const copyShare = async () => {
    if (!activeShare) {
      props.onNavigateToTab('investors')
      toast.info('Create an investor link first.')
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl(activeShare.token))
      toast.success('Investor link copied.')
    } catch {
      toast.error('Copy failed.')
    }
  }

  const openEmailDraft = () => {
    if (emailRecipients.length === 0) {
      props.onNavigateToTab('people')
      toast.info('Add a contact with email and mark them for updates.')
      return
    }
    window.location.href = mailtoUrl(emailRecipients, `${propertyName} - deal update`, summaryBody)
  }

  const openSmsDraft = () => {
    if (!smsRecipient) {
      props.onNavigateToTab('people')
      toast.info('Add a contact with a phone number to send SMS updates.')
      return
    }
    window.location.href = smsUrl(smsRecipient, summaryBody)
  }

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-black text-[var(--dynasty-navy)]">Delivery center</h2>
              <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">Reports / SMS / Email / Files</Badge>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--dynasty-black)]/62">
              Send professional updates from the property record: PDF report, investor link, email draft, SMS draft, draw schedule, documents, and photos.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
            <MiniStat label="Draws" value={`${drawSummary.count}`} helper={formatCurrency(drawSummary.scheduledTotal)} />
            <MiniStat label="Documents" value={`${props.documents.length}`} helper="Vault" />
            <MiniStat label="Photos" value={`${props.images.length}`} helper="Gallery" />
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <Button type="button" loading={downloading} onClick={downloadReport} className="justify-start bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
            <FileDown className="h-4 w-4" /> Professional report
          </Button>
          <Button type="button" variant="outline" onClick={copyShare} className="justify-start">
            <Share2 className="h-4 w-4" /> Copy investor link
          </Button>
          <Button type="button" variant="outline" onClick={openEmailDraft} className="justify-start">
            <Mail className="h-4 w-4" /> Email update
          </Button>
          <Button type="button" variant="outline" onClick={openSmsDraft} className="justify-start">
            <MessageSquare className="h-4 w-4" /> SMS update
          </Button>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <Button type="button" variant="ghost" onClick={() => props.onNavigateToTab('capital')} className="justify-start text-[var(--dynasty-navy)]">
            <CalendarClock className="h-4 w-4" /> Draw schedule
          </Button>
          <Button type="button" variant="ghost" onClick={() => props.onNavigateToTab('documents')} className="justify-start text-[var(--dynasty-navy)]">
            <FolderOpen className="h-4 w-4" /> Upload documents
          </Button>
          <Button type="button" variant="ghost" onClick={() => props.onNavigateToTab('photos')} className="justify-start text-[var(--dynasty-navy)]">
            <Images className="h-4 w-4" /> Upload photos
          </Button>
          <Button type="button" variant="ghost" onClick={copySummary} className="justify-start text-[var(--dynasty-navy)]">
            <Copy className="h-4 w-4" /> Copy update
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat(props: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg bg-white/75 px-3 py-2 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--dynasty-black)]/45">{props.label}</p>
      <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{props.value}</p>
      <p className="text-xs font-semibold text-[var(--dynasty-black)]/50">{props.helper}</p>
    </div>
  )
}
