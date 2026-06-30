import { Bath, BedDouble, Building2, CalendarDays, Hammer, Mail, MapPin, Ruler, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PropertyPhoto } from '@/components/dynasty/property-photo'
import { BrandMark } from '@/components/dynasty/brand-mark'
import {
  DealMetrics,
  PropertyDTO,
  formatCurrency,
  formatNumber,
  formatPercent,
  getPropertyDisplayName,
  getStatusLabel,
  getTypeLabel,
} from '@/lib/property-utils'
import { RehabItemDTO, RehabSummary } from '@/lib/rehab-utils'
import { DealShareDTO } from '@/lib/share-utils'

function Stat(props: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-5 shadow-sm ${props?.accent ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]' : 'bg-white/80 text-[var(--dynasty-navy)]'}`}>
      <p className={`text-xs font-bold uppercase tracking-[0.16em] ${props?.accent ? 'text-[var(--dynasty-gold)]' : 'text-[var(--dynasty-black)]/45'}`}>{props?.label}</p>
      <p className="mt-2 font-display text-2xl font-black tracking-tight">{props?.value}</p>
    </div>
  )
}

function Fact(props: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/80 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--dynasty-black)]/45">
        {props?.icon} {props?.label}
      </div>
      <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{props?.value}</p>
    </div>
  )
}

export function DealPackageView(props: {
  share: DealShareDTO
  property: PropertyDTO
  metrics: DealMetrics
  rehabItems: RehabItemDTO[]
  rehabSummary: RehabSummary
}) {
  const { share, property, metrics, rehabItems, rehabSummary } = props
  const ToneIcon = metrics?.tone === 'bad' ? TrendingDown : TrendingUp
  const toneClass = metrics?.tone === 'good'
    ? 'bg-emerald-700 text-white'
    : metrics?.tone === 'bad'
      ? 'bg-red-700 text-white'
      : 'bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)]'

  return (
    <main className="min-h-screen dynasty-shell pb-16">
      {/* Header */}
      <header className="border-b border-[var(--dynasty-tan)]/30 bg-[#F8F7F2]/85 backdrop-blur">
        <div className="mx-auto flex w-[calc(100%-1.5rem)] max-w-[1100px] items-center justify-between py-4">
          <BrandMark />
          <span className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--dynasty-black)]/50 sm:flex">
            <ShieldCheck className="h-4 w-4 text-[var(--dynasty-gold)]" /> Confidential deal package
          </span>
        </div>
      </header>

      <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1100px]">
        {/* Hero */}
        <section className="mt-8 overflow-hidden rounded-lg bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-lg">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-7 md:p-9">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className="border-0 bg-white/15 text-[#F8F7F2]">{getTypeLabel(property?.propertyType)}</Badge>
                <Badge className="border-0 bg-[var(--dynasty-gold)]/25 text-[var(--dynasty-gold)]">{getStatusLabel(property?.status)}</Badge>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">{share?.title ?? 'Investment opportunity'}</p>
              <h1 className="mt-2 font-display text-3xl font-black tracking-tight md:text-4xl">{property?.address}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-[#F8F7F2]/75"><MapPin className="h-4 w-4 text-[var(--dynasty-gold)]" /> {property?.city}, {property?.state} {property?.zip ?? ''}</p>
              {share?.message && (
                <p className="mt-5 max-w-xl text-sm leading-7 text-[#F8F7F2]/80">{share.message}</p>
              )}
              {(share?.preparedBy || share?.contactEmail) && (
                <div className="mt-6 inline-flex flex-wrap items-center gap-4 rounded-lg bg-white/10 px-4 py-3 text-sm">
                  {share?.preparedBy && <span className="font-semibold">Prepared by {share.preparedBy}</span>}
                  {share?.contactEmail && (
                    <a href={`mailto:${share.contactEmail}`} className="inline-flex items-center gap-2 text-[var(--dynasty-gold)] hover:text-[#F8F7F2]">
                      <Mail className="h-4 w-4" /> {share.contactEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
            <PropertyPhoto src={property?.photoUrl} alt={getPropertyDisplayName(property)} className="h-full min-h-[260px] rounded-none" />
          </div>
        </section>

        {/* Deal math */}
        {share?.showFinancials && (
          <section className="mt-6">
            <div className={`rounded-lg p-6 shadow-md ${toneClass}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em]"><ToneIcon className="h-4 w-4" /> {metrics?.decision}</div>
                  <p className="font-display text-4xl font-black tracking-tight">{formatCurrency(metrics?.profit)}</p>
                  <p className="mt-1 text-sm opacity-85">projected profit · ROI {formatPercent(metrics?.roi)}</p>
                </div>
                <div className="rounded-lg bg-white/18 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">Maximum allowable offer</p>
                  <p className="mt-1 font-display text-2xl font-black">{formatCurrency(metrics?.mao)}</p>
                  <p className="mt-1 text-xs opacity-80">ARV × 70% − repairs</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="After repair value" value={formatCurrency(property?.arv ?? property?.currentValue ?? 0)} accent />
              <Stat label="Purchase price" value={formatCurrency(property?.purchasePrice ?? 0)} />
              <Stat label="Repair budget" value={formatCurrency(property?.repairCosts ?? 0)} />
              <Stat label="Total investment" value={formatCurrency(metrics?.totalInvestment)} />
            </div>
          </section>
        )}

        {/* Property facts */}
        <section className="mt-6">
          <h2 className="mb-3 font-display text-xl font-black text-[var(--dynasty-navy)]">Property overview</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact icon={<BedDouble className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Bedrooms" value={property?.bedrooms === null ? '—' : formatNumber(property?.bedrooms)} />
            <Fact icon={<Bath className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Bathrooms" value={property?.bathrooms === null ? '—' : String(property?.bathrooms)} />
            <Fact icon={<Ruler className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Square feet" value={property?.sqft === null ? '—' : formatNumber(property?.sqft)} />
            <Fact icon={<CalendarDays className="h-4 w-4 text-[var(--dynasty-gold)]" />} label="Year built" value={property?.yearBuilt === null ? '—' : String(property?.yearBuilt)} />
          </div>
          {property?.notes && (
            <div className="mt-4 rounded-lg bg-white/80 p-5 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--dynasty-black)]/45">Investment notes</p>
              <p className="text-sm leading-7 text-[var(--dynasty-black)]/75">{property.notes}</p>
            </div>
          )}
        </section>

        {/* Rehab scope */}
        {share?.showRehab && rehabItems.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[var(--dynasty-navy)]"><Hammer className="h-5 w-5 text-[var(--dynasty-gold)]" /> Rehab scope</h2>
            <div className="overflow-hidden rounded-lg bg-white/80 shadow-sm">
              <div className="flex items-center justify-between bg-[var(--dynasty-navy)] px-5 py-3 text-[#F8F7F2]">
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--dynasty-gold)]">Total rehab budget</span>
                <span className="font-display text-xl font-black">{formatCurrency(rehabSummary.total)}</span>
              </div>
              {rehabItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-[var(--dynasty-tan)]/20 px-5 py-3 last:border-b-0">
                  <div>
                    <p className="font-semibold text-[var(--dynasty-navy)]">{item.description}</p>
                    <p className="text-xs text-[var(--dynasty-black)]/50">{item.room} · {item.category}</p>
                  </div>
                  <span className="font-display font-black text-[var(--dynasty-navy)]">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <section className="mt-8 rounded-lg bg-[var(--dynasty-navy)] p-7 text-center text-[#F8F7F2] shadow-lg">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
          <h2 className="font-display text-2xl font-black tracking-tight">Interested in this opportunity?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#F8F7F2]/75">Reach out to discuss terms, timelines, and next steps for this deal.</p>
          {share?.contactEmail && (
            <a href={`mailto:${share.contactEmail}`} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--dynasty-gold)] px-6 py-3 font-bold text-[var(--dynasty-navy)] transition hover:bg-[#d8ad48]">
              <Mail className="h-4 w-4" /> Contact {share.preparedBy ?? 'the sponsor'}
            </a>
          )}
          <p className="mt-6 text-xs text-[#F8F7F2]/45">Powered by Dynasty PropertyOS · Figures are estimates and not an offer or guarantee.</p>
        </section>
      </div>
    </main>
  )
}
