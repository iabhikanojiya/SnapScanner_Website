// Turning a text selection's client rectangles into clean highlight boxes.

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Merges rectangles that sit on the same line and touch or overlap, so a
 * selection made of many spans becomes one box per line.
 */
export function mergeLineRects(rects: Box[], tolerance = 2): Box[] {
  const sorted = rects.filter((r) => r.right - r.left > 0.5 && r.bottom - r.top > 0.5).sort((a, b) => a.top - b.top || a.left - b.left)
  const out: Box[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    const sameLine = last && Math.abs(last.top - r.top) <= tolerance + (last.bottom - last.top) * 0.3 && Math.abs(last.bottom - r.bottom) <= tolerance + (last.bottom - last.top) * 0.3
    if (last && sameLine && r.left <= last.right + tolerance * 3) {
      last.left = Math.min(last.left, r.left)
      last.right = Math.max(last.right, r.right)
      last.top = Math.min(last.top, r.top)
      last.bottom = Math.max(last.bottom, r.bottom)
    } else {
      out.push({ ...r })
    }
  }
  return out
}
