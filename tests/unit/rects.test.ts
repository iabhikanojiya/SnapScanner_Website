import { describe, expect, it } from 'vitest'
import { mergeLineRects } from '@/lib/pdf/rects'

describe('mergeLineRects', () => {
  it('merges touching rectangles on a line and keeps lines separate', () => {
    const merged = mergeLineRects([
      { left: 10, top: 100, right: 50, bottom: 112 },
      { left: 50, top: 100, right: 90, bottom: 112 },
      { left: 92, top: 101, right: 140, bottom: 112 },
      { left: 10, top: 120, right: 60, bottom: 132 },
      { left: 0, top: 0, right: 0, bottom: 10 },
    ])
    expect(merged).toEqual([
      { left: 10, top: 100, right: 140, bottom: 112 },
      { left: 10, top: 120, right: 60, bottom: 132 },
    ])
  })
})
