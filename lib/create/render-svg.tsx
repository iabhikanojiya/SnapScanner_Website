// SVG rendering of a design page. Used for the live preview, template
// thumbnails, printing and (serialized) PNG/JPG export.
import { useId } from 'react'
import { CSS_FONTS, qrPath, type Design, type DesignPage, type El, type ImageValue } from './engine'

export type RenderMode = 'edit' | 'export' | 'thumb'

/** Where an image sits inside its frame for cover/contain fitting with zoom and pan. */
export function imagePlacement(img: ImageValue, x: number, y: number, w: number, h: number, fit: 'cover' | 'contain' = 'cover') {
  const base = fit === 'cover' ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height)
  const s = base * Math.max(1, img.zoom || 1)
  const dw = img.width * s
  const dh = img.height * s
  const ex = dw - w
  const ey = dh - h
  return { x: x - ex * (0.5 + (img.ox || 0) / 2), y: y - ey * (0.5 + (img.oy || 0) / 2), w: dw, h: dh }
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  return `M${x + rr} ${y}H${x + w - rr}A${rr} ${rr} 0 0 1 ${x + w} ${y + rr}V${y + h - rr}A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + h - rr}V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z`
}

export function framePath(el: Extract<El, { t: 'image' }>) {
  if (el.shape === 'circle') {
    const r = Math.min(el.w, el.h) / 2
    const cx = el.x + el.w / 2
    const cy = el.y + el.h / 2
    return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
  }
  return roundedRectPath(el.x, el.y, el.w, el.h, el.shape === 'rounded' ? (el.r ?? Math.min(el.w, el.h) * 0.12) : 0)
}

const PLACEHOLDER_ICONS = {
  person: (cx: number, cy: number, s: number) =>
    `M${cx - s * 0.18} ${cy - s * 0.12}a${s * 0.18} ${s * 0.18} 0 1 0 ${s * 0.36} 0a${s * 0.18} ${s * 0.18} 0 1 0 ${-s * 0.36} 0ZM${cx - s * 0.34} ${cy + s * 0.4}Q${cx - s * 0.32} ${cy + s * 0.1} ${cx} ${cy + s * 0.1}Q${cx + s * 0.32} ${cy + s * 0.1} ${cx + s * 0.34} ${cy + s * 0.4}Z`,
  photo: (cx: number, cy: number, s: number) =>
    `M${cx - s * 0.32} ${cy + s * 0.22}L${cx - s * 0.1} ${cy - s * 0.05}L${cx + s * 0.04} ${cy + s * 0.1}L${cx + s * 0.14} ${cy}L${cx + s * 0.32} ${cy + s * 0.22}ZM${cx + s * 0.08} ${cy - s * 0.18}a${s * 0.07} ${s * 0.07} 0 1 0 ${s * 0.14} 0a${s * 0.07} ${s * 0.07} 0 1 0 ${-s * 0.14} 0Z`,
  logo: (cx: number, cy: number, s: number) => `M${cx - s * 0.22} ${cy - s * 0.22}h${s * 0.44}v${s * 0.44}h${-s * 0.44}ZM${cx - s * 0.1} ${cy - s * 0.1}h${s * 0.2}v${s * 0.2}h${-s * 0.2}Z`,
  signature: (cx: number, cy: number, s: number) =>
    `M${cx - s * 0.4} ${cy + s * 0.05}Q${cx - s * 0.25} ${cy - s * 0.25} ${cx - s * 0.1} ${cy + s * 0.05}T${cx + s * 0.2} ${cy + s * 0.02}T${cx + s * 0.4} ${cy - s * 0.02}`,
}

function SvgEl({ el, mode, id }: { el: El; mode: RenderMode; id: string }) {
  switch (el.t) {
    case 'rect':
      return (
        <rect
          x={el.x}
          y={el.y}
          width={Math.max(0, el.w)}
          height={Math.max(0, el.h)}
          rx={el.r}
          fill={el.fill ?? 'none'}
          stroke={el.stroke}
          strokeWidth={el.sw}
          strokeDasharray={el.dash?.join(' ')}
          opacity={el.opacity}
        />
      )
    case 'circle':
      return <circle cx={el.cx} cy={el.cy} r={el.r} fill={el.fill ?? 'none'} stroke={el.stroke} strokeWidth={el.sw} opacity={el.opacity} />
    case 'line':
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.stroke} strokeWidth={el.sw} strokeDasharray={el.dash?.join(' ')} opacity={el.opacity} />
    case 'path':
      return <path d={el.d} fill={el.fill ?? 'none'} stroke={el.stroke} strokeWidth={el.sw} opacity={el.opacity} strokeLinecap="round" strokeLinejoin="round" />
    case 'text': {
      const ls = el.ls ?? 0
      // SVG adds letter spacing after the last glyph too; shift so it matches the PDF.
      const x = el.align === 'center' ? el.x + ls / 2 : el.align === 'right' ? el.x + ls : el.x
      return (
        <text
          x={x}
          y={el.y}
          fontFamily={CSS_FONTS[el.font]}
          fontSize={el.size}
          fontWeight={el.bold ? 700 : 400}
          fontStyle={el.italic ? 'italic' : 'normal'}
          fill={el.color}
          opacity={el.opacity}
          letterSpacing={ls || undefined}
          textAnchor={el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start'}
          xmlSpace="preserve"
          data-field={el.field}
        >
          {el.lines.map((line, i) => (
            <tspan key={i} x={x} dy={i ? el.lh : 0}>
              {line || ' '}
            </tspan>
          ))}
        </text>
      )
    }
    case 'image': {
      const clip = `${id}-clip`
      if (!el.image) {
        if (mode === 'export' || !el.placeholder || (mode === 'thumb' && (el.placeholder === 'signature' || el.placeholder === 'logo'))) return null
        const s = Math.min(el.w, el.h)
        return (
          <g opacity={el.opacity} data-placeholder={el.placeholder} data-field={el.field}>
            <path d={framePath(el)} fill="#E5E7EB" />
            <path d={PLACEHOLDER_ICONS[el.placeholder](el.x + el.w / 2, el.y + el.h / 2, s)} fill={el.placeholder === 'signature' ? 'none' : '#9CA3AF'} stroke={el.placeholder === 'signature' ? '#9CA3AF' : undefined} strokeWidth={s * 0.04} />
          </g>
        )
      }
      const p = imagePlacement(el.image, el.x, el.y, el.w, el.h, el.fit)
      return (
        <g opacity={el.opacity} data-field={el.field}>
          <clipPath id={clip}>
            <path d={framePath(el)} />
          </clipPath>
          <image href={el.image.src} x={p.x} y={p.y} width={p.w} height={p.h} clipPath={`url(#${clip})`} preserveAspectRatio="none" />
        </g>
      )
    }
    case 'qr':
      return (
        <g opacity={el.opacity}>
          {el.bg && <rect x={el.x} y={el.y} width={el.size} height={el.size} fill={el.bg} />}
          <path d={qrPath(el.data, el.x, el.y, el.size)} fill={el.color} />
        </g>
      )
    case 'group':
      return (
        <g transform={el.mirror !== undefined ? `translate(${2 * el.mirror} 0) scale(-1 1)` : `rotate(${el.rot} ${el.cx} ${el.cy})`}>
          {el.children.map((c, i) => (
            <SvgEl key={i} el={c} mode={mode} id={`${id}-${i}`} />
          ))}
        </g>
      )
  }
}

interface DesignPageSvgProps {
  design: Design
  page: DesignPage
  mode: RenderMode
  /** CSS width; height follows the aspect ratio. */
  width?: number | string
  showGuides?: boolean
  className?: string
  title?: string
}

/** A design page as SVG, in points. Bleed is drawn only when guides are shown. */
export function DesignPageSvg({ design, page, mode, width, showGuides, className, title }: DesignPageSvgProps) {
  const id = useId().replace(/:/g, '')
  const b = showGuides ? design.bleed : 0
  const vb = `${-b} ${-b} ${design.width + 2 * b} ${design.height + 2 * b}`
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={vb}
      width={width}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', background: '#FFFFFF' }}
    >
      {!showGuides && (
        <defs>
          <clipPath id={`${id}-page`}>
            <rect x={0} y={0} width={design.width} height={design.height} />
          </clipPath>
        </defs>
      )}
      <g clipPath={showGuides ? undefined : `url(#${id}-page)`}>
        <rect x={-design.bleed} y={-design.bleed} width={design.width + 2 * design.bleed} height={design.height + 2 * design.bleed} fill="#FFFFFF" />
        {page.els.map((el, i) => (
          <SvgEl key={i} el={el} mode={mode} id={`${id}-${i}`} />
        ))}
      </g>
      {showGuides && design.bleed > 0 && (
        <g pointerEvents="none" data-guides="">
          <path
            d={`M${-b} ${-b}H${design.width + b}V${design.height + b}H${-b}ZM0 0V${design.height}H${design.width}V0Z`}
            fill="#FFFFFF"
            fillRule="evenodd"
            opacity={0.55}
          />
          <rect x={0} y={0} width={design.width} height={design.height} fill="none" stroke="#E53935" strokeWidth={0.6} strokeDasharray="3 2" />
          {design.safe ? (
            <rect x={design.safe} y={design.safe} width={design.width - 2 * design.safe} height={design.height - 2 * design.safe} fill="none" stroke="#2563EB" strokeWidth={0.5} strokeDasharray="2 2" />
          ) : null}
        </g>
      )}
    </svg>
  )
}
