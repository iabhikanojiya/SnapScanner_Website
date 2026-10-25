import { describe, expect, it } from 'vitest'
import { checkFile, safeFileName, sniff } from '@/lib/files/validate'
import { makePdf, makePng, photoJpeg } from './helpers'

describe('file validation', () => {
  it('identifies files by signature, not extension', async () => {
    expect(sniff(await makePdf(1))).toBe('pdf')
    expect(sniff(photoJpeg())).toBe('jpeg')
    expect(sniff(makePng(2, 2, () => [0, 0, 0]))).toBe('png')
    expect(sniff(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp')
    expect(sniff(new TextEncoder().encode('hello'))).toBe('unknown')
  })

  it('rejects mislabelled, empty and HEIC files with clear messages', async () => {
    const fakePdf = new File(['not a pdf'], 'report.pdf', { type: 'application/pdf' })
    await expect(checkFile(fakePdf, 'pdf')).rejects.toThrow(/not a recognized file type/)
    await expect(checkFile(new File([], 'empty.pdf'), 'pdf')).rejects.toThrow(/empty/)
    const heic = new File([new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode('ftypheic')])], 'IMG_1.HEIC')
    await expect(checkFile(heic, 'image')).rejects.toThrow(/HEIC/)
    const png = new File([makePng(2, 2, () => [1, 2, 3]) as BlobPart], 'image.pdf')
    await expect(checkFile(png, 'pdf')).rejects.toThrow(/is an image/)
    await expect(checkFile(png, 'image')).resolves.toMatchObject({ kind: 'png' })
  })

  it('makes safe download names', () => {
    expect(safeFileName('../../etc/passwd', 'pdf')).toBe('.. .. etc passwd.pdf')
    expect(safeFileName('a<b>:c?.pdf', 'pdf')).toBe('a b c.pdf')
    expect(safeFileName('   ', 'zip')).toBe('document.zip')
  })
})
