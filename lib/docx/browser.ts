'use client'

// Runs Word to PDF in a Web Worker. Aborting terminates the worker, which
// stops the conversion immediately and frees its memory.
import type { Stage, WordToPdfResult } from './convert'

export type { Stage }

type Message =
  | { type: 'progress'; stage: Stage; done: number; total: number }
  | ({ type: 'done' } & WordToPdfResult)
  | { type: 'error'; message: string }

export function convertWordInWorker(bytes: Uint8Array, onProgress: (stage: Stage, done: number, total: number) => void, signal: AbortSignal): Promise<WordToPdfResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./word.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      reject(new Error('This browser can’t run the converter. Update your browser and try again.'))
      return
    }
    const finish = () => {
      worker.terminate()
      signal.removeEventListener('abort', abort)
    }
    const abort = () => {
      finish()
      reject(new DOMException('Cancelled', 'AbortError'))
    }
    if (signal.aborted) return abort()
    signal.addEventListener('abort', abort)
    worker.onmessage = (e: MessageEvent<Message>) => {
      const m = e.data
      if (m.type === 'progress') onProgress(m.stage, m.done, m.total)
      else if (m.type === 'done') {
        finish()
        resolve({ bytes: m.bytes, pageCount: m.pageCount, warnings: m.warnings })
      } else {
        finish()
        reject(new Error(m.message))
      }
    }
    worker.onerror = () => {
      finish()
      reject(new Error('The converter stopped unexpectedly. The document may be too large for this device’s memory.'))
    }
    // Send a copy so the caller's bytes stay usable for another attempt.
    const copy = bytes.slice()
    worker.postMessage({ bytes: copy }, [copy.buffer])
  })
}
