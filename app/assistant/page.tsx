import { MessageSquareText, ScanSearch, Sparkles, Wand2 } from 'lucide-react'
import AssistantChat from '@/components/assistant/AssistantChat'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Snap Assistant – Find Files and Open Tools',
  description:
    'Type what you need, like “merge these two documents” or “find my PDFs from last week”. Snap Assistant searches My files and opens the right tool. Rule-based, no AI.',
  path: '/assistant',
})

const STEPS = [
  { icon: MessageSquareText, title: 'Ask in plain words', text: '“Merge these two documents”, “bills from September”, “compress this PDF”.' },
  { icon: ScanSearch, title: 'It searches My files', text: 'Matches file names, types, dates and sizes. It never reads what’s inside your files.' },
  { icon: Wand2, title: 'The right tool opens', text: 'With your files already added, ready to merge, compress, sign or convert.' },
]

const EXAMPLES = [
  ['Find files', '“images larger than 2 MB”, “show my recent files”'],
  ['Use tools', '“sign a form”, “convert my photos to PDF”'],
  ['Create', '“create a resume”, “show my resumes”'],
]

export default function AssistantPage() {
  return (
    <>
      <section className="assistant-hero relative isolate overflow-hidden text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <span className="assistant-glow left-[8%] top-[18%] h-64 w-64 bg-fuchsia-500/30" />
          <span className="assistant-glow right-[6%] top-[4%] h-72 w-72 bg-indigo-400/30" style={{ animationDelay: '-4s' }} />
          <span className="assistant-glow bottom-[-30%] left-[40%] h-80 w-80 bg-cyan-400/20" style={{ animationDelay: '-8s' }} />
        </div>
        <div className="page-container pb-28 pt-10 text-center sm:pb-32 sm:pt-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            <Sparkles aria-hidden className="h-3.5 w-3.5" />
            Snap Assistant · Private · Rule-based, no AI
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Ask for a file or a tool.
            <span className="assistant-hero-accent block">It does the rest.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/75 sm:text-lg">
            Snap Assistant finds files you’ve saved in My files and opens the right tool with them, all inside your browser.
          </p>
        </div>
      </section>

      <div className="page-container relative -mt-20 grid gap-6 pb-14 sm:-mt-24 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <AssistantChat />

        <aside className="space-y-4 lg:pt-2">
          <section aria-labelledby="how-title" className="rounded-3xl border border-gray-200 bg-white p-5 shadow-card">
            <h2 id="how-title" className="font-bold text-ink">
              How it works
            </h2>
            <ol className="mt-4 space-y-4">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex gap-3">
                  <span className="assistant-avatar relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
                    <Icon aria-hidden className="h-4 w-4" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-700 shadow">{i + 1}</span>
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{title}</span>
                    <span className="block text-sm text-ink-soft">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="ask-title" className="rounded-3xl border border-gray-200 bg-white p-5 shadow-card">
            <h2 id="ask-title" className="font-bold text-ink">
              More things to ask
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              {EXAMPLES.map(([t, d]) => (
                <div key={t}>
                  <dt className="font-semibold text-ink">{t}</dt>
                  <dd className="text-ink-soft">{d}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </>
  )
}
