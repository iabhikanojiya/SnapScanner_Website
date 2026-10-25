// Licence notices that npm package metadata doesn't provide, used by
// scripts/copy-assets.mjs to build public/third-party-notices.txt. Every entry
// was checked against the installed files or the upstream source named in it
// (see docs/third-party-license-audit.md, 25 October 2026). Texts fetched from
// upstream are stored next to this file; others are read from node_modules.
// When a dependency is upgraded, re-check the entries that name its version.

/**
 * Corrections for packages whose own files are missing or inaccurate.
 * Keys are package names; a trailing "*" matches a name prefix.
 * `files` are read in order; `note` explains the source of the text.
 */
export const PACKAGE_OVERRIDES = {
  '@tesseract.js-data/*': {
    license: 'Apache-2.0',
    note: 'OCR language model (4.0.0_best_int). The npm package declares MIT and ships no licence file, but the data comes from tesseract-ocr/tessdata_best, which is licensed under the Apache License 2.0 (as is the packaging repository naptha/tessdata). The upstream repository publishes the licence terms without a copyright line. Source: https://github.com/tesseract-ocr/tessdata_best',
    files: ['scripts/notices/packages/tessdata_best-LICENSE.txt'],
  },
  'qrcode-generator': {
    license: 'MIT',
    note: 'Header of the installed dist/qrcode.js:\n  QR Code Generator for JavaScript\n  Copyright (c) 2009 Kazuhiko Arase\n  URL: http://www.d-project.com/\n  Licensed under the MIT license\n  The word \'QR Code\' is registered trademark of DENSO WAVE INCORPORATED\n  http://www.denso-wave.com/qrcode/faqpatent-e.html\nThe package ships no licence file; the text below is the upstream LICENSE (https://github.com/kazuhikoarase/qrcode-generator).',
    files: ['scripts/notices/packages/qrcode-generator-LICENSE.txt'],
  },
  'hash.js': {
    license: 'MIT',
    note: 'Licence text from the installed package README (the package has no separate licence file).',
    readme: true,
  },
  isarray: {
    license: 'MIT',
    note: 'Licence text from the installed package README (the package has no separate licence file).',
    readme: true,
  },
  '@next/env': {
    license: 'MIT',
    note: 'Part of the Next.js repository (packages/next-env). The package ships no licence file; the text below is the Next.js licence at tag v16.4.2, identical to node_modules/next/license.md.',
    files: ['node_modules/next/license.md'],
  },
  tr46: {
    license: 'MIT',
    note: 'Server-side only (used by node-fetch); not delivered to browsers. Version 0.0.3 ships no licence file; the text below is the current upstream LICENSE.md (https://github.com/jsdom/tr46), whose copyright holder matches the package author. A licence file for version 0.0.3 itself could not be found.',
    files: ['scripts/notices/packages/tr46-LICENSE.md'],
  },
  brotli: {
    license: 'MIT',
    unresolved: true,
    note: 'UNRESOLVED COPYRIGHT NOTICE. The package.json and README of brotli 1.3.3 state “License: MIT” (author: Devon Govett), but neither the package nor the upstream repository (https://github.com/devongovett/brotli.js) publishes a licence text or copyright line.',
  },
  dfa: {
    license: 'MIT',
    unresolved: true,
    note: 'UNRESOLVED COPYRIGHT NOTICE. The package.json and README of dfa 1.2.0 state “License: MIT” (author: Devon Govett), but neither the package nor the upstream repository (https://github.com/devongovett/dfa) publishes a licence text or copyright line.',
  },
  'client-only': {
    license: 'MIT',
    unresolved: true,
    note: 'UNRESOLVED COPYRIGHT NOTICE. client-only 0.0.1 is an empty marker module used by Next.js. Its package.json declares MIT but names no repository, author or copyright holder, and no licence text is published.',
  },
}

/** Software and assets that ship to visitors but aren't separate npm packages. */
export const EXTRA_SECTIONS = [
  {
    group: 'OCR engine components compiled into tesseract.js-core 7.0.0 (/tesseract/core)',
    intro:
      'tesseract.js-core 7.0.0 is a WebAssembly build of the libraries below. Versions and commits are those pinned by the tesseract.js-core v7.0.0 build (https://github.com/naptha/tesseract.js-core/tree/v7.0.0/third_party).\n\nThis software is based in part on the work of the Independent JPEG Group.',
    items: [
      { name: 'Tesseract OCR 5.3.0 (Balearica fork, commit 2a9c1c4)', license: 'Apache-2.0', source: 'https://github.com/Balearica/tesseract', files: ['scripts/notices/ocr/tesseract-5.3.0-LICENSE.txt'] },
      { name: 'Leptonica 1.83.0 (commit 4af068b)', license: 'BSD-2-Clause (Leptonica licence)', source: 'https://github.com/DanBloomberg/leptonica', files: ['scripts/notices/ocr/leptonica-1.83.0.txt'] },
      {
        name: 'libjpeg 9a, Independent JPEG Group (commit 6c0fcb8 of the LuaDist mirror)',
        license: 'IJG License',
        source: 'https://github.com/LuaDist/libjpeg (IJG: https://www.ijg.org)',
        note: 'Only executable code is distributed here, so, as condition (2) below requires: this software is based in part on the work of the Independent JPEG Group. The text below is the LEGAL ISSUES section of the libjpeg 9a README.',
        files: ['scripts/notices/ocr/libjpeg-9a.txt'],
      },
      { name: 'libpng 1.6.38 (commit a37d483)', license: 'PNG Reference Library License version 2', source: 'https://github.com/glennrp/libpng', files: ['scripts/notices/ocr/libpng-1.6.38.txt'] },
      { name: 'zlib 1.2.12 (commit 21767c6)', license: 'Zlib', source: 'https://github.com/madler/zlib', note: 'Licence text from the header of zlib.h at that commit.', files: ['scripts/notices/ocr/zlib-1.2.12.txt'] },
      { name: 'libtiff 4.3.0 (commit b51bb15)', license: 'libtiff licence', source: 'https://gitlab.com/libtiff/libtiff', note: 'Text of the COPYRIGHT file at that commit.', files: ['scripts/notices/ocr/libtiff-4.3.0.txt'] },
      { name: 'libwebp 1.2.2 (commit 20ef03e)', license: 'BSD-3-Clause, with additional patent grant', source: 'https://github.com/webmproject/libwebp', files: ['scripts/notices/ocr/libwebp-1.2.2-COPYING.txt', 'scripts/notices/ocr/libwebp-1.2.2-PATENTS.txt'] },
      { name: 'GIFLIB 5.1.4 (commit fa37672 of the mirrorer mirror)', license: 'MIT-style (GIFLIB licence)', source: 'https://github.com/mirrorer/giflib (upstream: https://sourceforge.net/projects/giflib/)', files: ['scripts/notices/ocr/giflib-5.1.4.txt'] },
      {
        name: 'OpenLibm (commit ae2d916)',
        license: 'MIT, BSD, ISC and public-domain parts (see text)',
        source: 'https://github.com/JuliaMath/openlibm',
        note: 'Built by the tesseract.js-core v7.0.0 build script; whether it is linked into the final WebAssembly could not be confirmed, so its notice is included as a precaution.',
        files: ['scripts/notices/ocr/openlibm.txt'],
      },
    ],
  },
  {
    group: 'Fonts self-hosted through next/font (downloaded from Google Fonts at build time)',
    intro: 'Copyright lines match the copyright field embedded in the font files the build serves. Licence texts are from https://github.com/google/fonts (retrieved 25 October 2026).',
    items: [
      { name: 'Plus Jakarta Sans (site typeface)', license: 'OFL-1.1', source: 'https://github.com/tokotype/PlusJakartaSans', files: ['scripts/notices/fonts/plus-jakarta-sans-OFL.txt'] },
      { name: 'Caveat (typed signatures)', license: 'OFL-1.1', source: 'https://github.com/googlefonts/caveat', files: ['scripts/notices/fonts/caveat-OFL.txt'] },
      { name: 'Dancing Script (typed signatures)', license: 'OFL-1.1', source: 'https://github.com/googlefonts/DancingScript', files: ['scripts/notices/fonts/dancing-script-OFL.txt'] },
      {
        name: 'Homemade Apple (typed signatures)',
        license: 'Apache-2.0',
        source: 'https://github.com/google/fonts/tree/main/apache/homemadeapple',
        note: 'Copyright (c) 2010 by Font Diner, Inc. All rights reserved. (from the font file). Licensed under the Apache License 2.0:',
        files: ['scripts/notices/fonts/homemade-apple-Apache-2.0.txt'],
      },
    ],
  },
  {
    group: 'Files bundled with pdf.js 6.4.299 (/pdfjs)',
    intro: 'These licence files are also served next to the files they cover in /pdfjs.',
    items: [
      { name: 'Adobe CMaps (/pdfjs/cmaps)', license: 'BSD-3-Clause', files: ['node_modules/pdfjs-dist/cmaps/LICENSE'] },
      { name: 'ICC profile (/pdfjs/iccs)', license: 'CC0-1.0', files: ['node_modules/pdfjs-dist/iccs/LICENSE'] },
      { name: 'OpenJPEG decoder (/pdfjs/wasm)', license: 'BSD-2-Clause', files: ['node_modules/pdfjs-dist/wasm/LICENSE_OPENJPEG', 'node_modules/pdfjs-dist/wasm/LICENSE_PDFJS_OPENJPEG'] },
      { name: 'JBIG2 decoder from PDFium (/pdfjs/wasm)', license: 'BSD-3-Clause', files: ['node_modules/pdfjs-dist/wasm/LICENSE_JBIG2', 'node_modules/pdfjs-dist/wasm/LICENSE_PDFJS_JBIG2'] },
      { name: 'QCMS colour management (/pdfjs/wasm)', license: 'MIT', files: ['node_modules/pdfjs-dist/wasm/LICENSE_PDFJS_QCMS'] },
      { name: 'Foxit fonts (/pdfjs/standard_fonts/*.pfb)', license: 'BSD-3-Clause', files: ['node_modules/pdfjs-dist/standard_fonts/LICENSE_FOXIT'] },
      {
        name: 'Liberation Sans fonts (/pdfjs/standard_fonts/LiberationSans-*.ttf)',
        license: 'GNU GPL v2 with font exceptions (Liberation 1.x licence)',
        source: 'https://github.com/liberationfonts/liberation-fonts',
        note: 'Distributed unmodified with pdf.js, which uses them only to display PDFs. Source for the Liberation fonts is available from the Liberation Fonts project at the address above.',
        files: ['node_modules/pdfjs-dist/standard_fonts/LICENSE_LIBERATION'],
      },
    ],
  },
  {
    group: 'Modules bundled inside Next.js 16.4.2 that reach the browser',
    intro:
      'Next.js ships its own pre-built copies of these modules; they were identified in the site’s client bundles. The React packages are Next.js’s vendored build (19.3.0-canary-278794d7-20261002), not the react 19.2.9 package listed separately.',
    items: [
      { name: 'React (vendored by Next.js)', license: 'MIT', files: ['node_modules/next/dist/compiled/react/LICENSE'] },
      { name: 'React DOM (vendored by Next.js)', license: 'MIT', files: ['node_modules/next/dist/compiled/react-dom/LICENSE'] },
      { name: 'Scheduler (vendored by Next.js)', license: 'MIT', files: ['node_modules/next/dist/compiled/scheduler/LICENSE'] },
      { name: 'React Server DOM for Turbopack (vendored by Next.js)', license: 'MIT', files: ['node_modules/next/dist/compiled/react-server-dom-turbopack/LICENSE'] },
      { name: 'buffer (vendored by Next.js)', license: 'MIT', files: ['node_modules/next/dist/compiled/buffer/LICENSE'] },
      {
        name: 'ieee754 (inside the vendored buffer module)',
        license: 'BSD-3-Clause',
        source: 'https://github.com/feross/ieee754',
        note: 'The vendored buffer module carries the header “ieee754. BSD-3-Clause License. Feross Aboukhadijeh”. Its exact version isn’t recorded; the text below is the upstream LICENSE at tag v1.2.1.',
        files: ['scripts/notices/next/ieee754.txt'],
      },
      { name: 'process (vendored by Next.js)', license: 'MIT', files: ['node_modules/next/dist/compiled/process/LICENSE'] },
      {
        name: 'core-js 3.38.1 (in Next.js’s polyfill for older browsers)',
        license: 'MIT',
        source: 'https://github.com/zloirock/core-js',
        note: 'Version from @next/polyfill-nomodule 16.4.2 and the core-js metadata inside the polyfill bundle.',
        files: ['scripts/notices/next/core-js-3.38.1.txt'],
      },
      { name: 'whatwg-fetch 3.0.0 (in the same polyfill)', license: 'MIT', source: 'https://github.com/github/fetch', files: ['scripts/notices/next/whatwg-fetch-3.0.0.txt'] },
      { name: 'object-assign 4.1.1 (in the same polyfill)', license: 'MIT', source: 'https://github.com/sindresorhus/object-assign', files: ['scripts/notices/next/object-assign-4.1.1.txt'] },
    ],
  },
]

/** Copied next to the OCR language models in public/tesseract/lang. */
export const TESSDATA_LICENSE = 'scripts/notices/packages/tessdata_best-LICENSE.txt'
