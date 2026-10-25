// Local OCR with tesseract.js. The worker, engine and language models are
// served from this site (public/tesseract, copied by scripts/copy-assets.mjs),
// so recognition runs entirely on the device and nothing is sent anywhere.
import type { Worker } from 'tesseract.js'
import type { OcrPage } from '@/lib/pdf/ocr-layer'

export const OCR_LANGUAGES = [
  { code: 'eng', name: 'English', sizeMb: 2.9 },
  { code: 'spa', name: 'Spanish', sizeMb: 1.3 },
  { code: 'fra', name: 'French', sizeMb: 0.7 },
  { code: 'deu', name: 'German', sizeMb: 1.3 },
  { code: 'por', name: 'Portuguese', sizeMb: 1.4 },
  { code: 'hin', name: 'Hindi', sizeMb: 1.1 },
] as const

export type OcrLanguage = (typeof OCR_LANGUAGES)[number]['code']

export interface OcrEngine {
  recognize: (canvas: HTMLCanvasElement) => Promise<{ text: string; page: OcrPage; confidence: number }>
  terminate: () => Promise<void>
}

/**
 * Starts an OCR worker. `dpi` is the resolution pages are rendered at;
 * `onProgress` receives 0..1 for the current page.
 */
export async function createOcrEngine(language: OcrLanguage, dpi: number, onProgress?: (p: number, status: string) => void): Promise<OcrEngine> {
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const worker: Worker = await createWorker(language, OEM.LSTM_ONLY, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/core',
    langPath: '/tesseract/lang',
    gzip: true,
    workerBlobURL: false,
    logger: (m) => onProgress?.(m.progress, m.status),
  })
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: '1', user_defined_dpi: String(Math.round(dpi)) })
  return {
    async recognize(canvas) {
      const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true })
      const words = (data.blocks ?? []).flatMap((b) =>
        b.paragraphs.flatMap((p) =>
          p.lines.flatMap((l) =>
            l.words
              .filter((w) => w.text.trim() && w.confidence > 30)
              .map((w) => ({ text: w.text, x0: w.bbox.x0 / canvas.width, y0: w.bbox.y0 / canvas.height, x1: w.bbox.x1 / canvas.width, y1: w.bbox.y1 / canvas.height }))
          )
        )
      )
      return { text: data.text, page: { words }, confidence: data.confidence }
    },
    terminate: () => worker.terminate().then(() => undefined),
  }
}
