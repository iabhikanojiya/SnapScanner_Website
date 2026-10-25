'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { autoDetect, createPages, disposePage, renderPreview, type ImagePage } from '@/lib/image/pages'
import type { PageEdits } from '@/lib/image/pipeline'

/** Page list state with previews that refresh whenever a page's edits change. */
export function useImagePages() {
  const [pages, setPages] = useState<ImagePage[]>([])
  const [adding, setAdding] = useState(false)
  const rendered = useRef(new Map<string, string>())
  const pagesRef = useRef(pages)
  useEffect(() => {
    pagesRef.current = pages
  })

  // Regenerate previews for pages whose edits changed since the last render.
  useEffect(() => {
    for (const page of pages) {
      const key = JSON.stringify(page.edits)
      if (rendered.current.get(page.id) === key) continue
      rendered.current.set(page.id, key)
      renderPreview(page)
        .then((url) => {
          setPages((cur) => {
            const target = cur.find((p) => p.id === page.id)
            if (!target || JSON.stringify(target.edits) !== key) {
              URL.revokeObjectURL(url)
              return cur
            }
            if (target.previewUrl) URL.revokeObjectURL(target.previewUrl)
            return cur.map((p) => (p.id === page.id ? { ...p, previewUrl: url } : p))
          })
        })
        .catch(() => undefined)
    }
  }, [pages])

  useEffect(() => () => pagesRef.current.forEach(disposePage), [])

  const add = useCallback(async (files: File[], opts: { detect: boolean; filter?: PageEdits['filter'] }) => {
    setAdding(true)
    try {
      const { pages: created, errors } = await createPages(files, pagesRef.current.length)
      const filtered = opts.filter ? created.map((p) => ({ ...p, edits: { ...p.edits, filter: opts.filter! } })) : created
      const ready = opts.detect ? await Promise.all(filtered.map((p) => autoDetect(p).catch(() => p))) : filtered
      setPages((cur) => [...cur, ...ready])
      return { added: ready, errors }
    } finally {
      setAdding(false)
    }
  }, [])

  const update = useCallback((id: string, edits: Partial<PageEdits>) => {
    setPages((cur) => cur.map((p) => (p.id === id ? { ...p, edits: { ...p.edits, ...edits } } : p)))
  }, [])

  const setFilterForAll = useCallback((filter: PageEdits['filter']) => {
    setPages((cur) => cur.map((p) => ({ ...p, edits: { ...p.edits, filter } })))
  }, [])

  const remove = useCallback((id: string) => {
    setPages((cur) => {
      const page = cur.find((p) => p.id === id)
      if (page) disposePage(page)
      rendered.current.delete(id)
      return cur.filter((p) => p.id !== id)
    })
  }, [])

  const clear = useCallback(() => {
    setPages((cur) => {
      cur.forEach(disposePage)
      rendered.current.clear()
      return []
    })
  }, [])

  return { pages, setPages, adding, add, update, setFilterForAll, remove, clear }
}
