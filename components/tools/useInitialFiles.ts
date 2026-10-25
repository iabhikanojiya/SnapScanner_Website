'use client'

import { useEffect, useRef } from 'react'
import { takeHandoff } from '@/lib/handoff'
import { getFile } from '@/lib/storage/library'
import type { ToolId } from '@/lib/tools'

/**
 * Delivers files passed to this tool, either handed over in memory by another
 * page or referenced by library id in `?files=`. Runs once on mount.
 */
export function useInitialFiles(tool: ToolId, onFiles: (files: File[]) => void, onError?: (message: string) => void) {
  const done = useRef(false)
  const handler = useRef(onFiles)
  const errorHandler = useRef(onError)
  useEffect(() => {
    handler.current = onFiles
    errorHandler.current = onError
  })

  useEffect(() => {
    if (done.current) return
    done.current = true
    const handed = takeHandoff(tool)
    if (handed.length) {
      handler.current(handed)
      return
    }
    const ids = new URLSearchParams(window.location.search).get('files')?.split(',').filter(Boolean) ?? []
    if (ids.length === 0) return
    void Promise.all(ids.map((id) => getFile(id).catch(() => undefined))).then((found) => {
      const files = found.filter((f): f is NonNullable<typeof f> => !!f).map((f) => f.file)
      if (files.length < ids.length)
        errorHandler.current?.(
          files.length === 0
            ? 'The selected files are no longer in My files.'
            : `${ids.length - files.length} of the selected files are no longer in My files.`
        )
      if (files.length) handler.current(files)
    })
  }, [tool])
}
