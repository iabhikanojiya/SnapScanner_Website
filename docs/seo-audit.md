# Snap Scanner website — SEO, indexing and AI search audit

Audit date: 25 October 2026. Repository state: working tree on `main` (Next.js 16.4.2, every route statically prerendered).
Everything below was checked against the code, the production build (`.next/server/app`) and live DNS/HTTP responses on that date. Nothing here is a ranking prediction. Keyword phrases are **hypotheses** to validate in Google Search Console; no search-volume or competitor data was available or used.

## 0. Production URL

| Check (25 Oct 2026) | Result |
|---|---|
| `SITE_URL` in `lib/site.ts`, README, tests | `https://snapscanner.vercel.app` |
| `https://snapscanner.vercel.app/` | `200`, served by Vercel |
| Canonical host | The `vercel.app` production alias; no custom domain is configured or assumed |
| `https://snapscanner.app/` | A parked domain, not this site; it is not referenced by the site |

The canonical host is the Vercel production alias, `https://snapscanner.vercel.app`. Every absolute URL in the build (canonical, `og:url`, sitemap, the robots.txt `Sitemap:` line, JSON-LD, sample QR codes and PDF Producer metadata) derives from `SITE_DOMAIN`/`SITE_URL` in `lib/site.ts`. No DNS changes are needed while the site uses the alias.

The deployment currently serving that URL predates this correction, so its robots.txt still points at `https://snapscanner.app`; deploying this change replaces every such reference. A custom domain is optional and not assumed. If the owner adds one later, use Vercel → Project → Domains, point DNS as Vercel instructs, update `SITE_DOMAIN` in `lib/site.ts` and `SITE` in `tests/site.test.mjs`, redeploy, then re-run section 9. Do not point `snapscanner.app` at this project unless it is intended to become the primary domain.

Preview deployments: canonicals always use `https://snapscanner.vercel.app/...`, so a preview can't present itself as canonical. Vercel also sends `X-Robots-Tag: noindex` on non-production deployment URLs by default; confirm this under Project → Settings → Deployment Protection / headers once deployed. Share the production alias, not preview URLs.

## 1. Route inventory and indexability

65 pages are built, all static (`○`): 57 indexable pages and 8 noindexed editors.

| Route group | Count | Indexable | In sitemap | Notes |
|---|---|---|---|---|
| `/` | 1 | yes | yes | |
| `/tools` | 1 | yes | yes | Hub; links every tool |
| `/tools/<id>` | 41 | yes | yes | Generated from `lib/tools.ts` |
| `/resume-builder`, `/create`, `/create/<maker>` | 9 | yes | yes | |
| `/files`, `/assistant` | 2 | yes | yes | App pages with explanatory copy; low search value, kept |
| `/support`, `/privacy-policy`, `/terms` | 3 | yes | yes | Support doubles as contact page |
| `/resume-builder/edit`, `/create/<maker>/edit` | 8 | **no** (`noindex, nofollow`, robots.txt `Disallow`) | no | Show only browser-local drafts; canonical points to the landing page |
| `/app-ads.txt` | 1 | n/a | no | AdMob file |
| 404 | — | `noindex` (Next.js default) | no | Links home and to `/tools` |
| Redirects | 2 | — | — | `/features` → `/tools`, `/pdf-scanner` → `/tools/scan-pdf` (308) |

No orphan pages: the home page directory, the header menu, `/tools` and the footer link every indexable route. `tests/site.test.mjs` verifies every internal link and anchor resolves.

There's no separate About page; `/support` carries contact details and the developer name. Not adding a thin About page was deliberate.

## 2. Findings

### Fixed in this pass

| # | Issue | Impact | Fix |
|---|---|---|---|
| 1 | **FAQ answers weren't in the HTML.** Radix Accordion unmounts closed panels, so the server HTML contained questions only. The home page also emitted `FAQPage` JSON-LD whose answers weren't on the page. | Crawlers and AI systems that read HTML saw no answers; structured data didn't match visible content. | `components/ui/accordion.tsx`: panels are always rendered and hidden with CSS when closed. Test added. |
| 2 | Tool pages had no tool-specific FAQ, formats or use cases. 41 pages shared one template with 2–4 notes each. | Thin for informational and comparison queries (“can I…”, “does it…”); little for AI answers to quote. | New `lib/tool-content.ts`: input/output formats with verified limits, 2–3 real uses and 2–3 unique FAQs per tool, rendered by `ToolPage`. |
| 3 | No `BreadcrumbList` structured data; visible breadcrumbs started at “All tools”/“Create”. | Missed breadcrumb display in results; weaker hierarchy signal. | Home › All tools › Tool (and Home › Create › Maker), visible and as JSON-LD. |
| 4 | Create, resume and tool FAQs had no `FAQPage` data (only the home page did). | Inconsistent. Note: Google currently shows FAQ rich results only for well-known government and health sites, so this is for machine readability, not a rich-result expectation. | `faqJsonLd()` helper in `lib/metadata.ts`, used wherever a FAQ is shown. |
| 5 | robots.txt had a single `*` group and a `Host:` line. | `Host` is Yandex-only and ignored by Google and Bing. AI crawler policy was implicit. | `app/robots.ts`: explicit groups for search crawlers (Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot, Applebot) and for training controls (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended), with one switch, `ALLOW_MODEL_TRAINING`. `Host` removed. Test added. |
| 6 | `/create` title was 102 characters. | Truncated in results. | “Create Studio – Free Resume, Invoice & Card Makers”. |
| 7 | `/tools` H1 “All tools”; no list markup. | Vague heading for the main hub. | H1 “All PDF, image and document tools”, `CollectionPage` + `ItemList` + `BreadcrumbList`. |
| 8 | Related-tool cards showed only names. | Weak anchor context. | Cards show each tool’s one-line description; “Browse all Snap Scanner tools” link added. |
| 9 | Sitemap `lastmod` for tool pages predated today’s content change. | | `TOOLS_UPDATED = '2026-10-25'` in `app/sitemap.ts`. |

### Already correct (verified, unchanged)

- Unique `<title>`, description, canonical, Open Graph and Twitter tags on every indexable page, via `pageMetadata()`; enforced by `tests/site.test.mjs`.
- `metadataBase`, absolute canonicals, `index, follow` and `max-image-preview:large`.
- Sitemap generated from the tool registry, excludes editors, referenced from robots.txt.
- All primary content (headings, taglines, steps, notes) is server-rendered; tools load their heavy libraries (pdf.js, pdf-lib, Tesseract, docx) only on the pages that use them.
- One `<h1>` per page, first heading; skip link; `lang="en"`.
- Structured data has no invented ratings, review counts or download numbers (a test forbids `aggregateRating`, `review`, `downloadCount`). The Google Play reviews on the home page are verbatim, dated, attributed to the Android app and not marked up.
- No third-party scripts, analytics or trackers (CSP `connect-src 'self'`).
- Accurate limitation copy on every tool (and a test bans absolute privacy/security claims).

### Not changed, with reasons

- **One shared Open Graph image** for every page. Per-page images (Next `opengraph-image`) would help social click-through but add build work; the test suite currently pins `og:image` to `/og-image.png`. Worth doing later for the top 10 tools.
- **JPG/PNG/WebP to PDF** are filtered variants of Images to PDF. They match distinct searches, accept different files and now have their own FAQs, so they stay indexable and self-canonical.
- **No `llms.txt`**, no blog, no keyword-variant pages. None is needed for crawling, and auto-generated articles would be thin.
- **`priority`/`changefreq`** in the sitemap are ignored by Google; harmless, left in place.

## 3. Search and AI crawler access

Policies verified against official documentation on 25 Oct 2026:

| Token | Operator | Purpose | robots.txt honoured | Site policy |
|---|---|---|---|---|
| Googlebot | Google | Search (incl. AI Overviews) | yes | allowed |
| Google-Extended | Google | Control token for Gemini training/grounding; **no effect on Search** | yes | allowed (switch) |
| Bingbot | Microsoft | Bing search, which also grounds Copilot | yes | allowed |
| OAI-SearchBot | OpenAI | ChatGPT search results | yes (≈24 h to apply) | allowed |
| GPTBot | OpenAI | Model training | yes | allowed (switch) |
| ChatGPT-User | OpenAI | Fetch on a user’s request | not reliably | not listed (falls under `*`) |
| Claude-SearchBot | Anthropic | Claude search indexing | yes | allowed |
| ClaudeBot | Anthropic | Model training | yes | allowed (switch) |
| Claude-User | Anthropic | Fetch on a user’s request | yes | not listed (falls under `*`) |
| PerplexityBot | Perplexity | Perplexity search | yes | allowed |
| Applebot / Applebot-Extended | Apple | Spotlight/Siri/Safari search / training opt-out token | yes | allowed / allowed (switch) |

Sources: developers.openai.com/api/docs/bots, support.claude.com (article 8896518), developers.google.com/search/docs/crawling-indexing/google-common-crawlers, docs.perplexity.ai/guides/bots, support.apple.com/en-us/119829.

**Training is a business decision for the owner.** Today it's allowed (as before). Setting `ALLOW_MODEL_TRAINING = false` in `app/robots.ts` blocks GPTBot, ClaudeBot, Google-Extended and Applebot-Extended without affecting Google, Bing, ChatGPT search or Claude search.

Hosting level: application code can't see Vercel Firewall or Attack Challenge Mode settings. If either is enabled, check that verified bots aren't challenged (Vercel → Firewall). Nothing in `next.config.ts` blocks bots; the CSP and security headers don't affect crawling.

## 4. Structured data (validated in the build)

`tests/site.test.mjs` parses every JSON-LD block as JSON and checks the facts below.

| Page | Types |
|---|---|
| All pages | `Organization` (Fusix Studio, logo, support email), `WebSite` |
| Home | `MobileApplication` (Android, Play install URL, free), `WebApplication`, `FAQPage` |
| `/tools` | `CollectionPage` with `ItemList`, `BreadcrumbList` |
| `/tools/<id>` | `WebApplication` (free, browser), `BreadcrumbList`, `FAQPage` |
| `/create/<maker>` | `WebApplication`, `BreadcrumbList`, `FAQPage` |
| `/create` | `CollectionPage` |
| `/resume-builder` | `WebApplication`, `FAQPage` |

Every `FAQPage` question and answer is checked to appear in the visible HTML. Before production, run the home page, one tool page and one Create page through Google’s Rich Results Test and validator.schema.org (both need a public URL).

## 5. Performance

Not measured in this pass: production is reachable at `https://snapscanner.vercel.app`, but no field data (CrUX) or Lighthouse runs were collected. Reported scores would be invented. What the code shows:

- Every page is static HTML; fonts are self-hosted with `display: swap` (`next/font`).
- PDF/OCR/DOCX libraries load only inside the tools that use them; OCR models (0.7–2.9 MB) download only when OCR starts.
- No third-party scripts.
- The home page is long and hydrates interactive demos (resume showcase, assistant, tool search). Measure its INP and LCP on a mid-range phone after launch; it is the most likely page to need work.

After launch: PageSpeed Insights for `/`, `/tools/merge-pdf`, `/tools/compress-pdf`, `/tools/pdf-to-word`, `/resume-builder`, then Search Console → Core Web Vitals once enough traffic exists.

## 6. Analytics and measurement

There is no Google Analytics, Search Console verification tag or other tracker in the code, and `tests/site.test.mjs` intentionally fails if an analytics SDK is added. The privacy policy describes the site as having no analytics. So:

- **Search Console and Bing Webmaster Tools**: a Domain property needs DNS control of `vercel.app`, which the owner doesn't have. Use a **URL-prefix property** for `https://snapscanner.vercel.app` and verify with an HTML meta tag in `app/layout.tsx` or a verification file in `public/`. That adds a verification token but no tracker. If a custom domain is configured later, a Domain property verified by DNS TXT becomes possible.
- **Search performance** (impressions, clicks, CTR, average position, landing pages, queries) comes from Search Console and Bing without any tracker.
- **Google Play clicks and installs**: add a campaign `referrer` to the Play URL in `lib/site.ts` only if the owner wants it (for example `&referrer=utm_source%3Dwebsite`) and read it in Play Console → Store analysis. That's a product decision because the URL is pinned by tests.
- **Tool usage and AI referrals** (chatgpt.com, claude.ai, perplexity.ai referrers) can't be measured without adding analytics, which would contradict the privacy policy. If wanted, choose a cookieless, self-hosted option, update the privacy policy first, and loosen the test deliberately. Not every AI product sends a referrer, so AI traffic would be undercounted either way.

## 7. Keyword-to-page map (hypotheses)

Primary phrases are the most direct description of each tool’s job. Validate with Search Console queries after 4–6 weeks; don't create pages for phrases that have no working tool.

| Page | Primary intent | Secondary phrases | Main internal links |
|---|---|---|---|
| `/` | snap scanner (brand) | snap scanner app, snap scanner pdf, free online pdf tools | /tools, top tools, Play listing |
| `/tools` | free pdf tools online | pdf and image tools, online pdf editor tools | every tool |
| merge-pdf | merge pdf | combine pdf files, join pdf | split, compress, organize |
| split-pdf | split pdf | separate pdf pages, split pdf by page range | extract, remove pages, merge |
| remove-pages | delete pages from pdf | remove pdf pages | extract, organize |
| extract-pages | extract pages from pdf | save one page of pdf | split, remove pages |
| organize-pdf | rearrange pdf pages | reorder pdf pages, duplicate pdf page | rotate, remove |
| rotate-pdf | rotate pdf | rotate pdf pages and save | organize |
| compress-pdf | compress pdf | reduce pdf size, make pdf smaller for email | merge, lock, image to pdf |
| repair-pdf | repair pdf | fix corrupted pdf, recover damaged pdf | compress, reader |
| ocr-pdf | ocr pdf | make scanned pdf searchable, extract text from scanned pdf | pdf to text, scan |
| scan-pdf | scan to pdf online | document scanner online, scan documents with phone camera | image to pdf, OCR, app |
| image-to-pdf | image to pdf | photos to pdf, combine images into pdf | jpg/png/webp to pdf, scan |
| jpg-to-pdf | jpg to pdf | jpeg to pdf | image to pdf, compress |
| png-to-pdf | png to pdf | screenshot to pdf | image to pdf |
| webp-to-pdf | webp to pdf | | image to pdf, convert image |
| html-to-pdf | html to pdf | convert html file to pdf | image to pdf |
| word-to-pdf | word to pdf | docx to pdf, convert word document to pdf | pdf to word, merge |
| pdf-to-word | pdf to word | pdf to docx, convert pdf to editable word | word to pdf, OCR, edit |
| pdf-to-jpg | pdf to jpg | pdf to image, save pdf page as jpg | pdf to png |
| pdf-to-png | pdf to png | | pdf to jpg |
| pdf-to-text | pdf to text | extract text from pdf, pdf to txt | OCR, markdown |
| pdf-to-markdown | pdf to markdown | pdf to md | pdf to text |
| pdf-reader | pdf reader online | open pdf in browser, search pdf | annotate, sign |
| sign-pdf | sign pdf | add signature to pdf, e-sign pdf free | fill form, lock |
| edit-pdf | edit pdf | add text to pdf, change text in pdf | annotate, redact |
| annotate-pdf | annotate pdf | highlight pdf, draw on pdf | reader, sign |
| add-page-numbers | add page numbers to pdf | number pdf pages | watermark |
| add-watermark | add watermark to pdf | watermark pdf with logo | lock, page numbers |
| crop-pdf | crop pdf | trim pdf margins | redact, organize |
| fill-pdf-form | fill pdf form | fill out pdf online | sign, annotate |
| compare-pdf | compare pdf | find differences between two pdfs | OCR, pdf to text |
| lock-pdf | password protect pdf | lock pdf, encrypt pdf | unlock, sign |
| unlock-pdf | remove password from pdf | unlock pdf | lock |
| redact-pdf | redact pdf | black out text in pdf | metadata, crop |
| pdf-metadata | remove pdf metadata | edit pdf properties, pdf author | redact |
| resize-image | resize image | change image size in pixels | crop, convert |
| crop-image | crop image | straighten photo of document | rotate, filter |
| rotate-image | rotate image | flip image | crop |
| filter-image | black and white document filter | enhance scanned photo | scan, crop |
| convert-image | image converter jpg png webp | webp to jpg, png to jpg | image to webp |
| image-to-webp | png to webp | jpg to webp, convert images to webp | convert image, resize |
| qr-code-generator | qr code generator | wifi qr code, qr code svg | business card maker |
| /resume-builder | free resume builder | resume templates, cv maker pdf | Create Studio |
| /create/invoices | free invoice maker | gst invoice, invoice template pdf | letterheads |
| /create/id-cards | id card maker | employee id card template | business cards |
| /create/business-cards | business card maker | visiting card maker | QR generator |
| /create/certificates | certificate maker | certificate of achievement template | |
| /create/photo-collages | photo collage maker | photo grid | |
| /create/letterheads | letterhead maker | company letterhead template | invoices |
| /create/festival-greetings | diwali greeting maker | festival wishes card, whatsapp status greeting | |

Brand note: “Snap Scanner” is a shared phrase (other apps use similar names), so ranking for it depends heavily on external signals: the Play listing linking to the website, consistent naming (“Snap Scanner by Fusix Studio”) and real mentions.

## 8. Prioritized 30/60/90-day plan

**Days 0–30: get indexed**
1. Deploy this change so canonicals, sitemap, robots.txt and structured data use `https://snapscanner.vercel.app` (section 0).
2. Run the launch checks (section 9).
3. Verify Search Console and Bing Webmaster Tools with a URL-prefix property; submit `https://snapscanner.vercel.app/sitemap.xml` to both.
4. URL Inspection → Request indexing for `/`, `/tools`, and the popular tools (merge, split, compress, scan, sign, organize, pdf-to-jpg, pdf-to-word, word-to-pdf, resume-builder).
5. Add the website URL to the Google Play listing (Store presence → Website) and the developer profile. It's the strongest legitimate brand signal available.
6. Decide on `ALLOW_MODEL_TRAINING`.

**Days 31–60: improve what Search Console shows**
1. Pages → “Discovered/Crawled – currently not indexed”: improve or interlink those pages first.
2. Performance → queries with impressions but CTR under ~1%: rewrite those pages’ titles and descriptions to match the query wording (keep them accurate).
3. Add per-page Open Graph images for the 10 most-visited tools.
4. Measure Core Web Vitals on the home page and the heaviest tools; fix what the data shows.

**Days 61–90: content that earns links and citations**
1. For the 3–5 tools with the most impressions, add one practical guide each, only where it answers a real question the tool page can't (for example “How to get a scanned PDF under 2 MB for an upload form”), linking to the tool.
2. Expand FAQs on tool pages from questions in support email and Search Console queries.
3. Ask real users (Play reviewers, communities where the tools were genuinely useful) to link to specific tools. No paid or exchanged links.
4. Re-check AI search: ask ChatGPT search, Claude and Perplexity about the tasks above and note whether pages are cited. Treat it as a spot check, not a metric.

## 9. Launch and verification checklist

Run after deploying:

```bash
curl -sI https://snapscanner.vercel.app/                      # 200, no X-Robots-Tag
curl -sI http://snapscanner.vercel.app/                       # 308 → https://snapscanner.vercel.app/
curl -s  https://snapscanner.vercel.app/robots.txt            # matches app/robots.ts
curl -s  https://snapscanner.vercel.app/sitemap.xml | grep -c '<loc>'   # 57 URLs
curl -sI https://snapscanner.vercel.app/tools/merge-pdf       # 200
curl -sI https://snapscanner.vercel.app/does-not-exist        # 404
curl -sI https://snapscanner.vercel.app/features              # 308 → /tools
curl -s  https://snapscanner.vercel.app/ | grep -o 'rel="canonical" href="[^"]*"'   # https://snapscanner.vercel.app/
curl -s -A 'OAI-SearchBot/1.0' -o /dev/null -w '%{http_code}\n' https://snapscanner.vercel.app/tools/compress-pdf   # 200
curl -s -A 'Claude-SearchBot' -o /dev/null -w '%{http_code}\n' https://snapscanner.vercel.app/tools/compress-pdf    # 200
```

Then:
- [ ] Search Console: URL-prefix property for `https://snapscanner.vercel.app` verified; sitemap submitted; URL Inspection on `/`, `/tools/merge-pdf`, `/create/invoices` shows “URL is available to Google” and a rendered page with the FAQ text.
- [ ] Bing Webmaster Tools: import from Search Console or verify the URL-prefix property; submit sitemap.
- [ ] Rich Results Test and validator.schema.org on `/`, `/tools/compress-pdf`, `/create/invoices`: no errors.
- [ ] A preview deployment URL returns `X-Robots-Tag: noindex`.
- [ ] Mobile check of one tool on a real phone (camera on Scan to PDF needs https).
- [ ] Monitor monthly: Pages (indexing), Performance (queries, impressions, clicks, CTR, position), Core Web Vitals, Play Console store-listing visitors.

No page should be described as indexed until URL Inspection says so.

## 10. Open items and assumptions

- **Custom domain** (section 0) — optional; no custom domain is configured or assumed. `snapscanner.app` is not used.
- `SITE_URL` is `https://snapscanner.vercel.app`, the official production URL, and is defined once in `lib/site.ts` (`SITE_DOMAIN` plus the derived `SITE_URL`).
- AI-training crawler policy is left as it was (allowed) pending an owner decision.
- No analytics was added; measurement relies on Search Console, Bing and Play Console (section 6).
- Performance, indexing and rich-result eligibility were not measured in this pass; re-check after deploying.
- Keyword phrases in section 7 are hypotheses; no volume or ranking data was used.
