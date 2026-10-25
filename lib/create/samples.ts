// Illustrative images for template previews: simple programmatic SVG scenes
// and avatars, so galleries show how photo frames are filled. They're never
// added to a project.
import type { ImageValue } from './engine'
import type { Content, FieldDef } from './kit'

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const SCENES = [
  ['#7DD3FC', '#FDE68A', '#16A34A', '#166534'],
  ['#FDBA74', '#FEF3C7', '#B45309', '#78350F'],
  ['#C4B5FD', '#FBCFE8', '#6D28D9', '#4C1D95'],
  ['#99F6E4', '#FFFFFF', '#0F766E', '#134E4A'],
  ['#FCA5A5', '#FEF9C3', '#BE123C', '#881337'],
  ['#BAE6FD', '#E0F2FE', '#0369A1', '#0C4A6E'],
  ['#FDE68A', '#FFFBEB', '#CA8A04', '#713F12'],
  ['#A7F3D0', '#ECFDF5', '#059669', '#064E3B'],
  ['#DDD6FE', '#F5F3FF', '#7C3AED', '#3B0764'],
]

/** A landscape: sky, sun and two hills. */
export function sampleScene(i: number): ImageValue {
  const [sky, sun, hill, far] = SCENES[i % SCENES.length]
  const w = 800
  const h = 600
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${sun}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${560 - (i % 3) * 140}" cy="${190 + (i % 2) * 40}" r="70" fill="${sun}" opacity="0.95"/><path d="M0 ${380 + (i % 3) * 10} Q200 ${300 - (i % 2) * 30} 420 380 T800 340 V600 H0Z" fill="${far}" opacity="0.75"/><path d="M0 470 Q260 ${390 + (i % 2) * 30} 520 460 T800 450 V600 H0Z" fill="${hill}"/></svg>`
  return { src: svgUrl(svg), width: w, height: h, zoom: 1, ox: 0, oy: 0 }
}

/** A neutral head-and-shoulders avatar. */
export function sampleAvatar(): ImageValue {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#CBD5E1"/><circle cx="200" cy="190" r="88" fill="#94A3B8"/><path d="M40 500 Q50 330 200 320 Q350 330 360 500Z" fill="#64748B"/></svg>`
  return { src: svgUrl(svg), width: 400, height: 500, zoom: 1, ox: 0, oy: 0 }
}

/** Content for gallery previews: sample photos in empty photo fields and collage slots. */
export function previewContent(content: Content, fields: FieldDef[], slots = 0): Content {
  const out = { ...content }
  for (const f of fields) if (f.type === 'image' && f.imageKind === 'person' && !out[f.key]) out[f.key] = sampleAvatar()
  for (let i = 0; i < slots; i++) if (!out[`photo${i + 1}`]) out[`photo${i + 1}`] = sampleScene(i)
  return out
}
