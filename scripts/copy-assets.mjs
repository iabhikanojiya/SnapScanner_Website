// Copies browser assets that ship inside npm packages into public/, so the
// site serves them itself and never loads code or data from a CDN:
//   public/pdfjs       pdf.js worker, fonts, CMaps and WebAssembly decoders
//   public/tesseract   OCR worker, LSTM engine and language models
//   public/word-fonts  fonts for Word to PDF
//   public/third-party-notices.txt  licences of the open-source code the site ships
// Runs automatically after `npm install` and before `dev` and `build`.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const nm = (p) => join(root, 'node_modules', p)
const version = (pkg) => JSON.parse(readFileSync(nm(`${pkg}/package.json`), 'utf8')).version

/** OCR languages offered in the UI (see lib/ocr.ts). */
export const OCR_LANGUAGES = ['eng', 'spa', 'fra', 'deu', 'por', 'hin']

function sync(dest, stampValue, copy) {
  const stamp = join(dest, 'VERSION')
  if (existsSync(stamp) && readFileSync(stamp, 'utf8') === stampValue) return
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  copy()
  writeFileSync(stamp, stampValue)
  console.log(`Copied ${dest.replace(root, '')} (${stampValue})`)
}

const pdfjs = nm('pdfjs-dist')
sync(join(root, 'public/pdfjs'), version('pdfjs-dist'), () => {
  const dest = join(root, 'public/pdfjs')
  cpSync(join(pdfjs, 'build/pdf.worker.min.mjs'), join(dest, 'pdf.worker.min.mjs'))
  for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
    if (existsSync(join(pdfjs, dir))) cpSync(join(pdfjs, dir), join(dest, dir), { recursive: true })
  }
  cpSync(join(pdfjs, 'LICENSE'), join(dest, 'LICENSE'))
})

// The trailing tag changes when the copied licence files change.
const tessStamp = `${version('tesseract.js')}+${version('tesseract.js-core')}+${OCR_LANGUAGES.join(',')}+licences-2`
sync(join(root, 'public/tesseract'), tessStamp, () => {
  const dest = join(root, 'public/tesseract')
  mkdirSync(join(dest, 'core'), { recursive: true })
  mkdirSync(join(dest, 'lang'), { recursive: true })
  cpSync(nm('tesseract.js/dist/worker.min.js'), join(dest, 'worker.min.js'))
  // LSTM-only engines (plain, SIMD and relaxed SIMD, with the WebAssembly
  // embedded); the worker picks the fastest one the browser supports.
  for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'])
    cpSync(nm(`tesseract.js-core/${f}`), join(dest, 'core', f))
  for (const lang of OCR_LANGUAGES)
    cpSync(nm(`@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`), join(dest, 'lang', `${lang}.traineddata.gz`))
  cpSync(nm('tesseract.js/LICENSE.md'), join(dest, 'LICENSE.md'))
  cpSync(nm('tesseract.js-core/LICENSE'), join(dest, 'core', 'LICENSE'))
  // The language models are Apache-2.0 upstream, although their npm packages declare MIT.
  cpSync(join(root, 'scripts/notices/packages/tessdata_best-LICENSE.txt'), join(dest, 'lang', 'LICENSE'))
})

// Word to PDF fonts (see lib/docx/fonts.ts): open-licensed stand-ins for the
// common Office fonts, with matching character widths where available.
const WORD_FONTS = {
  carlito: 'Carlito',
  caladea: 'Caladea',
  arimo: 'Arimo',
  tinos: 'Tinos',
  cousine: 'Cousine',
  'noto-sans-devanagari': 'NotoSansDevanagari',
}
const STYLES = { '400Regular': 'Regular', '700Bold': 'Bold', '400Regular_Italic': 'Italic', '700Bold_Italic': 'BoldItalic' }
const fontsStamp = Object.keys(WORD_FONTS).map((p) => `${p}@${version(`@expo-google-fonts/${p}`)}`).join(',')
sync(join(root, 'public/word-fonts'), fontsStamp, () => {
  const dest = join(root, 'public/word-fonts')
  for (const [pkg, family] of Object.entries(WORD_FONTS)) {
    for (const [dir, style] of Object.entries(STYLES)) {
      const src = nm(`@expo-google-fonts/${pkg}/${dir}/${family}_${dir}.ttf`)
      if (existsSync(src)) cpSync(src, join(dest, `${family}-${style}.ttf`))
    }
    cpSync(nm(`@expo-google-fonts/${pkg}/LICENSE_FONT`), join(dest, `LICENSE-${family}.txt`))
  }
})

// Open-source notices for everything the site ships to browsers: the licence
// text of every production dependency (and theirs), linked from the Terms.
{
  const { dirname } = await import('node:path')
  const { readdirSync } = await import('node:fs')
  const seen = new Map()
  const visit = (name, from) => {
    let dir = null
    for (let d = from; ; d = dirname(d)) {
      const candidate = join(d, 'node_modules', name)
      if (existsSync(join(candidate, 'package.json'))) {
        dir = candidate
        break
      }
      if (d === root || d === dirname(d)) break
    }
    if (!dir || seen.has(dir)) return
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    seen.set(dir, pkg)
    for (const dep of Object.keys(pkg.dependencies ?? {})) visit(dep, dir)
  }
  const top = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  for (const dep of Object.keys(top.dependencies)) visit(dep, root)
  // Verified corrections and additions (see scripts/notices/manifest.mjs).
  const { PACKAGE_OVERRIDES, EXTRA_SECTIONS } = await import('./notices/manifest.mjs')
  const overrideFor = (name) =>
    PACKAGE_OVERRIDES[name] ?? Object.entries(PACKAGE_OVERRIDES).find(([k]) => k.endsWith('*') && name.startsWith(k.slice(0, -1)))?.[1]
  const readText = (rel) => readFileSync(join(root, rel), 'utf8').trim()
  /** The "License" section of a README, for packages that keep their licence there. */
  const readmeLicence = (dir) => {
    const readme = readdirSync(dir).find((f) => /^readme/i.test(f))
    if (!readme) return null
    const text = readFileSync(join(dir, readme), 'utf8')
    const m = text.match(/^#+\s*licen[cs]e\s*$([\s\S]*)/im)
    return m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : null
  }
  const unresolved = []
  const rule = (ch) => ch.repeat(78)
  const sections = [...seen.entries()]
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
    .map(([dir, pkg]) => {
      const o = overrideFor(pkg.name)
      // Every licence-like file (some packages have separate code and font licences).
      const files = readdirSync(dir).filter((f) => /^(licen[cs]e|copying|notice)/i.test(f) && !f.endsWith('.js'))
      let text
      if (o?.files) text = o.files.map(readText).join('\n\n')
      else if (o?.readme) text = readmeLicence(dir)
      else if (files.length) text = files.map((f) => (files.length > 1 ? `[${f}]\n` : '') + readFileSync(join(dir, f), 'utf8').trim()).join('\n\n')
      if (o?.unresolved || !text) unresolved.push(`${pkg.name} ${pkg.version}`)
      const licence = o?.license ?? pkg.license ?? 'licence not declared'
      const declared = o?.license && pkg.license && o.license !== pkg.license ? ` — package metadata declares ${pkg.license}` : ''
      const body = [o?.note, text ?? (o ? null : `UNRESOLVED: the package declares ${pkg.license ?? 'no licence'} but includes no licence text.`)].filter(Boolean).join('\n\n')
      return `${rule('=')}\n${pkg.name} ${pkg.version} (${licence}${declared})\n${pkg.homepage ?? ''}\n${rule('-')}\n${body}\n`
    })
  const extras = EXTRA_SECTIONS.map((g) => {
    const items = g.items.map((it) => {
      const text = (it.files ?? []).map(readText).join('\n\n')
      return `${rule('=')}\n${it.name} (${it.license})\n${it.source ?? ''}\n${rule('-')}\n${[it.note, text].filter(Boolean).join('\n\n')}\n`
    })
    return `\n${rule('#')}\n${g.group}\n${rule('#')}\n${g.intro}\n\n${items.join('\n')}`
  })
  const header = [
    'Snap Scanner website — third-party software notices',
    '',
    'The website includes the open-source software listed below. Each component',
    'is used under its own licence, reproduced here. Licence files are also',
    'published next to the files they cover (/word-fonts, /tesseract, /pdfjs).',
    '',
    'This software is based in part on the work of the Independent JPEG Group.',
    '',
    'Sections: npm packages; OCR engine components; fonts served through',
    'next/font; files bundled with pdf.js; modules bundled inside Next.js.',
    ...(unresolved.length ? ['', 'Notices that could not be fully verified (marked UNRESOLVED below):', ...unresolved.map((u) => `  - ${u}`)] : []),
    '',
    '',
  ].join('\n')
  const out = join(root, 'public/third-party-notices.txt')
  const body = `${header}${rule('#')}\nnpm packages\n${rule('#')}\n\n${sections.join('\n')}${extras.join('\n')}`
  if (!existsSync(out) || readFileSync(out, 'utf8') !== body) {
    writeFileSync(out, body)
    console.log(`Wrote public/third-party-notices.txt (${seen.size} packages)`)
  }
}
