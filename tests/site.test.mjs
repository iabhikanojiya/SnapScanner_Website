// Checks the production build output: metadata, links, structured data,
// static files and content-accuracy guardrails. Run `npm run build` first.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const APP = join(ROOT, '.next/server/app')
const SITE = 'https://snapscanner.vercel.app'
const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.antigravity.snapscanner.snap_scanner&amp;hl=en_IN'
const SUPPORT_EMAIL = 'fusionsix.tech@gmail.com'

// Every processing tool in the registry (lib/tools.ts). The resume builder and
// the Create Studio makers have their own routes.
const TOOL_IDS = [...readFileSync(join(ROOT, 'lib/tools.ts'), 'utf8').matchAll(/^  '([a-z0-9-]+)',$/gm)].map((m) => m[1])
const CREATE_TOOLS = { 'id-card-maker': '/create/id-cards', 'invoice-maker': '/create/invoices', 'business-card-maker': '/create/business-cards', 'certificate-maker': '/create/certificates', 'photo-collage-maker': '/create/photo-collages', 'letterhead-maker': '/create/letterheads', 'festival-greeting-maker': '/create/festival-greetings' }
const TOOL_ROUTES = TOOL_IDS.filter((id) => id !== 'resume-builder' && !(id in CREATE_TOOLS)).map((id) => `/tools/${id}`)
const CREATE_ROUTES = Object.values(CREATE_TOOLS)
const CREATE_EDITORS = CREATE_ROUTES.map((r) => `${r}/edit`)
/** Tools that start from typed or pasted input rather than a file picker. */
const NO_FILE_INPUT = new Set(['/tools/html-to-pdf', '/tools/qr-code-generator'])
const PAGES = ['/', '/tools', ...TOOL_ROUTES, '/resume-builder', '/create', ...CREATE_ROUTES, '/assistant', '/files', '/support', '/privacy-policy', '/terms']
const fileFor = (route) => (route === '/' ? 'index.html' : `${route.slice(1)}.html`)

if (!existsSync(join(APP, 'index.html'))) {
  throw new Error('No production build found. Run `npm run build` before `npm run test:site`.')
}

const html = Object.fromEntries(PAGES.map((route) => [route, readFileSync(join(APP, fileFor(route)), 'utf8')]))
const editors = Object.fromEntries(['/resume-builder/edit', ...CREATE_EDITORS].map((r) => [r, readFileSync(join(APP, fileFor(r)), 'utf8')]))

// The rendered document without the serialized RSC payload, which repeats it.
const visible = (doc) => doc.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
const meta = (doc, attr, name) => doc.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1]
const hrefs = (doc) => [...visible(doc).matchAll(/href="([^"]+)"/g)].map((m) => m[1])
const ids = (doc) => new Set([...visible(doc).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
const text = (doc) => visible(doc).replace(/<[^>]+>/g, ' ').replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, ' ')

test('every route has unique, complete metadata', () => {
  const titles = new Set()
  const descriptions = new Set()
  for (const [route, doc] of Object.entries(html)) {
    const title = doc.match(/<title>([^<]+)<\/title>/)?.[1]
    assert.ok(title, `${route}: missing <title>`)
    assert.ok(title.includes('Snap Scanner'), `${route}: title should name the site: ${title}`)
    assert.ok(!/Snap Scanner.*\|.*Snap Scanner/.test(title), `${route}: doubled site name in title: ${title}`)
    titles.add(title)

    const description = meta(doc, 'name', 'description')
    assert.ok(description && description.length > 70 && description.length < 260, `${route}: description length (${description?.length})`)
    descriptions.add(description)

    const canonical = doc.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
    assert.equal(canonical, route === '/' ? SITE : `${SITE}${route}`, `${route}: canonical`)
    assert.equal(meta(doc, 'property', 'og:url'), route === '/' ? SITE : `${SITE}${route}`, `${route}: og:url`)
    assert.equal(meta(doc, 'property', 'og:image'), `${SITE}/og-image.png`, `${route}: og:image`)
    assert.equal(meta(doc, 'property', 'og:image:width'), '1200')
    assert.equal(meta(doc, 'property', 'og:image:height'), '630')
    assert.equal(meta(doc, 'name', 'twitter:card'), 'summary_large_image')
    assert.equal(meta(doc, 'name', 'twitter:image'), `${SITE}/og-image.png`)
    assert.equal(meta(doc, 'name', 'robots'), 'index, follow', `${route}: robots`)
  }
  assert.equal(titles.size, PAGES.length, 'titles must be unique')
  assert.equal(descriptions.size, PAGES.length, 'descriptions must be unique')
})

test('the editors are not indexed', () => {
  const robots = readFileSync(join(APP, 'robots.txt.body'), 'utf8')
  for (const [route, doc] of Object.entries(editors)) {
    assert.equal(meta(doc, 'name', 'robots'), 'noindex, nofollow', `${route}: robots meta`)
    assert.ok(robots.includes(`Disallow: ${route}`), `robots.txt should disallow ${route}`)
  }
})

test('Create Studio pages advertise real template counts', () => {
  for (const route of CREATE_ROUTES) {
    const m = text(html[route]).match(/(\d+) templates · Free/)
    assert.ok(m && Number(m[1]) >= 25, `${route}: at least 25 templates`)
    assert.match(html[route], /data-testid="template-grid"/, `${route}: template gallery is rendered`)
  }
  for (const route of ['/resume-builder', ...CREATE_ROUTES]) assert.ok(hrefs(html['/create']).includes(route), `/create links to ${route}`)
  assert.match(text(html['/create']), /Create something great\./)
})

test('every page has one h1, first', () => {
  for (const [route, doc] of Object.entries({ ...html, ...editors })) {
    const body = visible(doc)
    assert.equal((body.match(/<h1\b/g) || []).length, 1, `${route}: exactly one h1`)
    assert.equal(body.match(/<h([1-6])\b/)?.[1], '1', `${route}: first heading should be h1`)
  }
})

test('internal links point to existing routes and anchors', () => {
  const known = new Set([...PAGES, ...Object.keys(editors)])
  for (const [route, doc] of Object.entries(html)) {
    for (const href of hrefs(doc)) {
      if (!href.startsWith('/') && !href.startsWith('#')) continue
      if (href.startsWith('/_next/') || /\.(png|json|webp|jpg|css|js|woff2|svg|ico)$/.test(href)) continue
      if (href.endsWith('.txt')) {
        assert.ok(existsSync(join(ROOT, 'public', href)), `${route}: missing static file ${href}`)
        continue
      }
      const [pathWithQuery, hash] = href.startsWith('#') ? [route, href.slice(1)] : href.split('#')
      const path = pathWithQuery.split('?')[0]
      assert.ok(known.has(path), `${route}: link to unknown route ${href}`)
      if (hash && html[path]) assert.ok(ids(html[path]).has(hash), `${route}: anchor #${hash} missing on ${path}`)
    }
  }
})

test('every advertised tool has a working page with a file input', () => {
  assert.ok(TOOL_ROUTES.length >= 36, `expected the full tool registry, found ${TOOL_ROUTES.length}`)
  for (const route of TOOL_ROUTES) {
    assert.ok(existsSync(join(APP, fileFor(route))), `advertised tool ${route} has no built page`)
    if (!NO_FILE_INPUT.has(route)) assert.match(html[route], /<input[^>]+type="file"/, `${route}: no file input`)
    assert.ok(hrefs(html['/tools']).includes(route), `/tools doesn't link to ${route}`)
  }
  const sitemap = readFileSync(join(APP, 'sitemap.xml.body'), 'utf8')
  for (const route of PAGES) assert.ok(sitemap.includes(`<loc>${route === '/' ? SITE : SITE + route}</loc>`), `sitemap missing ${route}`)
  for (const route of Object.keys(editors)) assert.ok(!sitemap.includes(route), `sitemap must not list ${route}`)
})

test('the home page shows the tool launcher before other sections', () => {
  const body = visible(html['/'])
  const search = body.indexOf('id="home-search"')
  assert.ok(search > 0, 'home search box')
  assert.ok(search < body.indexOf('id="organize"'), 'launcher comes first')
  for (const route of ['/tools/merge-pdf', '/tools/compress-pdf', '/tools/scan-pdf', '/resume-builder']) assert.ok(hrefs(html['/']).includes(route))
})

test('external CTAs use the official Google Play listing and support email', () => {
  for (const [route, doc] of Object.entries(html)) {
    const links = hrefs(doc)
    const play = links.filter((h) => h.includes('play.google.com'))
    assert.ok(play.length >= 1, `${route}: no Google Play link`)
    for (const h of play) assert.equal(h, PLAY_URL, `${route}: unexpected Play URL ${h}`)
    for (const h of links.filter((l) => l.startsWith('mailto:'))) assert.ok(h.startsWith(`mailto:${SUPPORT_EMAIL}`), `${route}: unexpected mailto ${h}`)
    assert.ok(links.includes('/privacy-policy'), `${route}: footer privacy link`)
    assert.ok(links.includes('/terms'), `${route}: footer terms link`)
    assert.ok(!links.includes('#'), `${route}: placeholder "#" link`)
  }
})

test('the Google Play URL is defined in exactly one source file', () => {
  const offenders = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(name) && readFileSync(p, 'utf8').includes('play.google.com/store/apps')) offenders.push(p.replace(ROOT, ''))
    }
  }
  for (const dir of ['app', 'components', 'lib']) walk(join(ROOT, dir))
  assert.deepEqual(offenders, ['lib/site.ts'])
})

test('no phone mockups or app screenshots are used', () => {
  for (const [route, doc] of Object.entries(html)) {
    assert.ok(!/\/screenshots\/|phone-frame|PhoneFrame|shadow-phone/.test(visible(doc)), `${route}: phone mockup or screenshot`)
  }
  assert.ok(!existsSync(join(ROOT, 'components/PhoneFrame.tsx')))
})

test('structured data is valid JSON with factual properties only', () => {
  const blocks = [...html['/'].matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
  const app = blocks.find((b) => b['@type'] === 'MobileApplication')
  assert.ok(app, 'MobileApplication schema on the home page')
  assert.equal(app.operatingSystem, 'Android')
  assert.equal(app.installUrl, PLAY_URL.replace('&amp;', '&'))
  for (const forbidden of ['aggregateRating', 'review', 'interactionStatistic', 'downloadCount']) assert.ok(!(forbidden in app), `schema must not include ${forbidden}`)
  assert.ok(blocks.some((b) => b['@type'] === 'Organization'))
  assert.ok(blocks.some((b) => b['@type'] === 'FAQPage'))
})

test('home page review figures match the verified Google Play data and the tool registry', () => {
  // Ratings, downloads and reviews may only come from lib/play-store.ts, which records
  // what the official listing shows and when it was checked.
  const data = readFileSync(join(ROOT, 'lib/play-store.ts'), 'utf8')
  const field = (name) => data.match(new RegExp(`${name}: '?([^',\\n]+)'?,`))?.[1]
  const t = text(html['/'])
  assert.match(data, /LAST_VERIFIED = '\d{4}-\d{2}-\d{2}'/)
  assert.ok(t.includes(`App downloads ${field('downloads')}`), 'downloads figure from the data file')
  assert.ok(t.includes(`${Number(field('rating')).toFixed(1)} / 5 from ${field('ratingCount')} ratings`), 'rating and rating count from the data file')
  for (const m of data.matchAll(/text: (['"])(.*?)\1,/g)) assert.ok(visible(html['/']).includes(m[2].replace(/'/g, '&#x27;').slice(0, 40)), `review shown verbatim: ${m[2].slice(0, 30)}`)
  // The tool count is the registry minus format-limited variants of Images to PDF.
  const ids = [...readFileSync(join(ROOT, 'lib/tools.ts'), 'utf8').matchAll(/^  '([a-z0-9-]+)',$/gm)].length
  assert.ok(t.includes(`Free tools on this website ${ids - 3}`), `tool count ${ids - 3}`)
  for (const v of ['jpg-to-pdf', 'png-to-pdf', 'webp-to-pdf']) assert.match(readFileSync(join(ROOT, `app/tools/${v}/page.tsx`), 'utf8'), /<ImageToPdfTool tool=/, `${v} is a variant of Images to PDF`)
})

test('copy avoids unsupported or unverifiable claims', () => {
  const banned = [
    [/\bpricing\b|\bper month\b|\/mo\b|premium plan|subscription plan/i, 'pricing or plans'],
    [/\bocr-powered\b|\bai-powered\b|chatgpt|gpt-\d|powered by ai/i, 'unsupported features'],
    [/[0-9.]+\s?(k|m)\+?\s+(downloads|users)|★|5-star|star rating|trusted by/i, 'ratings or usage numbers'],
    [/testimonial|loved by/i, 'testimonials'],
    [/never leave your device|100% (secure|private)|bank-level|military-grade/i, 'absolute security claims'],
    [/edit (the )?existing text|edit pdf text/i, 'PDF text editing'],
    [/qualified (electronic|digital) signature|legally binding signature/i, 'signature claims'],
  ]
  for (const [route, doc] of Object.entries(html)) {
    const t = text(doc)
    for (const [pattern, why] of banned) assert.ok(!pattern.test(t), `${route}: found ${pattern} (${why})`)
    // No account UI: no link or button labelled as a login, sign-up or account action.
    const controls = [...visible(doc).matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2].replace(/<[^>]+>/g, ' ').trim())
    for (const label of controls) assert.ok(!/^(log ?in|sign ?in|sign ?up|register|create (an )?account|my account|upgrade)\b/i.test(label), `${route}: account control "${label}"`)
  }
  // The assistant is described as rule-based, not AI.
  assert.match(text(html['/assistant']), /rule/i)
  assert.match(text(html['/tools/sign-pdf']), /isn’t a certificate-based digital signature/)
})

test('pages load no third-party scripts, styles or fonts', () => {
  for (const [route, doc] of Object.entries(html)) {
    for (const m of doc.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(https?:[^"]+)"/g)) {
      assert.ok(m[1].startsWith(SITE) || m[1].includes('play.google.com'), `${route}: external resource ${m[1]}`)
    }
  }
})

test('pdf.js and OCR assets are self-hosted', () => {
  for (const f of ['pdf.worker.min.mjs', 'standard_fonts', 'cmaps', 'wasm']) assert.ok(existsSync(join(ROOT, 'public/pdfjs', f)), `public/pdfjs/${f}`)
  for (const f of ['worker.min.js', 'core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-relaxedsimd-lstm.wasm.js', 'lang/eng.traineddata.gz', 'lang/hin.traineddata.gz'])
    assert.ok(existsSync(join(ROOT, 'public/tesseract', f)), `public/tesseract/${f}`)
  // OCR is configured to load only from this site.
  const ocr = readFileSync(join(ROOT, 'lib/ocr.ts'), 'utf8')
  assert.match(ocr, /workerPath: '\/tesseract\/worker\.min\.js'/)
  assert.match(ocr, /langPath: '\/tesseract\/lang'/)
  assert.doesNotMatch(ocr, /https?:\/\//)
})

test('no paid APIs, AI services or secrets are used', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
  for (const banned of ['openai', '@anthropic-ai/sdk', '@google/generative-ai', '@google/genai', 'cohere-ai', 'firebase', '@vercel/analytics'])
    assert.ok(!deps.includes(banned), `dependency ${banned}`)
  const offenders = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx|mjs)$/.test(name) && /api[_-]?key|process\.env\.(?!NODE_ENV|CI|E2E_BASE_URL)|https:\/\/api\./i.test(readFileSync(p, 'utf8'))) offenders.push(p.replace(ROOT, ''))
    }
  }
  for (const dir of ['app', 'components', 'lib']) walk(join(ROOT, dir))
  assert.deepEqual(offenders, [])
})

test('third-party notices cover the shipped open-source libraries', () => {
  const notices = readFileSync(join(ROOT, 'public/third-party-notices.txt'), 'utf8')
  for (const pkg of ['pdfjs-dist', '@cantoo/pdf-lib', 'tesseract.js', 'docx', 'react', 'next']) assert.match(notices, new RegExp(`^${pkg.replace(/[./]/g, '\\$&')} \\d`, 'm'), pkg)
  // Corrections from docs/third-party-license-audit.md.
  assert.match(notices, /^@tesseract\.js-data\/eng 1\.0\.0 \(Apache-2\.0/m, 'OCR language data is Apache-2.0 upstream')
  assert.ok(notices.includes('This software is based in part on the work of the Independent JPEG Group.'), 'IJG acknowledgement')
  for (const part of ['Leptonica', 'libtiff', 'libpng', 'zlib', 'libwebp', 'GIFLIB', 'Plus Jakarta Sans', 'Caveat', 'Dancing Script', 'Homemade Apple', 'Liberation Sans', 'core-js'])
    assert.match(notices, new RegExp(`^${part}`, 'm'), `notice for ${part}`)
  assert.ok(!notices.includes('no licence file is included in the package'), 'no placeholder notices remain')
  assert.ok(existsSync(join(ROOT, 'public/tesseract/lang/LICENSE')), 'licence next to the OCR language models')
})

test('app-ads.txt keeps the exact AdMob line', () => {
  assert.equal(readFileSync(join(APP, 'app-ads.txt.body'), 'utf8'), 'google.com, pub-8348005705345032, DIRECT, f08c47fec0942fa0\n')
})

test('security headers allow only what the tools need', () => {
  const config = readFileSync(join(ROOT, 'next.config.ts'), 'utf8')
  assert.match(config, /camera=\(self\)/)
  assert.match(config, /microphone=\(\)/)
  assert.match(config, /connect-src 'self'/)
  assert.match(config, /frame-ancestors 'none'/)
})

const jsonLd = (doc) => [...doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
const decode = (s) => s.replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')

test('FAQ answers are in the server-rendered HTML, matching their structured data', () => {
  for (const [route, doc] of Object.entries(html)) {
    const faq = jsonLd(doc).find((b) => b['@type'] === 'FAQPage')
    if (!faq) continue
    const body = decode(visible(doc))
    for (const q of faq.mainEntity) {
      assert.ok(body.includes(q.name), `${route}: FAQ question not visible: ${q.name}`)
      assert.ok(body.includes(q.acceptedAnswer.text.slice(0, 60)), `${route}: FAQ answer not in HTML: ${q.name}`)
    }
  }
})

test('tool pages have formats, a FAQ and breadcrumb structured data', () => {
  for (const route of TOOL_ROUTES) {
    const blocks = jsonLd(html[route])
    assert.ok(blocks.some((b) => b['@type'] === 'FAQPage'), `${route}: FAQPage`)
    const crumbs = blocks.find((b) => b['@type'] === 'BreadcrumbList')
    assert.ok(crumbs, `${route}: BreadcrumbList`)
    assert.equal(crumbs.itemListElement.at(-1).item, `${SITE}${route}`, `${route}: breadcrumb ends at the page`)
    assert.match(text(html[route]), /Supported files Input .+ Output /, `${route}: supported files section`)
  }
  for (const route of CREATE_ROUTES) assert.ok(jsonLd(html[route]).some((b) => b['@type'] === 'BreadcrumbList'), `${route}: BreadcrumbList`)
})

test('robots.txt lets search and AI search crawlers reach public pages', () => {
  const robots = readFileSync(join(APP, 'robots.txt.body'), 'utf8')
  const groups = robots.split(/\n\s*\n/)
  for (const bot of ['*', 'Googlebot', 'Bingbot', 'OAI-SearchBot', 'Claude-SearchBot']) {
    const group = groups.find((g) => new RegExp(`^User-Agent: ${bot.replace('*', '\\*')}$`, 'im').test(g))
    assert.ok(group, `robots.txt group for ${bot}`)
    assert.match(group, /^Allow: \/$/m, `${bot} allowed`)
    assert.doesNotMatch(group, /^Disallow: \/$/m, `${bot} must not be blocked`)
  }
  assert.match(robots, new RegExp(`Sitemap: ${SITE}/sitemap.xml`))
})
