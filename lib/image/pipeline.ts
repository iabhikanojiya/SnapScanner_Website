// The page-processing pipeline shared by Scan to PDF and Image to PDF:
// perspective crop → rotate → filter. Pure, so it runs in the image worker.
import { applyFilter, type Pixels, type ScanFilter } from './filters'
import { FULL_QUAD, downscale, isFullQuad, rotatePixels, warpPerspective, type Quad } from './geometry'

export interface PageEdits {
  quad: Quad
  /** Clockwise, multiple of 90. */
  rotation: number
  filter: ScanFilter
}

export const DEFAULT_EDITS: PageEdits = { quad: FULL_QUAD, rotation: 0, filter: 'original' }

export function processPixels(src: Pixels, edits: PageEdits, maxSide: number): Pixels {
  let out: Pixels = isFullQuad(edits.quad)
    ? downscale({ data: new Uint8ClampedArray(src.data), width: src.width, height: src.height }, maxSide)
    : warpPerspective(src, edits.quad, maxSide)
  out = rotatePixels(out, edits.rotation)
  return applyFilter(out, edits.filter)
}
