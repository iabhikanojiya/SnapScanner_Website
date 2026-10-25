'use client'

import { useCallback, useEffect, useState } from 'react'
import { onStorageChange } from './db'
import { listFiles, listFolders, type LibraryFile, type LibraryFolder } from './library'

export interface LibraryState {
  files: LibraryFile[]
  folders: LibraryFolder[]
  loading: boolean
  error: string | null
  reload: () => void
}

/** Library contents, refreshed whenever files change in this or another tab. */
export function useLibrary(): LibraryState {
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [folders, setFolders] = useState<LibraryFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    Promise.all([listFiles(), listFolders()])
      .then(([f, d]) => {
        setFiles(f)
        setFolders(d)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Your files couldn’t be loaded.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
    return onStorageChange((scope) => {
      if (scope === 'files') reload()
    })
  }, [reload])

  return { files, folders, loading, error, reload }
}
