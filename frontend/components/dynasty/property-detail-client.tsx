'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bath, BedDouble, Box, Calculator, CalendarClock, CalendarDays, DollarSign, FileText, FolderOpen, Hammer, Home, Images, LayoutGrid, MapPin, Ruler, Share2, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropertyPhoto } from '@/components/dynasty/property-photo'
import { PropertyGallery } from '@/components/dynasty/property-gallery'
import { PhotoLightbox } from '@/components/dynasty/photo-lightbox'
import { DealAnalyzer } from '@/components/dynasty/deal-analyzer'
import { RehabEstimator } from '@/components/dynasty/rehab-estimator'
import { DrawSchedule } from '@/components/dynasty/draw-schedule'
import { ShareManager } from '@/components/dynasty/share-manager'
import { PropertyForm } from '@/components/dynasty/property-form'
import { DocumentVault } from '@/components/dynasty/document-vault'
import { PropertyContacts } from '@/components/dynasty/property-contacts'
import { Property3DViewer } from '@/components/dynasty/property-3d-viewer'
import { PropertyBuilder } from '@/components/dynasty/property-builder'
import { PropertyDeliveryCenter } from '@/components/dynasty/property-delivery-center'
import { PropertyDTO, calculateDealMetrics, formatCurrency, formatNumber, getPropertyDisplayName, getStatusLabel, getTypeLabel } from '@/lib/property-utils'
import { RehabItemDTO } from '@/lib/rehab-utils'
import { DrawDTO } from '@/lib/draw-utils'
import { DealShareDTO } from '@/lib/share-utils'
import { PropertyDocumentDTO } from '@/lib/document-utils'
import { ContactDTO } from '@/lib/contact-utils'
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

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse property detail response', error)
    return {}
  }
}

function Fact(props: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/75 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--dynasty-black)]/50">
        {props?.icon} {props?.label}
      </div>
      <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{props?.value}</p>
    </div>
  )
}

const modelSpine = [
  { tab: 'record', label: 'Property Record', icon: Home },
  { tab: 'builder', label: 'Builder', icon: LayoutGrid },
  { tab: 'viewer', label: '3D Twin', icon: Box },
  { tab: 'rehab', label: 'Rehab Engine', icon: Hammer },
  { tab: 'capital', label: 'Capital Engine', icon: DollarSign },
  { tab: 'investors', label: 'Investor Portal', icon: Share2 },
  { tab: 'operations', label: 'Operations Engine', icon: CalendarClock },
]

function ModelSpine(props: { activeTab: string; onSelect: (tab: string) => void }) {
  return (
    <div className="rounded-xl bg-[var(--dynasty-navy)] p-4 text-[#F8F7F2] shadow-lg">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">Unified property model</p>
          <h2 className="font-display text-xl font-black tracking-tight">One model. Every engine reads from it.</h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-[#F8F7F2]/65">
          Changes start in the property record, become geometry in Builder and 3D Twin, then flow into rehab, capital, investor, and operations workflows.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-7">
        {modelSpine.map((step, index) => {
          const Icon = step.icon
          const active = props.activeTab === step.tab
          return (
            <button
              key={step.tab}
              type="button"
              onClick={() => props.onSelect(step.tab)}
              className={`relative flex min-h-[86px] flex-col items-start justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
                active
                  ? 'border-[var(--dynasty-gold)] bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)]'
                  : 'border-white/12 bg-white/8 text-[#F8F7F2] hover:bg-white/12'
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-md ${active ? 'bg-[var(--dynasty-navy)] text-[var(--dynasty-gold)]' : 'bg-white/10 text-[var(--dynasty-gold)]'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-black leading-tight">{step.label}</span>
              {index < modelSpine.length - 1 && (
                <ArrowLeft className="pointer-events-none absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 rotate-180 text-[var(--dynasty-gold)] md:block" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PropertyDetailClient(props: {
  property: PropertyDTO
  initialRehabItems?: RehabItemDTO[]
  initialShares?: DealShareDTO[]
  initialDocuments?: PropertyDocumentDTO[]
  initialContacts?: LinkedContact[]
  initialDraws?: DrawDTO[]
  initialImages?: PropertyImageDTO[]
}) {
  const router = useRouter()
  const [property, setProperty] = useState<PropertyDTO>(props?.property)
  const [rehabItems, setRehabItems] = useState<RehabItemDTO[]>(props?.initialRehabItems ?? [])
  const [images, setImages] = useState<PropertyImageDTO[]>(props?.initialImages ?? [])
  const [activeTab, setActiveTab] = useState('record')
  const [headerLightbox, setHeaderLightbox] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const metrics = calculateDealMetrics(property)

  const coverUrl = images[0]?.url ?? property?.photoUrl ?? null
  const lightboxImages = images.length > 0
    ? images.map((image) => ({ url: image.url, caption: image.caption }))
    : (property?.photoUrl ? [{ url: property.photoUrl, caption: null }] : [])
  const tabTriggerClass = 'gap-2 rounded-md font-semibold data-[state=inactive]:bg-white/70 data-[state=inactive]:text-[var(--dynasty-navy)] data-[state=active]:bg-[var(--dynasty-navy)] data-[state=active]:text-[#F8F7F2] data-[state=active]:shadow-sm'

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete ${property?.address ?? 'this property'}? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(property?.id ?? '')}`, { method: 'DELETE' })
      const payload = await safeJson(response)

      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to delete property.')
      }

      toast.success('Property deleted.')
      router.replace('/properties')
    } catch (error: unknown) {
      console.error('Delete property detail failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to delete property.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <div className="mb-6 flex flex-col gap-4 rounded-lg bg-[var(--dynasty-navy)] p-6 text-[#F8F7F2] shadow-lg md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/properties" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--dynasty-gold)] hover:text-[#F8F7F2]"><ArrowLeft className="h-4 w-4" /> Back to property manager</Link>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Analyze and manage this property record.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F8F7F2]/76">
            Review property facts, update acquisition assumptions, and run the integrated deal analyzer in one place.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={handleDelete} loading={isDeleting} className="bg-white/10 text-[#F8F7F2] hover:bg-red-600 hover:text-white">
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { if (lightboxImages.length > 0) setHeaderLightbox(0) }}
            disabled={lightboxImages.length === 0}
            aria-label="View property photos"
            className="group relative block w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dynasty-gold)] focus-visible:ring-offset-2 disabled:cursor-default"
          >
            <PropertyPhoto src={coverUrl} alt={getPropertyDisplayName(property)} className="aspect-[16/11]" />
            {images.length > 0 && (
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Images className="h-3.5 w-3.5" /> {images.length} photo{images.length === 1 ? '' : 's'}
              </span>
            )}
          </button>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.slice(1, 6).map((image, idx) => {
                const actualIndex = idx + 1
                const hiddenCount = images.length - 6
                const showOverlay = idx === 4 && hiddenCount > 0
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setHeaderLightbox(actualIndex)}
                    aria-label={`View photo ${actualIndex + 1}`}
                    className="group relative aspect-square overflow-hidden rounded-md bg-[var(--dynasty-navy)] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dynasty-gold)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.caption || `Photo ${actualIndex + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {showOverlay && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-black text-white">+{hiddenCount}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <Card className="border-0 bg-[#F8F7F2] shadow-md">
          <CardHeader>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge className="border-0 bg-[var(--dynasty-tan)]/22 text-[var(--dynasty-navy)]">{getTypeLabel(property?.propertyType)}</Badge>
              <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{getStatusLabel(property?.status)}</Badge>
              <Badge className={metrics?.tone === 'good' ? 'border-0 bg-emerald-100 text-emerald-800' : metrics?.tone === 'bad' ? 'border-0 bg-red-100 text-red-800' : 'border-0 bg-[var(--dynasty-gold)]/20 text-[var(--dynasty-navy)]'}>{metrics?.decision}</Badge>
            </div>
            <CardTitle className="font-display text-3xl font-black tracking-tight text-[var(--dynasty-navy)]">{property?.address}</CardTitle>
            <p className="flex items-center gap-2 text-sm text-[var(--dynasty-black)]/60"><MapPin className="h-4 w-4 text-[var(--dynasty-gold)]" /> {property?.city}, {property?.state} {property?.zip ?? ''}</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Fact icon={<DollarSign className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Purchase" value={formatCurrency(property?.purchasePrice ?? 0)} />
              <Fact icon={<DollarSign className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Current value" value={formatCurrency(property?.currentValue ?? 0)} />
              <Fact icon={<BedDouble className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Bedrooms" value={property?.bedrooms === null ? '—' : formatNumber(property?.bedrooms)} />
              <Fact icon={<Bath className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Bathrooms" value={property?.bathrooms === null ? '—' : String(property?.bathrooms)} />
              <Fact icon={<Ruler className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Sqft" value={property?.sqft === null ? '—' : formatNumber(property?.sqft)} />
              <Fact icon={<CalendarDays className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Year built" value={property?.yearBuilt === null ? '—' : String(property?.yearBuilt)} />
            </div>
            {property?.notes && (
              <div className="mt-4 rounded-lg bg-white/75 p-4 shadow-sm">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--dynasty-black)]/50"><FileText className="h-4 w-4 text-[var(--dynasty-gold)]" /> Notes</p>
                <p className="text-sm leading-6 text-[var(--dynasty-black)]/72">{property?.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <ModelSpine activeTab={activeTab} onSelect={setActiveTab} />
      </div>

      <div className="mt-6">
        <PropertyDeliveryCenter
          property={property}
          contacts={props?.initialContacts ?? []}
          shares={props?.initialShares ?? []}
          documents={props?.initialDocuments ?? []}
          images={images}
          draws={props?.initialDraws ?? []}
          onNavigateToTab={setActiveTab}
        />
      </div>

      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-[#F8F7F2] p-1.5 shadow-sm">
            <TabsTrigger value="record" className={tabTriggerClass}><Home className="h-4 w-4" /> Property record</TabsTrigger>
            <TabsTrigger value="builder" className={tabTriggerClass}><LayoutGrid className="h-4 w-4" /> Builder</TabsTrigger>
            <TabsTrigger value="viewer" className={tabTriggerClass}><Box className="h-4 w-4" /> 3D twin</TabsTrigger>
            <TabsTrigger value="rehab" className={tabTriggerClass}><Hammer className="h-4 w-4" /> Rehab estimator</TabsTrigger>
            <TabsTrigger value="capital" className={tabTriggerClass}><DollarSign className="h-4 w-4" /> Capital engine</TabsTrigger>
            <TabsTrigger value="investors" className={tabTriggerClass}><Share2 className="h-4 w-4" /> Investor portal</TabsTrigger>
            <TabsTrigger value="operations" className={tabTriggerClass}><CalendarClock className="h-4 w-4" /> Operations engine</TabsTrigger>
            <TabsTrigger value="deal" className={tabTriggerClass}><Calculator className="h-4 w-4" /> Deal math</TabsTrigger>
            <TabsTrigger value="photos" className={tabTriggerClass}><Images className="h-4 w-4" /> Photos</TabsTrigger>
            <TabsTrigger value="documents" className={tabTriggerClass}><FolderOpen className="h-4 w-4" /> Document vault</TabsTrigger>
            <TabsTrigger value="people" className={tabTriggerClass}><Users className="h-4 w-4" /> People</TabsTrigger>
          </TabsList>
          <TabsContent value="record" className="mt-5">
            <PropertyForm mode="edit" property={property} onSaved={(savedProperty: PropertyDTO) => setProperty(savedProperty)} />
          </TabsContent>
          <TabsContent value="deal" className="mt-5">
            <DealAnalyzer property={property} onSaved={(savedProperty: PropertyDTO) => setProperty(savedProperty)} />
          </TabsContent>
          <TabsContent value="viewer" className="mt-5">
            <Property3DViewer
              property={property}
              rehabItems={rehabItems}
              onTourSaved={(savedProperty: PropertyDTO) => setProperty(savedProperty)}
              onNavigateToTab={setActiveTab}
            />
          </TabsContent>
          <TabsContent value="photos" className="mt-5">
            <PropertyGallery
              property={property}
              images={images}
              onImagesChange={setImages}
              onCoverChanged={(savedProperty: PropertyDTO) => setProperty(savedProperty)}
            />
          </TabsContent>
          <TabsContent value="builder" className="mt-5">
            <PropertyBuilder
              property={property}
              onRehabItemsCreated={(created: RehabItemDTO[]) => setRehabItems((previous) => [...previous, ...created])}
              onNavigateToTab={setActiveTab}
            />
          </TabsContent>
          <TabsContent value="rehab" className="mt-5">
            <RehabEstimator
              property={property}
              items={rehabItems}
              onItemsChange={setRehabItems}
              onRepairCostsApplied={(savedProperty: PropertyDTO) => setProperty(savedProperty)}
            />
          </TabsContent>
          <TabsContent value="capital" className="mt-5">
            <div className="space-y-5">
              <Card className="border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-2xl text-[#F8F7F2]">
                    <DollarSign className="h-5 w-5 text-[var(--dynasty-gold)]" /> Capital Engine feed
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  <Fact icon={<DollarSign className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Purchase" value={formatCurrency(property?.purchasePrice ?? 0)} />
                  <Fact icon={<Hammer className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Rehab budget" value={formatCurrency(property?.repairCosts ?? 0)} />
                  <Fact icon={<Calculator className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Total basis" value={formatCurrency((property?.purchasePrice ?? 0) + (property?.repairCosts ?? 0) + (property?.holdingCosts ?? 0) + (property?.closingCosts ?? 0))} />
                </CardContent>
              </Card>
              <DrawSchedule property={property} initialDraws={props?.initialDraws ?? []} />
            </div>
          </TabsContent>
          <TabsContent value="investors" className="mt-5">
            <ShareManager property={property} initialShares={props?.initialShares ?? []} />
          </TabsContent>
          <TabsContent value="operations" className="mt-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <DrawSchedule property={property} initialDraws={props?.initialDraws ?? []} />
              <div className="space-y-5">
                <DocumentVault property={property} initialDocuments={props?.initialDocuments ?? []} />
                <PropertyContacts property={property} initialContacts={props?.initialContacts ?? []} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="documents" className="mt-5">
            <DocumentVault property={property} initialDocuments={props?.initialDocuments ?? []} />
          </TabsContent>
          <TabsContent value="people" className="mt-5">
            <PropertyContacts property={property} initialContacts={props?.initialContacts ?? []} />
          </TabsContent>
        </Tabs>
      </div>

      <PhotoLightbox
        images={lightboxImages}
        index={headerLightbox}
        onClose={() => setHeaderLightbox(null)}
        onIndexChange={setHeaderLightbox}
      />
    </div>
  )
}
