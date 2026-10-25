# Snap Scanner Website

[snapscanner.vercel.app](https://snapscanner.vercel.app): free PDF tools, a resume builder, a local document library and a rule-based assistant that all run in the browser, plus promotion of the Snap Scanner Android app by Fusix Studio.

There is no backend, upload server, account system, analytics or AI service. Every document operation runs client-side; files are kept in memory or, when the user saves them, in the browser's IndexedDB.

Built with Next.js 16 (App Router, every route statically prerendered), React 19, TypeScript, Tailwind CSS 3, Radix UI and Lucide icons.

## Getting started

Requires Node.js 22.13 or newer (pdf.js 6 requires it). `npm install` needs about 1 GB of disk space; the copied browser assets add ~45 MB to `public/`.

```bash
npm install        # also copies pdf.js assets into public/pdfjs
npm run dev        # http://localhost:3000
```

## Checks

```bash
npm run lint       # ESLint 9 with eslint-config-next (flat config)
npm run typecheck  # generates route types, then tsc --noEmit
npm run test:unit  # Vitest: PDF, image, search, assistant, storage and resume logic
npm run build      # production build; every route is prerendered
npm run test:site  # checks the build output (run after build)
npm run test:e2e   # Playwright: real tools in Chromium against `next start` (run after build)
npm run check      # all of the above, in order
```

The first Playwright run needs a browser: `npx playwright install chromium`. To run the e2e suite against an already-running server instead: `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.

## What's implemented

All 37 tools live under `/tools/<id>` and are listed in `lib/tools.ts`. Each one processes real files in the browser and has browser tests that reopen the output.

| Category | Tools |
| --- | --- |
| Organize PDF | Merge · Split · Remove pages · Extract pages (accepts `?pages=2-5`) · Organize (drag to reorder, rotate, duplicate, delete) · Rotate |
| Optimize PDF | Compress (High/Medium/Low image recompression and structure clean-up; keeps the original if it can’t shrink) · Repair (rebuilds the structure; optional image recovery) · OCR (Tesseract on-device, 6 languages, searchable PDF and .txt) |
| Convert to PDF | Scan to PDF (camera or upload, edge detection, manual crop, 8 filters) · Images to PDF · JPG / PNG / WebP to PDF · HTML to PDF (sanitized preview, saved with the browser’s print dialog) |
| Convert from PDF | PDF to JPG · PDF to PNG (72/150/300 dpi, ZIP) · PDF to Text · PDF to Markdown (headings, lists and paragraphs inferred from the layout) |
| Edit PDF | PDF Reader (zoom, fit, rotate, search) · Sign · Annotate (text highlights, marker, pen, text boxes, images) · Page numbers · Watermark (text or image) · Crop (CropBox) · Fill form (AcroForm, optional flatten) · Compare (word diff and pixel diff) |
| PDF security | Lock (AES-256) · Unlock (AES-256/128, RC4) · Redact (permanent: marked pages are flattened with the boxes burned in, then verified) · Metadata (inspect, edit, remove) |
| Image tools | Resize · Crop (perspective) · Rotate & flip · Filters · Convert (JPG/PNG/WebP) |
| Create | Resume Builder (`/resume-builder`): 20 templates, 9 palettes, live editor, autosave, PDF export |
| Create Studio (`/create`) | ID Card Maker (26 templates) · Invoice Maker (25) · Business Card Maker (26) · Certificate Maker (26) · Photo Collage Maker (26) · Festival Greeting Maker (32). Each has a gallery with search and filters (`/create/<tool>`) and an editor (`/create/<tool>/edit?project=<id>`) with undo/redo, template switching, colors, sizes, image crop/rotate, local QR codes, autosaved projects, and PDF, PNG and JPG export |

Plus `/files` (IndexedDB library), `/assistant` (rule-based Snap Assistant that opens all of these tools with files and page ranges), `/tools`, `/support` and `/privacy-policy`.

Old routes `/features` and `/pdf-scanner` permanently redirect to `/tools` and `/tools/scan-pdf`.

## Where things live

| Path | What |
| --- | --- |
| `lib/site.ts` | Site URL, **Google Play URL** (the only place it's defined), support email, AdMob `app-ads.txt` line |
| `lib/tools.ts` | Tool registry used by navigation, directory, sitemap, homepage and assistant |
| `lib/tool-content.ts` | Per-tool supported files, uses and FAQ shown on each `/tools` page (and as FAQPage data) |
| `lib/metadata.ts` | Page metadata, breadcrumb and FAQ structured-data helpers |
| `app/robots.ts`, `app/sitemap.ts` | Crawler policy (search vs. AI-training crawlers) and the sitemap; see `docs/seo-audit.md` |
| `lib/limits.ts` | File size, page count and batch limits |
| `lib/files/validate.ts` | File-signature sniffing and validation (never trusts extensions or MIME types) |
| `lib/pdf/` | `operations.ts` (merge, split, lock, unlock, images→PDF, overlays), `compress.ts`, `ranges.ts`, `search.ts`, `document.ts` (loading, coordinate mapping incl. `/Rotate`, object cleanup), `viewer.ts` (pdf.js) |
| `lib/image/` | Pure filters, perspective warp, edge detection and pipeline (`filters.ts`, `geometry.ts`, `pipeline.ts`), a Web Worker, and browser helpers |
| `lib/storage/` | IndexedDB schema, library API, query/sort logic, React hook |
| `lib/resume/` | Data model, template configs, draft store, DOM-to-PDF exporter |
| `lib/create/` | Create Studio: `engine.ts` (element model, text metrics from the PDF standard fonts, QR), `render-svg.tsx` (preview/PNG), `export-pdf.ts` (vector PDF), `kit.ts`/`decor.ts` (shared template parts), `categories/*` (the 129 templates), `money.ts` (invoice arithmetic in integer minor units), `registry.ts`, `project.ts` (IndexedDB projects), `validate.ts` |
| `lib/assistant.ts` | Deterministic parser and responder |
| `components/tools/` | Shared tool UI (dropzone, library picker, sortable list, result panel, viewer) and each tool |
| `lib/pdf/edit.ts`, `redact.ts`, `ocr-layer.ts`, `text-export.ts`, `compare.ts` | Organize/rotate/remove, page numbers, watermarks, crop, forms, metadata, repair, redaction, OCR text layer, text/Markdown export, comparison |
| `lib/ocr.ts` | Tesseract worker setup (self-hosted paths only) |
| `scripts/copy-assets.mjs` | Copies pdf.js (`public/pdfjs`) and Tesseract worker, engines and language models (`public/tesseract`, ~23 MB) from `node_modules`; both are git-ignored |

## Libraries

| Package | Use | License |
| --- | --- | --- |
| `@cantoo/pdf-lib` 2.11 | PDF creation/editing, AES-256 encryption, decryption. Maintained fork of pdf-lib | MIT |
| `pdfjs-dist` 6.4 | Rendering, thumbnails, text layer, text search | Apache-2.0 (bundled wasm decoders: BSD/Apache, see `public/pdfjs/wasm/LICENSE_*`) |
| `fflate` 0.8 | ZIP downloads | MIT |
| `idb` 8 | IndexedDB wrapper | ISC |
| `@dnd-kit/core`, `/sortable`, `/utilities` | Accessible drag-and-drop with touch and keyboard | MIT |
| `tesseract.js` 7, `tesseract.js-core` 7 | On-device OCR (WebAssembly) | Apache-2.0 |
| `@tesseract.js-data/{eng,spa,fra,deu,por,hin}` | OCR language models (`best_int`, 0.7–2.9 MB each) | MIT (models: Apache-2.0, from tesseract-ocr/tessdata) |
| `diff` 9 | Word-level comparison in Compare PDF | BSD-3-Clause |
| `qrcode-generator` 2.0 | On-device QR codes in Create Studio | MIT |
| `vitest`, `fake-indexeddb`, `@playwright/test` (dev) | Tests | MIT / Apache-2.0 |

Fonts (Plus Jakarta Sans; Caveat, Dancing Script and Homemade Apple for typed signatures) are self-hosted by `next/font`, so the browser never contacts Google.

## No paid services

Nothing in this project calls a paid API, AI model, hosted OCR, conversion service or backend. There are no API keys or service environment variables. All processing uses open-source libraries running in the visitor's browser, and every script, worker, font and model is served from this site. `tests/site.test.mjs` fails if an AI/analytics SDK, an API key or a non-trivial `process.env` read is added.

## Privacy and security

- The Content Security Policy (`next.config.ts`) allows only same-origin scripts, workers and connections, so page code can't send data to another origin. `wasm-unsafe-eval` is enabled for pdf.js's JPEG 2000/JBIG2 decoders.
- `Permissions-Policy` allows the camera for this origin only (Scan to PDF); microphone, location, payment and USB stay disabled.
- Uploaded files are validated by signature and size; PDFs are capped at 150 MB / 1,000 pages, images at 40 MB and decoded at most 4,000 px. Object URLs, pdf.js documents and canvases are released when no longer needed.
- Passwords and document content are never logged. Resume data is never put in URLs (only draft and library ids are).

## Limitations (stated in the UI too)

- **Edge detection** is a lightweight local algorithm that looks for a light page on a darker background; otherwise the user crops manually. The Android app's ML Kit scanner is more robust.
- **OCR** accuracy depends on scan quality, handwriting and fonts. The searchable layer uses a standard Latin font, so non-Latin words (e.g. Hindi) appear in the .txt output but are skipped in the PDF layer (the UI says how many). Large documents are slow on phones.
- **Compression** only shrinks 8-bit RGB/grey raster images (JPEG, or Flate without predictors). CMYK, indexed and masked images are left alone; text-only PDFs rarely get smaller.
- **Repair** is best effort: broken cross-reference tables and trailers are fixed by rebuilding; truncated or overwritten content can’t be recovered. The image fallback loses selectable text.
- **Redaction** rasterizes every page that has a redaction (about 180 dpi), so those pages lose selectable text; it only removes what the user marks, and the output is re-read to verify search terms are gone. Unmarked pages are copied unchanged.
- **Crop** changes the CropBox; hidden content remains in the file (the UI points to Redact for removal).
- **Forms**: AcroForm text, checkbox, dropdown, list and radio fields only. XFA forms can’t be filled; signature fields are handled by Sign PDF. Values use a standard Latin font.
- **Compare** relies on text layers (scans need OCR first) and pixel comparison of pages rendered at the same width; moved or reflowed text shows as removed and added. It isn’t a legal-grade comparison.
- **PDF to Markdown** infers headings and lists from font size and bullets; tables, columns, images and links aren't converted.
- **HTML to PDF** uses the browser's print dialog (the user picks “Save as PDF”). Scripts, forms and frames are stripped, and remote images/styles are blocked by the CSP. It can’t capture a live URL.
- **Annotations** and text boxes are flattened into the page; existing PDF text can’t be edited.
- **Signatures** are visible images, not certificate-based digital signatures.
- **Lock PDF** uses AES-256, which very old readers may not open. Certificate/DRM-protected PDFs can't be unlocked.
- **Resume PDF export** uses the PDF standard fonts (Latin text); other characters are replaced and the user is told to use Print → Save as PDF.
- **Create Studio** designs use the PDF standard fonts (Helvetica, Times, Courier), so preview, PNG and PDF match; non-Latin characters are simplified or shown as “?” and the editor warns. ID cards and certificates are design templates, not official or accredited documents. Invoice Maker totals invoices but isn’t accounting or tax software. Business-card PDFs add 1/8 in bleed and set TrimBox/BleedBox, but use RGB and no crop marks, so print shops’ exact requirements should be checked. Photos are downscaled to 2400 px and stored inside the project.
- **Not offered**, because they can't be done reliably in a browser with free tools: Word/Excel/PowerPoint conversion and PDF/A export (the assistant and FAQ explain this).
- **Browser storage** belongs to one browser profile on one device, can be evicted, and doesn't sync with other devices or the Android app.
- Everything runs on the user's device, so very large files are limited by its memory.

## Known dependency advisories

`npm audit` reports 3 moderate advisories, all in `postcss-selector-parser`, which comes in through Tailwind CSS 3's build tooling. It runs only at build time (nothing is shipped to browsers), and the fix requires Tailwind 4, a breaking major upgrade that hasn't been done here. Next.js 16.4.2, React 19.2.9 and the document-processing libraries have no open advisories.

## Updating content

- **Privacy policy:** the app section reproduces the policy published at https://sites.google.com/view/snapscanner/home (last updated October 18, 2026). Update the text and `LAST_UPDATED` in `app/privacy-policy/page.tsx` together. Keep the separate website notice at the top accurate if the site's behaviour changes (for example, if analytics are ever added).
- **Templates:** `lib/resume.ts` lists the app's 20 templates and 9 palettes; `lib/resume/templates.ts` holds the web layout for each. Previews in `public/resume-templates/` are page 1 of each template's real output from the app.
- **Social image:** `public/og-image.png` (1200 × 630).

Keep public file and folder names lowercase without spaces; the production host is case-sensitive. `public/screenshots/` (old app screenshots) is no longer referenced by any page.

## Deployment (Vercel)

1. Push to the GitHub repository connected to Vercel (or import it at https://vercel.com/new).
2. Framework preset: Next.js. Install command `npm install` (its `postinstall` copies the pdf.js assets), build command `npm run build` (its `prebuild` does the same). No environment variables are needed.
3. Use Node.js 22 or later in the project settings.
4. After deploying, check `/app-ads.txt`, `/sitemap.xml`, `/robots.txt`, `/pdfjs/pdf.worker.min.mjs` and `/tesseract/lang/eng.traineddata.gz`, run OCR and a couple of other tools, and resubmit the sitemap in Google Search Console.

Any static host works too, provided it serves the security headers from `next.config.ts` and the redirects. If you add third-party scripts (analytics, Vercel toolbar, etc.), add their origins to the CSP and update the website privacy notice.
