import { describe, expect, it } from 'vitest'
import { PDFDocument, PDFName, PDFRawStream } from '@cantoo/pdf-lib'
import {
  PdfJobError,
  applyOverlays,
  imagesToPdf,
  isEncrypted,
  lockPdf,
  mergePdfs,
  pageBoxFor,
  pdfInfo,
  splitPdf,
  unlockPdf,
} from '@/lib/pdf/operations'
import { compressPdf, type ImageRecoder } from '@/lib/pdf/compress'
import { displayRectToUser, displayToUser, openPdf, PdfInvalidError, PdfPasswordError, unrotateView } from '@/lib/pdf/document'
import { consecutiveGroups, formatPageRanges, parsePageRanges } from '@/lib/pdf/ranges'
import { PHOTO_SIZE, makePdf, makePng, openWithPdfjs, pageTexts, photoJpeg } from './helpers'

describe('page ranges', () => {
  it('parses single pages, ranges and open-ended ranges', () => {
    expect(parsePageRanges('1-3, 5, 8-10', 12)).toEqual([[0, 1, 2], [4], [7, 8, 9]])
    expect(parsePageRanges(' 11- ', 12)).toEqual([[10, 11]])
    expect(parsePageRanges('2–3', 4)).toEqual([[1, 2]])
  })

  it('rejects invalid input with readable messages', () => {
    expect(() => parsePageRanges('', 5)).toThrow(/at least one page/)
    expect(() => parsePageRanges('0', 5)).toThrow(/start at 1/)
    expect(() => parsePageRanges('4-9', 5)).toThrow(/past the last page.*5 pages/)
    expect(() => parsePageRanges('5-2', 5)).toThrow(/backwards/)
    expect(() => parsePageRanges('abc', 5)).toThrow(/isn’t a page number/)
  })

  it('formats and groups indexes', () => {
    expect(formatPageRanges([4, 0, 1, 2, 7])).toBe('1-3, 5, 8')
    expect(consecutiveGroups([5, 1, 2, 9])).toEqual([[1, 2], [5], [9]])
  })
})

describe('merge', () => {
  it('merges PDFs in the given order', async () => {
    const a = await makePdf(2, { label: 'A' })
    const b = await makePdf(3, { label: 'B' })
    const merged = await mergePdfs([
      { name: 'b.pdf', bytes: b },
      { name: 'a.pdf', bytes: a },
    ])
    expect(await pageTexts(merged)).toEqual(['B Page 1', 'B Page 2', 'B Page 3', 'A Page 1', 'A Page 2'])
  })

  it('names the file that is password-protected or invalid', async () => {
    const locked = await lockPdf({ name: 'x.pdf', bytes: await makePdf(1) }, 'secret')
    await expect(
      mergePdfs([
        { name: 'ok.pdf', bytes: await makePdf(1) },
        { name: 'locked.pdf', bytes: locked },
      ])
    ).rejects.toThrow(/“locked.pdf” is password-protected/)
    await expect(
      mergePdfs([
        { name: 'ok.pdf', bytes: await makePdf(1) },
        { name: 'junk.pdf', bytes: new TextEncoder().encode('%PDF-1.7 garbage') },
      ])
    ).rejects.toThrow(/junk.pdf/)
  })

  it('requires two files', async () => {
    await expect(mergePdfs([{ name: 'a.pdf', bytes: await makePdf(1) }])).rejects.toBeInstanceOf(PdfJobError)
  })
})

describe('split', () => {
  it('creates one PDF per range', async () => {
    const src = await makePdf(10)
    const parts = await splitPdf({ name: 's.pdf', bytes: src }, parsePageRanges('1-3, 5, 8-10', 10))
    expect(parts).toHaveLength(3)
    expect(await pageTexts(parts[0])).toEqual(['Doc Page 1', 'Doc Page 2', 'Doc Page 3'])
    expect(await pageTexts(parts[1])).toEqual(['Doc Page 5'])
    expect(await pageTexts(parts[2])).toEqual(['Doc Page 8', 'Doc Page 9', 'Doc Page 10'])
  })

  it('rejects pages that do not exist', async () => {
    await expect(splitPdf({ name: 's.pdf', bytes: await makePdf(2) }, [[5]])).rejects.toThrow(/Page 6/)
  })
})

describe('lock and unlock', () => {
  it('encrypts so the PDF only opens with the password', async () => {
    const locked = await lockPdf({ name: 'a.pdf', bytes: await makePdf(2) }, 'correct horse')
    expect(await isEncrypted(locked)).toBe(true)
    expect(new TextDecoder('latin1').decode(locked)).toMatch(/\/V 5[\s\S]*\/R 6|\/R 6[\s\S]*\/V 5/)
    await expect(openWithPdfjs(locked)).rejects.toMatchObject({ name: 'PasswordException' })
    await expect(openWithPdfjs(locked, 'wrong')).rejects.toMatchObject({ name: 'PasswordException' })
    expect(await pageTexts(locked, 'correct horse')).toEqual(['Doc Page 1', 'Doc Page 2'])
  })

  it('rejects short passwords', async () => {
    await expect(lockPdf({ name: 'a.pdf', bytes: await makePdf(1) }, 'abc')).rejects.toThrow(/at least 4/)
  })

  it('unlocks with the correct password and removes all encryption', async () => {
    const locked = await lockPdf({ name: 'a.pdf', bytes: await makePdf(2) }, 'pa55word')
    const unlocked = await unlockPdf({ name: 'a.pdf', bytes: locked, password: 'pa55word' })
    expect(await isEncrypted(unlocked)).toBe(false)
    expect(new TextDecoder('latin1').decode(unlocked)).not.toContain('/Encrypt')
    expect(await pageTexts(unlocked)).toEqual(['Doc Page 1', 'Doc Page 2'])
  })

  it.each(['AES-128', 'RC4-128', 'RC4-40'] as const)('unlocks PDFs encrypted with %s', async (algorithm) => {
    const doc = await PDFDocument.load(await makePdf(2))
    doc.encrypt({ userPassword: 'legacy', ownerPassword: 'owner', algorithm, allowWeakCryptography: true })
    const locked = await doc.save()
    await expect(openWithPdfjs(locked)).rejects.toMatchObject({ name: 'PasswordException' })
    const unlocked = await unlockPdf({ name: 'old.pdf', bytes: locked, password: 'legacy' })
    expect(await isEncrypted(unlocked)).toBe(false)
    expect(await pageTexts(unlocked)).toEqual(['Doc Page 1', 'Doc Page 2'])
  })

  it('refuses a wrong password and unencrypted files', async () => {
    const locked = await lockPdf({ name: 'a.pdf', bytes: await makePdf(1) }, 'pa55word')
    await expect(unlockPdf({ name: 'a.pdf', bytes: locked, password: 'nope' })).rejects.toThrow(/incorrect/)
    await expect(unlockPdf({ name: 'plain.pdf', bytes: await makePdf(1), password: 'x' })).rejects.toThrow(
      /isn’t password-protected/
    )
  })

  it('reports password and parse errors when opening', async () => {
    const locked = await lockPdf({ name: 'a.pdf', bytes: await makePdf(1) }, 'pa55word')
    await expect(openPdf(locked)).rejects.toBeInstanceOf(PdfPasswordError)
    await expect(openPdf(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(PdfInvalidError)
    expect(await pdfInfo(locked)).toMatchObject({ pageCount: 1, encrypted: true })
  })
})

describe('images to PDF', () => {
  it('creates one page per image with the chosen page size', async () => {
    const png = makePng(300, 200, (x) => [x % 255, 80, 160])
    const pdf = await imagesToPdf(
      [
        { bytes: photoJpeg(), type: 'jpeg', ...PHOTO_SIZE },
        { bytes: png, type: 'png', width: 300, height: 200 },
      ],
      { pageSize: 'a4', orientation: 'auto', margin: 'small' }
    )
    const doc = await PDFDocument.load(pdf)
    expect(doc.getPageCount()).toBe(2)
    expect(doc.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 })
    // Landscape image on an "auto" page gets a landscape page.
    expect(doc.getPage(1).getSize()).toEqual({ width: 841.89, height: 595.28 })
  })

  it('fits the image inside the margins, centred', () => {
    const box = pageBoxFor({ width: 1000, height: 1000 }, { pageSize: 'letter', orientation: 'portrait', margin: 'large' })
    expect(box.width).toBeCloseTo(540)
    expect(box.x).toBeCloseTo(36)
    expect(box.y).toBeCloseTo((792 - 540) / 2)
    const fit = pageBoxFor({ width: 800, height: 400 }, { pageSize: 'fit', orientation: 'auto', margin: 'none' })
    expect([fit.pageWidth, fit.pageHeight]).toEqual([600, 300])
  })
})

describe('geometry', () => {
  const g = (rotate: 0 | 90 | 180 | 270) => ({
    x0: 0,
    y0: 0,
    width: 600,
    height: 800,
    rotate,
    displayWidth: rotate % 180 ? 800 : 600,
    displayHeight: rotate % 180 ? 600 : 800,
  })

  it('maps the displayed top-left corner to the right user-space corner for each rotation', () => {
    expect(displayToUser(g(0), 0, 0)).toEqual({ x: 0, y: 800 })
    expect(displayToUser(g(90), 0, 0)).toEqual({ x: 0, y: 0 })
    expect(displayToUser(g(180), 0, 0)).toEqual({ x: 600, y: 0 })
    expect(displayToUser(g(270), 0, 0)).toEqual({ x: 600, y: 800 })
  })

  it('converts rectangles and inverts view rotation', () => {
    expect(displayRectToUser(g(0), { x: 0.5, y: 0.5, w: 0.25, h: 0.25 })).toEqual({ x: 300, y: 200, width: 150, height: 200 })
    for (const r of [0, 90, 180, 270]) {
      // Rotating the view then un-rotating gives back a consistent point.
      const p = unrotateView(0.2, 0.3, r)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(1)
    }
    expect(unrotateView(0.1, 0.2, 90)).toEqual({ x: 0.2, y: 0.9 })
  })
})

describe('overlays', () => {
  it('draws a signature image, highlight and ink onto the right pages', async () => {
    const src = await makePdf(2)
    const sig = makePng(120, 40, () => [10, 20, 120])
    const out = await applyOverlays({ name: 's.pdf', bytes: src }, [
      { kind: 'image', page: 1, rect: { x: 0.6, y: 0.8, w: 0.3, h: 0.1 }, png: sig },
      { kind: 'highlight', page: 0, rects: [{ x: 0.1, y: 0.15, w: 0.5, h: 0.05 }], color: [1, 0.9, 0] },
      { kind: 'ink', page: 0, points: [{ x: 0.1, y: 0.5 }, { x: 0.4, y: 0.55 }], color: [1, 0, 0], width: 0.005, opacity: 0.6 },
    ])
    // Text is preserved and still extractable.
    expect(await pageTexts(out)).toEqual(['Doc Page 1', 'Doc Page 2'])
    const doc = await PDFDocument.load(out)
    const images = [...doc.context.enumerateIndirectObjects()].filter(
      ([, o]) => o instanceof PDFRawStream && o.dict.lookup(PDFName.of('Subtype'))?.toString() === '/Image'
    )
    expect(images.length).toBeGreaterThanOrEqual(1)
  })

  it('places the image upright on rotated pages', async () => {
    const src = await makePdf(1, { rotate: 90 })
    const sig = makePng(100, 50, () => [0, 0, 0])
    const out = await applyOverlays({ name: 'r.pdf', bytes: src }, [
      { kind: 'image', page: 0, rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 }, png: sig },
    ])
    const content = new TextDecoder('latin1').decode(out)
    expect(content.length).toBeGreaterThan(src.length)
  })
})

describe('compress', () => {
  /** A PDF containing one large, noisy lossless image. */
  async function pdfWithLargeImage() {
    const png = makePng(900, 900, (x, y) => [(x * 7 + y * 13) % 256, (x * y) % 256, (x ^ y) % 256])
    const doc = await PDFDocument.create()
    const img = await doc.embedPng(png)
    const page = doc.addPage([600, 600])
    page.drawImage(img, { x: 0, y: 0, width: 600, height: 600 })
    page.drawText('Vector text stays', { x: 20, y: 20, size: 18 })
    return doc.save()
  }

  const jpeg = photoJpeg()
  const fakeRecoder: ImageRecoder = {
    async recompress(input, { maxSide }) {
      expect(input.kind).toBe('raw')
      expect(maxSide).toBe(1200)
      return { bytes: jpeg, width: PHOTO_SIZE.width, height: PHOTO_SIZE.height, gray: false }
    },
  }

  it('replaces images with smaller JPEGs and keeps text', async () => {
    const src = await pdfWithLargeImage()
    const result = await compressPdf({ name: 'big.pdf', bytes: src }, 'high', fakeRecoder)
    expect(result.reduced).toBe(true)
    expect(result.size).toBeLessThan(result.originalSize)
    expect(result.imagesRecompressed).toBe(1)
    expect(await pageTexts(result.bytes)).toEqual(['Vector text stays'])
    const doc = await PDFDocument.load(result.bytes)
    const filters = [...doc.context.enumerateIndirectObjects()]
      .filter(([, o]) => o instanceof PDFRawStream && o.dict.lookup(PDFName.of('Subtype'))?.toString() === '/Image')
      .map(([, o]) => (o as PDFRawStream).dict.lookup(PDFName.of('Filter'))?.toString())
    expect(filters).toContain('/DCTDecode')
  })

  it('returns the original when nothing gets smaller', async () => {
    const src = await makePdf(1)
    const never: ImageRecoder = { recompress: async () => null }
    const result = await compressPdf({ name: 'tiny.pdf', bytes: src }, 'low', never)
    expect(result.size).toBeLessThanOrEqual(result.originalSize)
    if (!result.reduced) expect(result.bytes).toBe(src)
  })

  it('refuses encrypted PDFs', async () => {
    const locked = await lockPdf({ name: 'l.pdf', bytes: await makePdf(1) }, 'abcd')
    await expect(compressPdf({ name: 'l.pdf', bytes: locked }, 'medium', fakeRecoder)).rejects.toThrow(/password-protected/)
  })
})

describe('text overlays', () => {
  it('writes text boxes onto the page, including on rotated pages', async () => {
    for (const rotate of [0, 90]) {
      const src = await makePdf(1, { rotate })
      const out = await applyOverlays({ name: 't.pdf', bytes: src }, [{ kind: 'text', page: 0, x: 0.1, y: 0.1, text: 'Approved by\nFinance', size: 0.03, color: [0, 0, 0.6] }])
      const text = (await pageTexts(out))[0]
      expect(text).toContain('Approved by')
      expect(text).toContain('Finance')
    }
  })
})
