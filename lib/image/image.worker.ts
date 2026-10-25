// Web Worker for CPU-heavy pixel work, so large photos don't freeze the page.
import { detectDocument } from './geometry'
import { processPixels, type PageEdits } from './pipeline'

type Request =
  | { id: number; op: 'process'; data: Uint8ClampedArray; width: number; height: number; edits: PageEdits; maxSide: number }
  | { id: number; op: 'detect'; data: Uint8ClampedArray; width: number; height: number }

self.onmessage = (event: MessageEvent<Request>) => {
  const req = event.data
  try {
    if (req.op === 'process') {
      const out = processPixels({ data: req.data, width: req.width, height: req.height }, req.edits, req.maxSide)
      ;(self as unknown as Worker).postMessage({ id: req.id, ok: true, data: out.data, width: out.width, height: out.height }, [
        out.data.buffer,
      ])
    } else {
      const found = detectDocument({ data: req.data, width: req.width, height: req.height })
      ;(self as unknown as Worker).postMessage({ id: req.id, ok: true, detection: found })
    }
  } catch (e) {
    ;(self as unknown as Worker).postMessage({ id: req.id, ok: false, error: e instanceof Error ? e.message : 'Image processing failed' })
  }
}
