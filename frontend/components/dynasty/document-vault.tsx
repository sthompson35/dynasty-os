'use client'

import { useRef, useState } from 'react'
import { Download, FileText, FolderOpen, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DOCUMENT_CATEGORY_OPTIONS,
  PropertyDocumentDTO,
  formatFileSize,
  getDocumentCategoryLabel,
  serializeDocument,
} from '@/lib/document-utils'
import { PropertyDTO } from '@/lib/property-utils'

const MAX_BYTES = 100 * 1024 * 1024

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse document response', error)
    return {}
  }
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Deterministic UTC-based formatting to keep server and client markup identical.
function formatDate(iso: string): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const month = MONTH_LABELS[date.getUTCMonth()] ?? ''
  return `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

export function DocumentVault(props: { property: PropertyDTO; initialDocuments: PropertyDocumentDTO[] }) {
  const propertyId = props?.property?.id ?? ''
  const [documents, setDocuments] = useState<PropertyDocumentDTO[]>(() => props?.initialDocuments ?? [])
  const [category, setCategory] = useState<string>('contract')
  const [isUploading, setIsUploading] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const openPicker = () => {
    fileInputRef.current?.click?.()
  }

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files?.[0]
    // Reset the input so the same file can be re-selected later.
    if (event?.target) {
      event.target.value = ''
    }
    if (!file) {
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('File is too large. Please upload files up to 100MB.')
      return
    }

    setIsUploading(true)
    try {
      const presignResponse = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/documents/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream' }),
      })
      const presignPayload = await safeJson(presignResponse)
      if (!presignResponse?.ok) {
        throw new Error(typeof presignPayload?.error === 'string' ? presignPayload.error : 'Unable to prepare upload.')
      }
      const uploadUrl = typeof presignPayload?.uploadUrl === 'string' ? presignPayload.uploadUrl : ''
      const cloudStoragePath = typeof presignPayload?.cloudStoragePath === 'string' ? presignPayload.cloudStoragePath : ''
      if (!uploadUrl || !cloudStoragePath) {
        throw new Error('Upload could not be prepared.')
      }

      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!putResponse?.ok) {
        throw new Error('Upload to storage failed.')
      }

      const recordResponse = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          cloudStoragePath,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
          category,
        }),
      })
      const recordPayload = await safeJson(recordResponse)
      if (!recordResponse?.ok) {
        throw new Error(typeof recordPayload?.error === 'string' ? recordPayload.error : 'Unable to save document.')
      }
      const created = recordPayload?.document ? serializeDocument(recordPayload.document) : null
      if (created?.id) {
        setDocuments((previous) => [created, ...previous])
        toast.success('Document uploaded.')
      }
    } catch (error: unknown) {
      console.error('Upload failed', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (doc: PropertyDocumentDTO) => {
    setPendingId(doc.id)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(doc.id)}/download`)
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to prepare download.')
      }
      const url = typeof payload?.url === 'string' ? payload.url : ''
      if (!url) {
        throw new Error('Download link unavailable.')
      }
      const link = document.createElement('a')
      link.href = url
      link.rel = 'noreferrer'
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error: unknown) {
      console.error('Download failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to download document.')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (docId: string) => {
    const confirmed = window.confirm('Delete this document? This cannot be undone.')
    if (!confirmed) {
      return
    }
    setPendingId(docId)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(docId)}`, { method: 'DELETE' })
      const payload = await safeJson(response)
      if (!response?.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to delete document.')
      }
      setDocuments((previous) => previous.filter((entry) => entry.id !== docId))
      toast.success('Document deleted.')
    } catch (error: unknown) {
      console.error('Delete document failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to delete document.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
          <FolderOpen className="h-5 w-5 text-[var(--dynasty-gold)]" /> Document vault
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-6 text-[var(--dynasty-black)]/65">
          Keep every document for this deal in one secure place — purchase contracts, inspection reports, appraisals, insurance, and closing paperwork. Files are private to your account and served through secure, expiring links.
        </p>

        <div className="flex flex-col gap-3 rounded-lg bg-white/75 p-5 shadow-sm sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label className="text-[var(--dynasty-navy)]">Document type</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" loading={isUploading} onClick={openPicker} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
            <Upload className="h-4 w-4" /> Upload document
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--dynasty-tan)]/50 bg-white/40 p-10 text-center">
            <FileText className="h-8 w-8 text-[var(--dynasty-tan)]" />
            <p className="font-semibold text-[var(--dynasty-navy)]">No documents yet</p>
            <p className="text-sm text-[var(--dynasty-black)]/55">Upload contracts, inspections, and closing paperwork to keep this deal organized.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-col gap-3 rounded-lg bg-white/75 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-[var(--dynasty-navy)]/8 text-[var(--dynasty-navy)]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--dynasty-navy)]">{doc.fileName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--dynasty-black)]/55">
                      <Badge className="border-0 bg-[var(--dynasty-tan)]/22 text-[var(--dynasty-navy)]">{getDocumentCategoryLabel(doc.category)}</Badge>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      {formatDate(doc.createdAt) && <span>&middot; {formatDate(doc.createdAt)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="ghost" loading={pendingId === doc.id} onClick={() => handleDownload(doc)} className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20">
                    <Download className="h-4 w-4" /> Download
                  </Button>
                  <Button type="button" variant="ghost" loading={pendingId === doc.id} onClick={() => handleDelete(doc.id)} className="text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
