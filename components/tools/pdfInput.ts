'use client'

import { checkFiles } from '@/lib/files/validate'
import { LIMITS } from '@/lib/limits'
import { pdfInfo } from '@/lib/pdf/operations'
import { newId } from '@/lib/storage/db'

export interface PdfItem {
  id: string
  name: string
  size: number
  bytes: Uint8Array
  pageCount: number
  encrypted: boolean
}

/** Validates and reads PDFs, returning items plus readable errors for rejected files. */
export async function readPdfFiles(files: File[]): Promise<{ items: PdfItem[]; errors: string[] }> {
  const { accepted, errors } = await checkFiles(files, 'pdf')
  const items: PdfItem[] = []
  for (const { file } of accepted) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const info = await pdfInfo(bytes)
      if (info.pageCount > LIMITS.pdfPages) {
        errors.push(`“${file.name}” has ${info.pageCount} pages. Up to ${LIMITS.pdfPages} pages are supported.`)
        continue
      }
      items.push({ id: newId(), name: file.name, size: file.size, bytes, pageCount: info.pageCount, encrypted: info.encrypted })
    } catch {
      errors.push(`“${file.name}” isn’t a valid PDF or is damaged.`)
    }
  }
  return { items, errors }
}

/** Moves focus to the result heading so keyboard and screen-reader users land on it. */
export function focusResult() {
  requestAnimationFrame(() => document.getElementById('result-title')?.focus())
}

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.') {
  return e instanceof Error && e.message ? e.message : fallback
}
