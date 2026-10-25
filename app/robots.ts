import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/create/registry'
import { SITE_URL } from '@/lib/site'

// The editors only show drafts and projects stored in the visitor's browser.
const PRIVATE = ['/resume-builder/edit', ...CATEGORIES.map((c) => `${c.href}/edit`)]

// Search crawlers, including the ones behind AI search answers. Listed by name
// so the decision is explicit; a crawler that matches a named group ignores the
// `*` group, so each group repeats the same rules.
//   Googlebot, Bingbot: Google and Bing search (Bing also feeds Copilot).
//   OAI-SearchBot: ChatGPT search. Claude-SearchBot: Claude's web search.
//   PerplexityBot: Perplexity search. Applebot: Spotlight, Siri and Safari.
const SEARCH_CRAWLERS = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Applebot']

// Crawlers and control tokens that decide whether content may be used to train
// AI models. They don't affect search: Google-Extended and Applebot-Extended
// don't change Google or Apple search results, and blocking GPTBot or ClaudeBot
// doesn't remove the site from ChatGPT or Claude search. Training is allowed;
// set this to false to opt out without losing search visibility.
// User-triggered fetchers (ChatGPT-User, Claude-User, Perplexity-User) act for a
// person asking about a page and aren't listed.
const ALLOW_MODEL_TRAINING = true
const TRAINING_CRAWLERS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: SEARCH_CRAWLERS, allow: '/', disallow: PRIVATE },
      ALLOW_MODEL_TRAINING ? { userAgent: TRAINING_CRAWLERS, allow: '/', disallow: PRIVATE } : { userAgent: TRAINING_CRAWLERS, disallow: '/' },
      { userAgent: '*', allow: '/', disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
