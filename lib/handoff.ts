// Passing files between pages without uploading them. A tool, the reader or
// the assistant can hand File objects to another tool during client-side
// navigation; files saved in the library are passed by id in the URL instead
// (`/tools/merge-pdf?files=id1,id2`). Only ids go in the URL, never contents.
import type { ToolId } from '@/lib/tools'

const pending = new Map<ToolId, File[]>()

export function handOff(tool: ToolId, files: File[]) {
  pending.set(tool, files)
}

/** Takes (and clears) files handed to this tool. */
export function takeHandoff(tool: ToolId): File[] {
  const files = pending.get(tool) ?? []
  pending.delete(tool)
  return files
}

export function toolHref(href: string, libraryIds: string[] = []) {
  return libraryIds.length ? `${href}?files=${libraryIds.map(encodeURIComponent).join(',')}` : href
}
