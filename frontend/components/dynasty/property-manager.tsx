'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, ChevronLeft, ChevronRight, FileText, FileSpreadsheet, Filter, PlusCircle, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PropertyPhoto } from '@/components/dynasty/property-photo'
import { PropertyImportCsvDialog } from '@/components/dynasty/property-import-csv-dialog'
import { PropertyImportPdfDialog } from '@/components/dynasty/property-import-pdf-dialog'
import { PROPERTY_STATUS_OPTIONS, PROPERTY_TYPE_OPTIONS, PropertyDTO, calculateDealMetrics, formatCurrency, formatPercent, getPropertyDisplayName, getStatusLabel, getTypeLabel } from '@/lib/property-utils'

type PropertyManagerProps = {
  initialProperties: PropertyDTO[]
}

const PAGE_SIZE = 24

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse property manager response', error)
    return {}
  }
}

export function PropertyManager(props: PropertyManagerProps) {
  const [properties, setProperties] = useState<PropertyDTO[]>(props?.initialProperties ?? [])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)

  const filteredProperties = useMemo(() => {
    const normalizedQuery = query?.toLowerCase?.().trim?.() ?? ''
    return properties?.filter?.((property: PropertyDTO) => {
      const searchable = [property?.address, property?.city, property?.state, property?.zip, getTypeLabel(property?.propertyType), getStatusLabel(property?.status)]
        ?.filter?.((part: string | null | undefined) => Boolean(part))
        ?.join?.(' ')
        ?.toLowerCase?.() ?? ''
      const matchesQuery = !normalizedQuery || searchable?.includes?.(normalizedQuery)
      const matchesType = typeFilter === 'all' || property?.propertyType === typeFilter
      const matchesStatus = statusFilter === 'all' || property?.status === statusFilter
      return matchesQuery && matchesType && matchesStatus
    }) ?? []
  }, [properties, query, typeFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)

  const pagedProperties = useMemo(
    () => filteredProperties.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredProperties, safePage]
  )

  // Filter changes reshuffle which page 1 even means, so land back on it rather
  // than showing a stale/likely-empty page from before the filter changed.
  useEffect(() => {
    setCurrentPage(1)
  }, [query, typeFilter, statusFilter])

  const handleDelete = async (property: PropertyDTO) => {
    const confirmed = window.confirm(`Delete ${property?.address ?? 'this property'}? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setDeletingId(property?.id ?? '')

    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(property?.id ?? '')}`, {
        method: 'DELETE',
      })
      const payload = await safeJson(response)

      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to delete property.')
      }

      setProperties((current: PropertyDTO[]) => current?.filter?.((item: PropertyDTO) => item?.id !== property?.id) ?? [])
      toast.success('Property deleted.')
    } catch (error: unknown) {
      console.error('Delete property failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to delete property.')
    } finally {
      setDeletingId(null)
    }
  }

  const resetFilters = () => {
    setQuery('')
    setTypeFilter('all')
    setStatusFilter('all')
  }

  const handleImported = async () => {
    try {
      const response = await fetch('/api/properties', { cache: 'no-store' })
      const payload = await safeJson(response)
      if (response.ok && Array.isArray(payload?.properties)) {
        setProperties(payload.properties as PropertyDTO[])
      }
    } catch (error: unknown) {
      console.error('Unable to refresh properties after import', error)
    }
  }

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <div className="mb-8 flex flex-col gap-4 rounded-lg bg-[var(--dynasty-navy)] p-6 text-[#F8F7F2] shadow-lg md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
            <Building2 className="h-3.5 w-3.5" /> Property manager
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Manage every asset and acquisition lead.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F8F7F2]/76">
            Add, edit, delete, search, and filter properties while preserving each deal model inside the property record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="border-white/25 bg-transparent text-[#F8F7F2] hover:bg-white/10" onClick={() => setCsvDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" /> Import CSV
          </Button>
          <Button type="button" variant="outline" className="border-white/25 bg-transparent text-[#F8F7F2] hover:bg-white/10" onClick={() => setPdfDialogOpen(true)}>
            <FileText className="h-4 w-4" /> Import PDF
          </Button>
          <Button asChild className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
            <Link href="/properties/new"><PlusCircle className="h-4 w-4" /> Add property</Link>
          </Button>
        </div>
      </div>

      <PropertyImportCsvDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} onImported={handleImported} />
      <PropertyImportPdfDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} onImported={handleImported} />

      <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-md">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dynasty-tan)]" />
            <Input value={query} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event?.target?.value ?? '')} placeholder="Search address, city, status..." className="pl-10" aria-label="Search properties" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger aria-label="Filter by property type">
              <SelectValue placeholder="Property type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {PROPERTY_TYPE_OPTIONS?.map?.((option) => (
                <SelectItem key={option?.value} value={option?.value}>{option?.label}</SelectItem>
              )) ?? []}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by property status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PROPERTY_STATUS_OPTIONS?.map?.((option) => (
                <SelectItem key={option?.value} value={option?.value}>{option?.label}</SelectItem>
              )) ?? []}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" onClick={resetFilters} className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/18">
            <Filter className="h-4 w-4" /> Reset
          </Button>
        </CardContent>
      </Card>

      {(filteredProperties?.length ?? 0) === 0 ? (
        <Card className="border-0 bg-[#F8F7F2] shadow-md">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Building2 className="mb-4 h-12 w-12 text-[var(--dynasty-gold)]" />
            <h2 className="font-display text-2xl font-black text-[var(--dynasty-navy)]">No matching properties yet.</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--dynasty-black)]/65">Create a property or reset filters to bring the full portfolio back into view.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
                <Link href="/properties/new"><PlusCircle className="h-4 w-4" /> Add property</Link>
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>Reset filters</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pagedProperties?.map?.((property: PropertyDTO) => {
            const dealMetrics = calculateDealMetrics(property)
            return (
              <Card key={property?.id} className="group overflow-hidden border-0 bg-[#F8F7F2] shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <PropertyPhoto src={property?.photoUrl} alt={getPropertyDisplayName(property)} className="aspect-[16/10] rounded-none" />
                <CardContent className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge className="border-0 bg-[var(--dynasty-tan)]/22 text-[var(--dynasty-navy)]">{getTypeLabel(property?.propertyType)}</Badge>
                    <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{getStatusLabel(property?.status)}</Badge>
                  </div>
                  <h2 className="font-display text-xl font-black tracking-tight text-[var(--dynasty-navy)]">{property?.address}</h2>
                  <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{property?.city}, {property?.state} {property?.zip ?? ''}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-white/75 p-3 shadow-sm">
                      <p className="text-xs text-[var(--dynasty-black)]/52">Current value</p>
                      <p className="font-bold text-[var(--dynasty-navy)]">{formatCurrency(property?.currentValue ?? property?.purchasePrice ?? 0)}</p>
                    </div>
                    <div className="rounded-lg bg-white/75 p-3 shadow-sm">
                      <p className="text-xs text-[var(--dynasty-black)]/52">Projected ROI</p>
                      <p className={dealMetrics?.tone === 'bad' ? 'font-bold text-red-700' : dealMetrics?.tone === 'good' ? 'font-bold text-emerald-700' : 'font-bold text-[var(--dynasty-navy)]'}>{formatPercent(dealMetrics?.roi)}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button asChild className="flex-1 bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
                      <Link href={`/properties/${property?.id}`}>Details <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => handleDelete(property)} loading={deletingId === property?.id} className="text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          }) ?? []}
        </div>
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-lg bg-[#F8F7F2] p-4 shadow-md">
            <p className="text-sm text-[var(--dynasty-black)]/60">
              Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredProperties.length)} of {filteredProperties.length} properties
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm font-semibold text-[var(--dynasty-navy)]">Page {safePage} of {totalPages}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}
