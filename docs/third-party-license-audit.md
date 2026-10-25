# Snap Scanner website — third-party licence and legal-risk audit

Audit date: 25 October 2026. Repository state: working tree on `main` (Next.js 16.4.2).
Prepared from the code, the installed `node_modules`, `package-lock.json` (lockfile v3) and upstream licence files. This is an engineering audit to support legal review; it is **not legal advice and not a statement that the website is compliant**.

## 1. Method

| Step | What was done | Result |
|---|---|---|
| Dependency tree | Walked every production dependency (direct + transitive + optional) from `package.json` through `node_modules`, reading each `package.json` and licence/notice file. | 105 production packages (24 direct, 81 transitive). |
| Independent scan | `license-checker-rseidelsohn@4.4.2 --production` and `--development`. | Same licence categories. The scanner also counts 75 peer/build packages (Tailwind, PostCSS, Playwright…) and the project itself (`UNLICENSED`, private). No conflicts with the manual scan. |
| Lockfile check | `npm ls --omit=dev` | Matches the lockfile except two **extraneous** packages not in it: `@emnapi/wasi-threads`, `@img/sharp-wasm32` (build-machine leftovers). |
| What reaches visitors | Inspected `.next/static` (79 client chunks), `public/` and the copy script (`scripts/copy-assets.mjs`). | **No licence comments survive in any client chunk** (0 of 79). Attribution relies on `/third-party-notices.txt` (generated at build) and the licence files copied next to `/pdfjs`, `/tesseract`, `/word-fonts`. |
| Upstream verification | Fetched upstream licence files for the Tesseract language data (`tesseract-ocr/tessdata_best`, `naptha/tessdata`), `qrcode-generator`, and Google Fonts metadata (`google/fonts`). | See findings F2, F5, F7. |
| Compiled engines | Inspected `tesseract-core-*.wasm` strings and pdf.js `wasm/`, `cmaps/`, `iccs/`, `standard_fonts/` licence files. | See findings F1, F3. |
| Copied code | Searched source for “adapted/derived/copied from”, Stack Overflow and GitHub references. | None found. Provenance of algorithms (e.g. perspective correction, image filters, layout engines) can only be confirmed by the authors — see F10. |
| External services | Searched for network calls, SDKs and APIs (previous privacy audit plus this pass). | No runtime APIs or SDKs. Hosting on Vercel (confirmed by the owner). |

“Verified” below means checked against the actual file or upstream licence. “Declared” means taken from package metadata only.

## 2. Risk summary

| Risk | Count | Items |
|---|---|---|
| **High** | 0 confirmed | One item is High *if* the condition applies: Vercel plan terms (F8). |
| **Medium** | 5 | Liberation fonts under GPLv2 + font exception (F1); Tesseract data licence mismatch (F2); undisclosed notices for libraries compiled into the OCR engine (F3); Google Play logo usage (F9); hosting plan commercial-use terms (F8, until confirmed). |
| **Low** | ~100 packages + most assets | Permissive licences (MIT, ISC, BSD, Apache-2.0, 0BSD, OFL) with attribution obligations already largely met by `/third-party-notices.txt`. |
| **Unverified** | 4 | Origin of the “Snappy” mascot, logo, OG image and app screenshots (F10); Next.js’s internally compiled dependencies (F11). |

No AGPL, SSPL, Commons Clause or other network-copyleft licence was found anywhere in the production or development tree. No dependency requires a paid commercial licence for this use case. Nothing found conflicts with keeping Snap Scanner’s own code proprietary (section 6).

## 3. Findings

### F1 — pdf.js bundles Liberation fonts under GPLv2 with a font exception (Medium, verified)
- **Where:** `node_modules/pdfjs-dist/standard_fonts/LiberationSans-*.ttf`, copied to and served from `public/pdfjs/standard_fonts/`, with `LICENSE_LIBERATION`.
- **Licence (verified from file):** Red Hat Liberation 1.x licence: GNU GPL v2 with (a) a document-embedding exception and (b) an exception about physical products; Red Hat trademark terms on “Liberation”. Not OFL (Liberation 2.x is OFL).
- **Use:** pdf.js uses them to *render* PDFs whose standard fonts aren’t embedded. Snap Scanner’s output never embeds them (PDF tools use pdf-lib standard fonts; Word to PDF uses OFL fonts).
- **Assessment:** Serving the unmodified font files with the licence file is distribution of a separate GPL work alongside other code (“mere aggregation”); it doesn’t make Snap Scanner’s code GPL. GPLv2 still applies to the fonts themselves: the licence must accompany them (it does), and source must be available (the TTF is the distributed form; upstream sources are public). Exception (a) covers documents.
- **Action:** Legal review to confirm the aggregation position; add a “Liberation fonts — GPLv2 with font exception — source: github.com/liberationfonts” entry and written source offer/link to the notices. Optional technical alternative (later, not in this audit): serve Liberation 2.x (OFL) files instead.

### F2 — Tesseract language data: package metadata says MIT, upstream data is Apache-2.0 (Medium, verified)
- **Where:** `@tesseract.js-data/{eng,spa,fra,deu,por,hin}@1.0.0` → copied to `public/tesseract/lang/*.traineddata.gz`.
- **Declared:** MIT, with **no licence file** in the packages.
- **Upstream (verified):** `tesseract-ocr/tessdata_best` and the packaging repo `naptha/tessdata` are both licensed **Apache-2.0**. The `4.0.0_best_int` files are derived from `tessdata_best`.
- **Effect:** `/third-party-notices.txt` currently lists these packages as “Licensed under MIT; no licence file is included”, which is inaccurate.
- **Action:** Record the data as Apache-2.0 (copyright The Tesseract OCR authors / Google) with the Apache licence text, and copy that text into `public/tesseract/lang/`.

### F3 — Libraries compiled into the OCR WebAssembly aren’t credited (Medium, verified by binary inspection)
- **Where:** `tesseract.js-core@7.0.0` (`public/tesseract/core/*.wasm.js`). The package’s only licence file is Apache-2.0 (Tesseract/tesseract.js).
- **Found inside the binary:** Leptonica, libpng, zlib, libjpeg (“Copyright (C) 2014, Thomas G. Lane, Guido Vollbeding” — IJG), libtiff and libwebp code.
- **Obligations (from those projects’ licences):** Leptonica (BSD-2-style: keep copyright notice); libtiff (notice in “all copies of the software and related documentation”); libwebp (BSD-3: reproduce notice in documentation for binaries); libjpeg (IJG: documentation must state that the software is based in part on the work of the Independent JPEG Group); libpng and zlib (no binary-distribution notice required, but customary).
- **Versions:** not recorded in the package; exact versions would come from the tesseract.js-core build scripts. Treat as **partially verified**.
- **Action:** Add these notices (with the IJG acknowledgement) to `/third-party-notices.txt` and `public/tesseract/`.

### F4 — Licence notices exist only in the generated notices file (Low, verified)
- Minified client bundles contain no licence comments. MIT/ISC/BSD/Apache require the copyright and licence text to accompany copies; `/third-party-notices.txt` (linked from the Terms) now does this for npm packages.
- **Gaps:** packages with **no licence file** are listed with a placeholder rather than their licence text: `qrcode-generator`, `brotli`, `dfa`, `hash.js`, `isarray`, `client-only`, the Tesseract data packages (F2), and several server-only binaries. Upstream licence verified for `qrcode-generator` (MIT, © 2009 Kazuhiko Arase) and `hash.js` (MIT, © Fedor Indutny, text in its README).
- **Action:** Extend the notices generator to fall back to licence text in the README or a maintained override file for these packages.

### F5 — Fonts (Low, verified)
| Font | Where | Licence (verified) | Obligation | Status |
|---|---|---|---|---|
| Plus Jakarta Sans | `next/font/google`, self-hosted at build | OFL-1.1 (`google/fonts/ofl/plusjakartasans`) | OFL text with the font files | **Licence text not shipped** — add to notices |
| Caveat, Dancing Script | `next/font/google` (typed signatures) | OFL-1.1 | Same | **Not shipped** — add |
| Homemade Apple | `next/font/google` (typed signatures) | **Apache-2.0** (`google/fonts/apache/homemadeapple`) | Apache licence text | **Not shipped** — add |
| Carlito, Caladea, Arimo, Tinos, Cousine, Noto Sans Devanagari | `public/word-fonts/` (from `@expo-google-fonts/*`) | OFL-1.1 (licence files copied) | OFL text (present). Carlito has the Reserved Font Name “Carlito” — files are unmodified; subsetting when embedding in user PDFs is permitted by OFL | OK |
| Liberation Sans | `public/pdfjs/standard_fonts/` | GPLv2 + font exception | See F1 | Review |
| Foxit PDF fonts (`*.pfb`) | `public/pdfjs/standard_fonts/` | BSD-3-Clause (PDFium authors; verified) | Licence file shipped | OK |
| Create Studio / Resume fonts | PDF standard 14 fonts (Helvetica, Times, Courier) — not embedded; metric data from pdf-lib | Standard PDF fonts aren’t distributed | — | OK |

### F6 — pdf.js support files (Low, verified)
`public/pdfjs/` ships pdf.js’s licence (Apache-2.0) and the licences of everything it bundles: CMaps (Adobe, BSD-3-Clause), ICC profile (CC0-1.0), WebAssembly decoders — OpenJPEG (BSD-2-Clause), JBIG2 (PDFium, BSD-3-Clause), QCMS (MIT). Obligations are met by these files.

### F7 — Trademarks in names and UI (Low)
- “QR Code” is a registered trademark of DENSO WAVE INCORPORATED. The library is MIT (verified). Optional: add “QR Code is a registered trademark of DENSO WAVE INCORPORATED” near the QR generator or in the notices.
- “Word”, “Calibri”, “Cambria”, “Times New Roman”, “Arial”, “Courier New” are used nominatively in tool names and help text, and no Microsoft font files are shipped. Optional trademark acknowledgement.
- Google Play: see F9.

### F8 — Hosting plan terms (Medium until confirmed; High if on Vercel’s Hobby plan)
Vercel’s Hobby plan is limited to non-commercial personal use under Vercel’s terms and fair-use guidelines. The website promotes a monetized app (AdMob) for Fusix Studio, which is likely commercial use. **Not verifiable from the repository.**
**Action:** Confirm the Vercel plan. If it is Hobby, move to a plan that permits commercial use (or confirm in writing with Vercel that the use is permitted).

### F9 — Google Play logo drawn by hand in the “Get it on Google Play” button (Medium, verified in code)
`components/PlayStoreButton.tsx` draws its own version of the Google Play logo inside a custom button. Google’s brand guidelines generally require the official, unmodified “Get it on Google Play” badge. The footer already acknowledges that Google Play is a trademark of Google LLC. This is trademark/brand-policy risk, not copyright licensing.
**Action:** Replace with the official badge artwork per Google Play’s badge guidelines, or confirm the current design is acceptable.

### F10 — First-party image assets with unverified provenance (Unverified)
| Asset | Location | Observed | Needed |
|---|---|---|---|
| “Snappy” mascot | `public/brand/snappy.webp` | 3D-style illustration; no metadata or source in the repo | Confirm who created it and under what terms (designer contract, stock licence, or AI-tool terms) |
| Logo, favicon, OG image | `public/logo.png`, `public/favicon.png`, `public/og-image.png` | Brand assets | Confirm ownership by Fusix Studio |
| Resume template previews | `public/resume-templates/*.webp` (20) | Per the README, renders of the Snap Scanner app’s own templates with fictional sample data and a placeholder avatar | Low risk; confirm the app templates are original |
| App screenshots | `public/screenshots/*.jpg` | Not referenced by any page | Low; could be removed |
| Create Studio / festival artwork | `lib/create/decor.ts`, `lib/create/categories/*` | Generated geometry written in code; comments state no external artwork | Low |
| Icons | `lucide-react` | ISC (portions MIT from Feather; verified licence file) | In notices |

### F11 — Next.js internally compiled dependencies (Unverified, Low)
Next.js ships pre-bundled third-party code under `next/dist/compiled/*`, and some of it ends up in the client runtime. The notices file includes Next.js’s own licence but not each compiled package’s licence. **Action:** Include the licences from `next/dist/compiled/**/LICENSE` for runtime-bundled modules, or reference Next.js’s third-party notices.

### F12 — Copyleft and other licences found (for review, none prohibited outright)
| Package | Licence | Where it runs | Assessment |
|---|---|---|---|
| `@img/sharp-libvips-darwin-arm64` 1.3.4 | LGPL-3.0-or-later | Build/server machine only (`sharp` for `next/image`) | Not delivered to visitors. On Vercel, image optimization runs on Vercel’s service. LGPL obligations arise on distribution of the library. Low. |
| `@img/sharp-wasm32` 0.35.5 (extraneous) | Apache-2.0 AND LGPL-3.0-or-later AND MIT | Not used; not in lockfile | Low; remove with `npm prune` (functional change deferred). |
| `jszip` 3.10.2 | MIT **or** GPL-3.0-or-later | Browser (inside `docx`) | Dual licence: use under MIT. Low. |
| `pako` 1.0.11 | MIT AND Zlib | Browser (via jszip) | Permissive. Low. |
| `caniuse-lite` | CC-BY-4.0 | Build only | Not shipped. Low. |
| Liberation fonts | GPLv2 + exception | Browser (served font files) | F1. Medium. |
| `axe-core`, `lightningcss` | MPL-2.0 | Dev/build only | File-level copyleft; not distributed. Low. |
| `argparse` | Python-2.0 | Dev only (ESLint) | Low. |
| `minimatch` 10 | BlueOak-1.0.0 | Dev only | Permissive. Low. |

## 4. Classification

**Suitable for continued use (permissive, obligations met or easily met):** all 105 production packages, including React, Next.js, pdf.js, pdf-lib (Cantoo fork), fontkit (Cantoo fork), docx, fflate, idb, qrcode-generator, tesseract.js and tesseract.js-core, lucide-react, dnd-kit, Radix, diff, Tailwind utilities, and the OFL fonts. Continued use of these doesn’t depend on resolving the findings, but F1–F5 and F11 should be fixed for complete attribution.

**Requiring attribution or additional notices (beyond what ships today):** Tesseract language data (F2), libraries inside the OCR WebAssembly (F3), packages with no licence file (F4), Google Fonts used via `next/font` (F5), Next.js compiled modules (F11), and optionally trademark acknowledgements (F7).

**Requiring legal review:** Liberation fonts (F1); Google Play badge usage (F9); hosting plan terms (F8); provenance of the mascot and brand images (F10).

**Possibly requiring a commercial licence or paid plan:** no software dependency. **Vercel hosting** may require a paid plan for commercial use (F8).

**Missing licence information:** `@tesseract.js-data/*` (no file; metadata contradicts upstream), `qrcode-generator`, `brotli`, `dfa`, `hash.js`, `isarray`, `client-only`, `tr46`, `@next/env`, `@next/swc-darwin-arm64`, `@napi-rs/canvas-darwin-arm64`, `@img/sharp-libvips-darwin-arm64` (the last five are server/build only).

## 5. Services and integrations

| Service | Use | Terms to note | Risk |
|---|---|---|---|
| Vercel | Hosting and delivery | Plan-specific commercial-use terms (F8) | Medium until confirmed |
| Google Fonts (build time only) | `next/font` downloads fonts during `next build` | Fonts are OFL/Apache (F5); no runtime calls | Low |
| npm registry / GitHub | Installing dependencies | — | Low |
| Google Play | Outbound links and badge | Brand guidelines (F9) | Medium |
| Runtime APIs, SDKs, analytics, AI, OCR or conversion services | **None** | — | — |

## 6. Proprietary code and licence obligations

- No AGPL/SSPL or network-copyleft code is used, so serving the website doesn’t trigger source-disclosure duties for Snap Scanner’s own code.
- The GPL items are separate works: the Liberation font files (served unmodified, F1) and jszip (used under its MIT option). Neither is combined with Snap Scanner code in a way that makes that code GPL, subject to the legal review in F1.
- The LGPL libvips binary runs only on build/server machines and isn’t distributed.
- MPL-2.0 tools are development-only.
- Apache-2.0 components (pdf.js, Tesseract, sharp, swc helpers, class-variance-authority, idb-keyval, wasm-feature-detect, baseline-browser-mapping, detect-libc) have no NOTICE files in the installed packages (checked), so the obligations are the licence text and change notices.
- The project’s own `package.json` is `"private": true` with no `license` field; the scanner reports it as `UNLICENSED`, which is consistent with proprietary code.

## 7. Prioritized remediation plan

1. **Confirm the Vercel plan** (F8). If it is Hobby, upgrade or obtain confirmation before relying on the site commercially.
2. **Fix inaccurate and missing notices** in `/third-party-notices.txt` (generated by `scripts/copy-assets.mjs`):
   - Tesseract language data as Apache-2.0 with upstream text (F2);
   - Leptonica, libtiff, libjpeg (with the IJG acknowledgement), libpng, zlib and libwebp notices for the OCR engine (F3);
   - licence texts for packages that ship none (F4) via an override file;
   - Plus Jakarta Sans, Caveat, Dancing Script (OFL) and Homemade Apple (Apache-2.0) (F5);
   - Liberation fonts entry with a source link (F1);
   - Next.js compiled-module licences (F11).
3. **Legal review of the Liberation font licence** (F1), or plan to switch the served files to Liberation 2.x (OFL).
4. **Replace the hand-drawn Google Play logo with the official badge** or confirm compliance with Google’s guidelines (F9).
5. **Record provenance** for the mascot, logo, OG image and app-derived template previews (F10); keep designer/stock/AI-tool terms on file.
6. **Housekeeping:** run `npm prune` to drop the two extraneous packages; consider adding `"license": "UNLICENSED"` to `package.json` to make the proprietary status explicit; optionally add QR Code and Microsoft trademark acknowledgements (F7).
7. **Keep it current:** re-run the scan (`npx license-checker-rseidelsohn --production --summary`) when dependencies change, and fail the build if a new copyleft or unknown licence appears.

No packages were removed or replaced, and no application behaviour or legal pages were changed as part of this audit.

## Appendix A — Full production dependency inventory (105 packages)

“Browser” = delivered to visitors (bundled JavaScript, worker, WebAssembly or data file). “Server/build only” = never sent to visitors. Licence files are paths inside `node_modules`.

| Package | Version | Direct/Transitive | Licence (declared) | Licence file / official source | Use in Snap Scanner (where it runs) | Notices / obligations | Commercial use | Risk | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| @cantoo/fontkit | 2.0.12 | Direct | MIT | `node_modules/@cantoo/fontkit/LICENSE`; https://github.com/cantoo-scribe/fontkit | Font parsing/subsetting for Word to PDF (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @cantoo/pdf-lib | 2.11.1 | Direct | MIT | `node_modules/@cantoo/pdf-lib/LICENSE.md`; https://github.com/cantoo-scribe/pdf-lib | PDF creation and editing in all PDF tools, Create Studio export, Word to PDF (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @dnd-kit/accessibility | 3.1.1 | Transitive | MIT | `node_modules/@dnd-kit/accessibility/LICENSE`; https://github.com/clauderic/dnd-kit | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @dnd-kit/core | 6.3.1 | Direct | MIT | `node_modules/@dnd-kit/core/LICENSE`; https://github.com/clauderic/dnd-kit | Drag and drop (organize, merge, collage) (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @dnd-kit/sortable | 10.0.0 | Direct | MIT | `node_modules/@dnd-kit/sortable/LICENSE`; https://github.com/clauderic/dnd-kit | Drag and drop (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @dnd-kit/utilities | 3.2.2 | Direct | MIT | `node_modules/@dnd-kit/utilities/LICENSE`; https://github.com/clauderic/dnd-kit | Drag and drop (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @expo-google-fonts/arimo | 0.4.3 | Direct | MIT AND OFL-1.1 | `node_modules/@expo-google-fonts/arimo/LICENSE, LICENSE_FONT`; https://github.com/expo/google-fonts | Supporting dependency (Font files copied to /word-fonts (served)) | Keep OFL text with fonts; no sale of fonts alone; Reserved Font Names on modified fonts | Yes | Low | Continue; keep in notices file |
| @expo-google-fonts/caladea | 0.4.2 | Direct | MIT AND OFL-1.1 | `node_modules/@expo-google-fonts/caladea/LICENSE, LICENSE_FONT`; https://github.com/expo/google-fonts | Supporting dependency (Font files copied to /word-fonts (served)) | Keep OFL text with fonts; no sale of fonts alone; Reserved Font Names on modified fonts | Yes | Low | Continue; keep in notices file |
| @expo-google-fonts/carlito | 0.4.1 | Direct | MIT AND OFL-1.1 | `node_modules/@expo-google-fonts/carlito/LICENSE, LICENSE_FONT`; https://github.com/expo/google-fonts | Supporting dependency (Font files copied to /word-fonts (served)) | Keep OFL text with fonts; no sale of fonts alone; Reserved Font Names on modified fonts | Yes | Low | Continue; keep in notices file |
| @expo-google-fonts/cousine | 0.4.3 | Direct | MIT AND OFL-1.1 | `node_modules/@expo-google-fonts/cousine/LICENSE, LICENSE_FONT`; https://github.com/expo/google-fonts | Supporting dependency (Font files copied to /word-fonts (served)) | Keep OFL text with fonts; no sale of fonts alone; Reserved Font Names on modified fonts | Yes | Low | Continue; keep in notices file |
| @expo-google-fonts/noto-sans-devanagari | 0.4.1 | Direct | MIT AND OFL-1.1 | `node_modules/@expo-google-fonts/noto-sans-devanagari/LICENSE, LICENSE_FONT`; https://github.com/expo/google-fonts | Supporting dependency (Font files copied to /word-fonts (served)) | Keep OFL text with fonts; no sale of fonts alone; Reserved Font Names on modified fonts | Yes | Low | Continue; keep in notices file |
| @expo-google-fonts/tinos | 0.4.2 | Direct | MIT AND OFL-1.1 | `node_modules/@expo-google-fonts/tinos/LICENSE, LICENSE_FONT`; https://github.com/expo/google-fonts | Supporting dependency (Font files copied to /word-fonts (served)) | Keep OFL text with fonts; no sale of fonts alone; Reserved Font Names on modified fonts | Yes | Low | Continue; keep in notices file |
| @img/colour | 1.1.0 | Transitive | MIT | `node_modules/@img/colour/LICENSE.md`; https://github.com/lovell/colour | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @img/sharp-darwin-arm64 | 0.35.5 | Transitive | Apache-2.0 | `node_modules/@img/sharp-darwin-arm64/LICENSE`; https://github.com/lovell/sharp | Supporting dependency (Server/build only) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Low | Continue; keep in notices file |
| @img/sharp-libvips-darwin-arm64 | 1.3.4 | Transitive | LGPL-3.0-or-later | **No licence file in package**; https://github.com/lovell/sharp-libvips | libvips native binary for sharp (local/build machine only) (Server/build only) | LGPL applies on distribution; server-side use only | Yes, with obligations | Low | Server-only; confirm Vercel image optimization path; legal review only if self-hosting distributions |
| @napi-rs/canvas | 1.0.13 | Transitive | MIT | `node_modules/@napi-rs/canvas/LICENSE`; https://github.com/Brooooooklyn/canvas | Optional Node canvas for pdf.js in Node (tests only; not shipped) (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @napi-rs/canvas-darwin-arm64 | 1.0.13 | Transitive | MIT | **No licence file in package**; https://github.com/Brooooooklyn/canvas | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Build/server only; no action |
| @next/env | 16.4.2 | Transitive | MIT | **No licence file in package**; https://github.com/vercel/next.js | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Build/server only; no action |
| @next/swc-darwin-arm64 | 16.4.2 | Transitive | MIT | **No licence file in package**; https://github.com/vercel/next.js | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Build/server only; no action |
| @radix-ui/primitive | 1.1.5 | Transitive | MIT | `node_modules/@radix-ui/primitive/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-accordion | 1.2.16 | Direct | MIT | `node_modules/@radix-ui/react-accordion/LICENSE`; https://github.com/radix-ui/primitives | FAQ accordions (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-collapsible | 1.1.16 | Transitive | MIT | `node_modules/@radix-ui/react-collapsible/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-collection | 1.1.12 | Transitive | MIT | `node_modules/@radix-ui/react-collection/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-compose-refs | 1.1.3 | Transitive | MIT | `node_modules/@radix-ui/react-compose-refs/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-context | 1.2.0 | Transitive | MIT | `node_modules/@radix-ui/react-context/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-direction | 1.1.2 | Transitive | MIT | `node_modules/@radix-ui/react-direction/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-id | 1.1.2 | Transitive | MIT | `node_modules/@radix-ui/react-id/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-presence | 1.1.7 | Transitive | MIT | `node_modules/@radix-ui/react-presence/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-primitive | 2.1.7 | Transitive | MIT | `node_modules/@radix-ui/react-primitive/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-slot | 1.3.0 | Direct | MIT | `node_modules/@radix-ui/react-slot/LICENSE`; https://github.com/radix-ui/primitives | Button composition (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-use-controllable-state | 1.2.3 | Transitive | MIT | `node_modules/@radix-ui/react-use-controllable-state/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-use-effect-event | 0.0.3 | Transitive | MIT | `node_modules/@radix-ui/react-use-effect-event/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @radix-ui/react-use-layout-effect | 1.1.2 | Transitive | MIT | `node_modules/@radix-ui/react-use-layout-effect/LICENSE`; https://github.com/radix-ui/primitives | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| @swc/helpers | 0.5.23 | Transitive | Apache-2.0 | `node_modules/@swc/helpers/LICENSE`; https://github.com/swc-project/swc | Compiled-code helpers in bundles (Browser) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Low | Continue; keep in notices file |
| @tesseract.js-data/deu | 1.0.0 | Direct | MIT (upstream: Apache-2.0) | **No licence file in package**; https://github.com/naptha/tessdata | OCR language model, served from /tesseract/lang (Browser) | Keep copyright + licence text with copies | Yes | Medium | Metadata says MIT but upstream tessdata is Apache-2.0: list as Apache-2.0 with upstream licence text |
| @tesseract.js-data/eng | 1.0.0 | Direct | MIT (upstream: Apache-2.0) | **No licence file in package**; https://github.com/naptha/tessdata | OCR language model, served from /tesseract/lang (Browser) | Keep copyright + licence text with copies | Yes | Medium | Metadata says MIT but upstream tessdata is Apache-2.0: list as Apache-2.0 with upstream licence text |
| @tesseract.js-data/fra | 1.0.0 | Direct | MIT (upstream: Apache-2.0) | **No licence file in package**; https://github.com/naptha/tessdata | OCR language model, served from /tesseract/lang (Browser) | Keep copyright + licence text with copies | Yes | Medium | Metadata says MIT but upstream tessdata is Apache-2.0: list as Apache-2.0 with upstream licence text |
| @tesseract.js-data/hin | 1.0.0 | Direct | MIT (upstream: Apache-2.0) | **No licence file in package**; https://github.com/naptha/tessdata | OCR language model, served from /tesseract/lang (Browser) | Keep copyright + licence text with copies | Yes | Medium | Metadata says MIT but upstream tessdata is Apache-2.0: list as Apache-2.0 with upstream licence text |
| @tesseract.js-data/por | 1.0.0 | Direct | MIT (upstream: Apache-2.0) | **No licence file in package**; https://github.com/naptha/tessdata | OCR language model, served from /tesseract/lang (Browser) | Keep copyright + licence text with copies | Yes | Medium | Metadata says MIT but upstream tessdata is Apache-2.0: list as Apache-2.0 with upstream licence text |
| @tesseract.js-data/spa | 1.0.0 | Direct | MIT (upstream: Apache-2.0) | **No licence file in package**; https://github.com/naptha/tessdata | OCR language model, served from /tesseract/lang (Browser) | Keep copyright + licence text with copies | Yes | Medium | Metadata says MIT but upstream tessdata is Apache-2.0: list as Apache-2.0 with upstream licence text |
| @types/node | 26.6.5 | Transitive | MIT | `node_modules/docx/node_modules/@types/node/LICENSE`; https://github.com/DefinitelyTyped/DefinitelyTyped | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| base64-js | 1.5.1 | Transitive | MIT | `node_modules/base64-js/LICENSE`; https://github.com/beatgammit/base64-js | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| baseline-browser-mapping | 2.11.30 | Transitive | Apache-2.0 | `node_modules/baseline-browser-mapping/LICENSE.txt`; https://github.com/web-platform-dx/baseline-browser-mapping | Supporting dependency (Server/build only) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Low | Continue; keep in notices file |
| bmp-js | 0.1.0 | Transitive | MIT | `node_modules/bmp-js/LICENSE`; https://github.com/shaozilee/bmp-js | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| brotli | 1.3.3 | Transitive | MIT | **No licence file in package**; https://github.com/devongovett/brotli.js | WOFF2 decompression in fontkit (Browser) | Keep copyright + licence text with copies | Yes | Low | Add upstream licence text to notices (package ships none) |
| caniuse-lite | 1.0.30001819 | Transitive | CC-BY-4.0 | `node_modules/caniuse-lite/LICENSE`; browserslist/caniuse-lite | Browser-support data used at build time (Server/build only) | Attribution if the data is redistributed | Yes | Low | Build-time only; no action unless data is shipped |
| class-variance-authority | 0.7.1 | Direct | Apache-2.0 | `node_modules/class-variance-authority/LICENSE`; https://github.com/joe-bell/cva | Component styling variants (Browser) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Low | Continue; keep in notices file |
| client-only | 0.0.1 | Transitive | MIT | **No licence file in package**; https://reactjs.org/ | Next.js marker module (Browser) | Keep copyright + licence text with copies | Yes | Low | Add upstream licence text to notices (package ships none) |
| clsx | 2.1.1 | Direct | MIT | `node_modules/clsx/license`; lukeed/clsx | Class names (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| core-util-is | 1.0.3 | Transitive | MIT | `node_modules/core-util-is/LICENSE`; https://github.com/isaacs/core-util-is | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| culori | 4.0.2 | Transitive | MIT | `node_modules/culori/LICENSE`; git@github.com:Evercoder/culori | Colour parsing in pdf-lib (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| detect-libc | 2.1.2 | Transitive | Apache-2.0 | `node_modules/detect-libc/LICENSE`; https://github.com/lovell/detect-libc | Supporting dependency (Server/build only) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Low | Continue; keep in notices file |
| dfa | 1.2.0 | Transitive | MIT | **No licence file in package**; ssh://git@github.com/devongovett/dfa | Text shaping state machine in fontkit (Browser) | Keep copyright + licence text with copies | Yes | Low | Add upstream licence text to notices (package ships none) |
| diff | 9.0.0 | Direct | BSD-3-Clause | `node_modules/diff/LICENSE`; https://github.com/kpdecker/jsdiff | Word diff in Compare PDF (Browser) | Copyright + licence text in docs for binary/minified copies; no endorsement | Yes | Low | Continue; keep in notices file |
| docx | 9.14.0 | Direct | MIT | `node_modules/docx/LICENSE`; https://github.com/dolanmiu/docx | DOCX generation (PDF to Word) (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| fflate | 0.8.3 | Direct | MIT | `node_modules/fflate/LICENSE`; https://github.com/101arrowz/fflate | ZIP/deflate (DOCX parsing, ZIP downloads) (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| hash.js | 1.1.7 | Transitive | MIT | **No licence file in package**; git@github.com:indutny/hash.js | Hashing in docx (Browser) | Keep copyright + licence text with copies | Yes | Low | Add upstream licence text to notices (package ships none) |
| html-entities | 2.6.0 | Transitive | MIT | `node_modules/html-entities/LICENSE`; https://github.com/mdevils/html-entities | Entity decoding in pdf-lib (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| idb | 8.0.4 | Direct | ISC | `node_modules/idb/LICENSE`; https://github.com/jakearchibald/idb | IndexedDB wrapper (My files, resumes, projects) (Browser) | Keep copyright + licence text | Yes | Low | Continue; keep in notices file |
| idb-keyval | 6.3.0 | Transitive | Apache-2.0 | `node_modules/idb-keyval/LICENCE`; https://github.com/jakearchibald/idb-keyval | tesseract.js model cache (Browser) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Low | Continue; keep in notices file |
| immediate | 3.0.6 | Transitive | MIT | `node_modules/immediate/LICENSE.txt`; https://github.com/calvinmetcalf/immediate | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| inherits | 2.0.4 | Transitive | ISC | `node_modules/inherits/LICENSE`; https://github.com/isaacs/inherits | Supporting dependency (Browser) | Keep copyright + licence text | Yes | Low | Continue; keep in notices file |
| is-url | 1.2.4 | Transitive | MIT | `node_modules/is-url/LICENSE-MIT`; https://github.com/segmentio/is-url | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| isarray | 1.0.0 | Transitive | MIT | **No licence file in package**; https://github.com/juliangruber/isarray | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Add upstream licence text to notices (package ships none) |
| jszip | 3.10.2 | Transitive | (MIT OR GPL-3.0-or-later) | `node_modules/jszip/LICENSE.markdown`; https://github.com/Stuk/jszip | ZIP packaging inside docx (Browser) | Elect MIT; keep MIT text | Yes | Low | Document election of MIT in notices |
| lie | 3.3.0 | Transitive | MIT | `node_modules/lie/license.md`; https://github.com/calvinmetcalf/lie | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| lucide-react | 0.451.0 | Direct | ISC | `node_modules/lucide-react/LICENSE`; https://github.com/lucide-icons/lucide | UI icons (Browser) | Keep copyright + licence text | Yes | Low | Continue; keep in notices file |
| minimalistic-assert | 1.0.1 | Transitive | ISC | `node_modules/minimalistic-assert/LICENSE`; https://github.com/calvinmetcalf/minimalistic-assert | Supporting dependency (Browser) | Keep copyright + licence text | Yes | Low | Continue; keep in notices file |
| nanoid | 6.0.2 | Transitive | MIT | `node_modules/docx/node_modules/nanoid/LICENSE`; ai/nanoid | IDs in docx (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| nanoid | 3.3.20 | Transitive | MIT | `node_modules/nanoid/LICENSE`; ai/nanoid | IDs in docx (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| next | 16.4.2 | Direct | MIT | `node_modules/next/license.md`; vercel/next.js | Framework, routing, client runtime (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| node-fetch | 2.7.0 | Transitive | MIT | `node_modules/node-fetch/LICENSE.md`; https://github.com/bitinn/node-fetch | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| node-html-better-parser | 1.5.9 | Transitive | MIT | `node_modules/node-html-better-parser/LICENSE`; https://github.com/Sharcoux/node-html-parser | HTML parsing in pdf-lib (unused features) (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| opencollective-postinstall | 2.0.3 | Transitive | MIT | `node_modules/opencollective-postinstall/LICENSE`; https://github.com/opencollective/opencollective-postinstall | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| pako | 1.0.11 | Transitive | (MIT AND Zlib) | `node_modules/pako/LICENSE`; nodeca/pako | Deflate used by jszip (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| pdfjs-dist | 6.4.299 | Direct | Apache-2.0 | `node_modules/pdfjs-dist/LICENSE`; https://github.com/mozilla/pdf.js | PDF rendering, text extraction (reader, previews, PDF to Word/Text, OCR input) (Browser) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Medium | Bundled Liberation fonts are GPLv2 + font exception: legal review (see findings) |
| picocolors | 1.1.1 | Transitive | ISC | `node_modules/picocolors/LICENSE`; alexeyraspopov/picocolors | Supporting dependency (Server/build only) | Keep copyright + licence text | Yes | Low | Continue; keep in notices file |
| postcss | 8.5.23 | Transitive | MIT | `node_modules/postcss/LICENSE`; postcss/postcss | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| process-nextick-args | 2.0.1 | Transitive | MIT | `node_modules/process-nextick-args/license.md`; https://github.com/calvinmetcalf/process-nextick-args | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| qrcode-generator | 2.0.4 | Direct | MIT | **No licence file in package**; https://github.com/kazuhikoarase/qrcode-generator | QR codes (QR generator, Create Studio, app QR) (Browser) | Keep copyright + licence text with copies | Yes | Low | Add upstream licence text to notices (package ships none) |
| react | 19.2.9 | Direct | MIT | `node_modules/react/LICENSE`; https://github.com/react/react | UI runtime (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| react-dom | 19.2.9 | Direct | MIT | `node_modules/react-dom/LICENSE`; https://github.com/react/react | UI runtime (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| readable-stream | 2.3.8 | Transitive | MIT | `node_modules/readable-stream/LICENSE`; https://github.com/nodejs/readable-stream | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| regenerator-runtime | 0.13.11 | Transitive | MIT | `node_modules/regenerator-runtime/LICENSE`; https://github.com/facebook/regenerator/tree/main/packages/runtime | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| restructure | 3.0.2 | Transitive | MIT | `node_modules/restructure/LICENSE`; https://github.com/devongovett/restructure | Binary parsing in fontkit (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| safe-buffer | 5.1.2 | Transitive | MIT | `node_modules/safe-buffer/LICENSE`; https://github.com/feross/safe-buffer | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| scheduler | 0.27.0 | Transitive | MIT | `node_modules/scheduler/LICENSE`; https://github.com/facebook/react | React runtime (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| semver | 7.8.5 | Transitive | ISC | `node_modules/semver/LICENSE`; https://github.com/npm/node-semver | Supporting dependency (Server/build only) | Keep copyright + licence text | Yes | Low | Continue; keep in notices file |
| setimmediate | 1.0.5 | Transitive | MIT | `node_modules/setimmediate/LICENSE.txt`; YuzuJS/setImmediate | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| sharp | 0.35.5 | Transitive | Apache-2.0 | `node_modules/sharp/LICENSE`; https://github.com/lovell/sharp | Server image optimization for next/image (not shipped to browsers) (Server/build only) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Low | Continue; keep in notices file |
| source-map-js | 1.2.2 | Transitive | BSD-3-Clause | `node_modules/source-map-js/LICENSE`; 7rulnik/source-map-js | Supporting dependency (Server/build only) | Copyright + licence text in docs for binary/minified copies; no endorsement | Yes | Low | Continue; keep in notices file |
| string_decoder | 1.1.1 | Transitive | MIT | `node_modules/string_decoder/LICENSE`; https://github.com/nodejs/string_decoder | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| styled-jsx | 5.1.6 | Transitive | MIT | `node_modules/styled-jsx/license.md`; vercel/styled-jsx | Next.js runtime (CSS-in-JS) (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| tailwind-merge | 2.6.1 | Direct | MIT | `node_modules/tailwind-merge/LICENSE.md`; https://github.com/dcastil/tailwind-merge | Class names (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| tailwindcss-animate | 1.0.7 | Direct | MIT | `node_modules/tailwindcss-animate/LICENSE`; — | Tailwind plugin (build) (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| tesseract.js | 7.0.0 | Direct | Apache-2.0 | `node_modules/tesseract.js/LICENSE.md`; https://github.com/naptha/tesseract.js | On-device OCR (worker) (Browser) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Low | Continue; keep in notices file |
| tesseract.js-core | 7.0.0 | Direct | Apache-2.0 | `node_modules/tesseract.js-core/LICENSE`; https://github.com/naptha/tesseract.js-core | OCR engine compiled to WebAssembly (Tesseract, Leptonica, image codecs) (Browser) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Medium | Add Leptonica, libtiff, libjpeg (IJG), libpng, zlib, libwebp notices |
| tr46 | 0.0.3 | Transitive | MIT | **No licence file in package**; https://github.com/Sebmaster/tr46.js | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Build/server only; no action |
| tslib | 2.8.1 | Transitive | 0BSD | `node_modules/tslib/LICENSE.txt`; https://github.com/Microsoft/tslib | Supporting dependency (Browser) | None | Yes | Low | Continue; keep in notices file |
| undici-types | 8.9.0 | Transitive | MIT | `node_modules/docx/node_modules/undici-types/LICENSE`; https://github.com/nodejs/undici | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| util-deprecate | 1.0.2 | Transitive | MIT | `node_modules/util-deprecate/LICENSE`; https://github.com/TooTallNate/util-deprecate | Supporting dependency (Browser) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| wasm-feature-detect | 1.9.0 | Transitive | Apache-2.0 | `node_modules/wasm-feature-detect/LICENSE`; GoogleChromeLabs/wasm-feature-detect | OCR engine selection (Browser) | Licence text; keep NOTICE (none found); state changes if modified | Yes | Low | Continue; keep in notices file |
| webidl-conversions | 3.0.1 | Transitive | BSD-2-Clause | `node_modules/webidl-conversions/LICENSE.md`; jsdom/webidl-conversions | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| whatwg-url | 5.0.0 | Transitive | MIT | `node_modules/whatwg-url/LICENSE.txt`; jsdom/whatwg-url | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |
| zlibjs | 0.3.1 | Transitive | MIT | `node_modules/zlibjs/LICENSE`; https://github.com/imaya/zlib.js | Supporting dependency (Server/build only) | Keep copyright + licence text with copies | Yes | Low | Continue; keep in notices file |

## Appendix B — Development dependencies (not shipped to visitors)

`license-checker-rseidelsohn --development --summary`: MIT 270, Apache-2.0 19, ISC 10, BSD-2-Clause 7, MPL-2.0 3 (`axe-core`, `lightningcss`, `lightningcss-darwin-arm64`), BSD-3-Clause 1, Apache-2.0 AND LGPL-3.0-or-later AND MIT 1 (`@img/sharp-wasm32`, extraneous), Python-2.0 1 (`argparse`), CC0-1.0 1 (`language-subtag-registry`), BlueOak-1.0.0 1 (`minimatch`), UNLICENSED 1 (this project). Used for building, linting and testing only; no distribution obligations to visitors.
