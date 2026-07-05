'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PropertyMutationData, formatCurrency, getTypeLabel } from '@/lib/property-utils'

type PreviewRow = {
  rowNumber: number
  data: PropertyMutationData
  errors: string[]
  duplicate: boolean
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function PropertyImportCsvDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [rows, setRows] = useState<PreviewRow[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setRows(null)
    setSelected(new Set())
    setError(null)
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    props.onOpenChange(open)
  }

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files?.[0]
    if (!file) return
    setIsParsing(true)
    setError(null)
    setRows(null)

    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/properties/import/csv', { method: 'POST', body })
      const payload = await safeJson(response)

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to parse this CSV.')
      }

      const parsedRows = (payload?.rows as PreviewRow[]) ?? []
      setRows(parsedRows)
      setSelected(new Set(parsedRows.filter((row) => row.errors.length === 0 && !row.duplicate).map((row) => row.rowNumber)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to parse this CSV.')
    } finally {
      setIsParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toggleRow = (rowNumber: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })
  }

  const handleImport = async () => {
    if (!rows) return
    const selectedRows = rows.filter((row) => selected.has(row.rowNumber)).map((row) => row.data)
    if (selectedRows.length === 0) {
      toast.error('Select at least one row to import.')
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch('/api/properties/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: selectedRows }),
      })
      const payload = await safeJson(response)

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to import these properties.')
      }

      const created = typeof payload?.created === 'number' ? payload.created : 0
      const skipped = typeof payload?.skipped === 'number' ? payload.skipped : 0
      toast.success(`Imported ${created} propert${created === 1 ? 'y' : 'ies'}.${skipped ? ` Skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}.` : ''}`)
      props.onImported()
      handleClose(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to import these properties.')
    } finally {
      setIsImporting(false)
    }
  }

  const selectableCount = rows?.filter((row) => row.errors.length === 0 && !row.duplicate).length ?? 0

  return (
    <Dialog open={props.open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-black text-[var(--dynasty-navy)]">Import properties from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with one property per row. Review what will be imported before anything is saved — duplicates (matched on address, city, and state) are skipped automatically.
          </DialogDescription>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />

        {!rows ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--dynasty-navy)]/20 bg-[#F8F7F2] p-10 text-center">
            <FileSpreadsheet className="h-10 w-10 text-[var(--dynasty-gold)]" />
            <p className="text-sm text-[var(--dynasty-black)]/65">Recognized columns: address, city, state, zip, property type, status, bedrooms, bathrooms, sqft, purchase price, current value, ARV, and more.</p>
            <Button type="button" onClick={() => fileInputRef?.current?.click?.()} loading={isParsing} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
              <Upload className="h-4 w-4" /> Choose CSV file
            </Button>
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-[var(--dynasty-black)]/65">
              <p>{rows.length} row{rows.length === 1 ? '' : 's'} found · {selectableCount} ready to import</p>
              <Button type="button" variant="ghost" size="sm" onClick={reset}>Choose a different file</Button>
            </div>
            <ScrollArea className="h-[360px] rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Row</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const disabled = row.errors.length > 0 || row.duplicate
                    return (
                      <TableRow key={row.rowNumber} className={disabled ? 'opacity-60' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(row.rowNumber)}
                            onCheckedChange={() => toggleRow(row.rowNumber)}
                            disabled={disabled}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-[var(--dynasty-black)]/50">{row.rowNumber}</TableCell>
                        <TableCell>
                          <p className="font-semibold text-[var(--dynasty-navy)]">{row.data.address || '—'}</p>
                          <p className="text-xs text-[var(--dynasty-black)]/55">{[row.data.city, row.data.state].filter(Boolean).join(', ')}</p>
                        </TableCell>
                        <TableCell className="text-sm">{getTypeLabel(row.data.propertyType)}</TableCell>
                        <TableCell className="text-sm">{row.data.purchasePrice ? formatCurrency(row.data.purchasePrice) : '—'}</TableCell>
                        <TableCell>
                          {row.duplicate ? (
                            <Badge className="border-0 bg-amber-100 text-amber-800">Duplicate — will skip</Badge>
                          ) : row.errors.length > 0 ? (
                            <Badge className="border-0 bg-red-100 text-red-700">{row.errors.join(', ')}</Badge>
                          ) : (
                            <Badge className="border-0 bg-emerald-100 text-emerald-800">Ready</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleClose(false)} className="text-[var(--dynasty-navy)]">Cancel</Button>
          {rows && (
            <Button type="button" onClick={handleImport} loading={isImporting} disabled={selected.size === 0} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
              Import {selected.size} propert{selected.size === 1 ? 'y' : 'ies'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
