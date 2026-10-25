'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Combine, FileArchive, FileOutput, FileSearch, FileText, ImageIcon, LayoutTemplate, RotateCcw, Search, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/tools/Feedback'
import { SUGGESTIONS, parseRequest, respond, toolPath, type AssistantAction, type AssistantReply } from '@/lib/assistant'
import { formatDate } from '@/lib/format'
import { formatBytes } from '@/lib/limits'
import { newDraft } from '@/lib/resume/model'
import { listDrafts, putDraft } from '@/lib/resume/store'
import { useLibrary } from '@/lib/storage/hooks'
import type { LibraryFile } from '@/lib/storage/library'
import { cn } from '@/lib/utils'

interface Message extends Partial<AssistantReply> {
  id: number
  role: 'user' | 'assistant'
  text: string
}

const WELCOME: Message = {
  id: 0,
  role: 'assistant',
  text: 'Hi, I’m Snap Assistant. I can find files you’ve saved in My files and open the right tool. What would you like to do?',
}

/** Starting prompts on the Assistant page, shown as cards until the first message. */
const STARTERS: { prompt: (typeof SUGGESTIONS)[number]; title: string; icon: typeof Search }[] = [
  { prompt: 'Find my recent PDFs', title: 'Find recent files', icon: FileSearch },
  { prompt: 'Find a file named invoice', title: 'Search by name', icon: Search },
  { prompt: 'Merge these documents', title: 'Merge PDFs', icon: Combine },
  { prompt: 'Compress this file', title: 'Make a PDF smaller', icon: FileArchive },
  { prompt: 'Extract pages 2-5', title: 'Pull out pages', icon: FileOutput },
  { prompt: 'Create a resume', title: 'Start a resume', icon: LayoutTemplate },
]

export default function AssistantChat({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const { files, loading, error } = useLibrary()
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [resumeError, setResumeError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  /** Files the user can refer to with "these": selected ones, else the last results. */
  const previous = (): LibraryFile[] => {
    const lastWithFiles = [...messages].reverse().find((m) => m.role === 'assistant' && m.files?.length)
    const shown = lastWithFiles?.files ?? []
    const picked = shown.filter((f) => selected.has(f.id))
    // Look up fresh metadata in case files changed.
    return (picked.length ? picked : shown).map((f) => files.find((x) => x.id === f.id)).filter((f): f is LibraryFile => !!f)
  }

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text) return
    setInput('')
    const intent = parseRequest(text)
    const resumeCount = intent.type === 'resume' ? (await listDrafts().catch(() => [])).length : 0
    const reply = respond(intent, { files, previous: previous(), resumeCount })
    setSelected(new Set())
    setMessages((m) => [...m, { id: nextId.current++, role: 'user', text }, { id: nextId.current++, role: 'assistant', ...reply }])
  }

  const createResume = async () => {
    try {
      const d = await putDraft(newDraft('classic_professional'), false)
      router.push(`/resume-builder/edit?id=${encodeURIComponent(d.id)}`)
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : 'The resume couldn’t be created.')
    }
  }

  const lastAssistant = messages[messages.length - 1]
  const fresh = messages.length === 1
  const restart = () => {
    setMessages([WELCOME])
    setSelected(new Set())
    setInput('')
    setResumeError(null)
  }
  const fileStatus = loading ? 'Loading your files…' : `${files.length} file${files.length === 1 ? '' : 's'} in My files`

  return (
    <div
      className={cn(
        'assistant-card flex flex-col overflow-hidden rounded-3xl border border-white/70 bg-white',
        compact ? 'h-[34rem]' : 'h-[min(46rem,calc(100dvh-8rem))] min-h-[32rem]'
      )}
      data-testid="assistant"
    >
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <span className="assistant-avatar flex h-11 w-11 items-center justify-center rounded-2xl text-white">
          <Sparkles aria-hidden className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-ink">Snap Assistant</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Ready · {fileStatus}
          </p>
        </div>
        {!fresh && (
          <Button variant="ghost" size="xs" className="ml-auto" onClick={restart}>
            <RotateCcw aria-hidden className="h-4 w-4" />
            New chat
          </Button>
        )}
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="assistant-log flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
      >
        {error && <Alert tone="warning">{error} File search won’t work, but tools can still be opened.</Alert>}
        {messages.map((m) => (
          <div key={m.id} className={cn('assistant-msg flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'assistant' && (
              <span aria-hidden className="assistant-avatar mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white">
                <Sparkles className="h-4 w-4" />
              </span>
            )}
            <div
              className={cn(
                'max-w-[90%] rounded-2xl px-4 py-2.5 text-sm',
                m.role === 'user'
                  ? 'assistant-user-bubble max-w-[80%] rounded-tr-md text-white'
                  : 'rounded-tl-md border border-gray-200/80 bg-white text-ink shadow-[0_4px_18px_-10px_rgba(30,20,90,0.35)]'
              )}
              data-testid={m.role === 'assistant' ? 'assistant-message' : 'user-message'}
            >
              <p className="whitespace-pre-line">{m.text}</p>
              {m.files && m.files.length > 0 && (
                <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {m.files.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 px-2 py-1.5">
                      {m === lastAssistant && (
                        <input
                          type="checkbox"
                          aria-label={`Select ${f.name}`}
                          className="h-4 w-4 accent-brand-600"
                          checked={selected.has(f.id)}
                          onChange={() =>
                            setSelected((cur) => {
                              const next = new Set(cur)
                              if (next.has(f.id)) next.delete(f.id)
                              else next.add(f.id)
                              return next
                            })
                          }
                        />
                      )}
                      {f.kind === 'pdf' ? <FileText aria-hidden className="h-4 w-4 shrink-0 text-brand-700" /> : <ImageIcon aria-hidden className="h-4 w-4 shrink-0 text-amber-700" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{f.name}</span>
                        <span className="block text-xs text-ink-muted">
                          {formatBytes(f.size)} · {formatDate(f.updatedAt)}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand-700 hover:underline"
                        onClick={() => router.push(toolPath(f.kind === 'pdf' ? 'pdf-reader' : 'image-to-pdf', [f.id]))}
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {m.files && m.files.length > 1 && m === lastAssistant && <p className="mt-1 text-xs text-ink-muted">Select files, then say what to do with them, for example “merge these”.</p>}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.actions.map((a, i) => (
                    <ActionView key={i} action={a} onNavigate={(href) => router.push(href)} onCreateResume={createResume} active={m === lastAssistant} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {fresh && (
          <div className="assistant-msg pt-2" data-testid="assistant-starters">
            <p className="mb-3 pl-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Try one of these</p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {STARTERS.slice(0, compact ? 4 : 6).map(({ prompt, title, icon: Icon }) => (
                <li key={prompt}>
                  <button
                    type="button"
                    aria-label={prompt}
                    onClick={() => void send(prompt)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_10px_30px_-14px_rgba(67,56,202,0.45)] motion-reduce:hover:translate-y-0"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                      <Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{title}</span>
                      <span className="block truncate text-xs text-ink-muted">“{prompt}”</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {resumeError && <Alert tone="error">{resumeError}</Alert>}
      </div>

      <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-3 sm:px-5">
        <div className={cn('mb-2 flex gap-2 overflow-x-auto pb-1', fresh && 'hidden')} aria-label="Suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50/60 px-3 py-1 text-xs font-semibold text-indigo-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
          className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-1.5 pl-4 transition-colors focus-within:border-indigo-300 focus-within:bg-white"
        >
          <label htmlFor={compact ? 'assistant-input-home' : 'assistant-input'} className="sr-only">
            Ask Snap Assistant
          </label>
          <input
            id={compact ? 'assistant-input-home' : 'assistant-input'}
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-ink-muted"
            placeholder={compact ? 'e.g. find my PDFs from last week' : 'Ask for a file or a tool, e.g. “find my PDFs from last week”'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim()}
            className="assistant-send flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition disabled:opacity-40"
          >
            <Send aria-hidden className="h-4 w-4" />
          </button>
        </form>
        {!compact && <p className="mt-2 text-center text-[11px] text-ink-muted">Rule-based and private: your messages and files never leave this browser.</p>}
      </div>
    </div>
  )
}

function ActionView({
  action,
  active,
  onNavigate,
  onCreateResume,
}: {
  action: AssistantAction
  active: boolean
  onNavigate: (href: string) => void
  onCreateResume: () => void
}) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(action.kind === 'pick' ? action.preselected : []))
  if (action.kind === 'navigate')
    return (
      <Button size="xs" variant={action.primary ? 'primary' : 'secondary'} onClick={() => onNavigate(action.href)}>
        {action.label}
        {action.primary && <ArrowRight aria-hidden className="h-3.5 w-3.5" />}
      </Button>
    )
  if (action.kind === 'create-resume')
    return (
      <Button size="xs" onClick={onCreateResume}>
        {action.label}
      </Button>
    )
  const ok = picked.size >= action.min && picked.size <= action.max
  const single = action.max === 1
  return (
    <fieldset className="w-full rounded-lg border border-gray-200 p-2" disabled={!active}>
      <legend className="sr-only">Choose files</legend>
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {action.candidates.map((f) => (
          <li key={f.id}>
            <label className="flex items-center gap-2 rounded px-1 py-1 hover:bg-gray-50">
              <input
                type={single ? 'radio' : 'checkbox'}
                name="assistant-pick"
                className="h-4 w-4 accent-brand-600"
                checked={picked.has(f.id)}
                onChange={() =>
                  setPicked((cur) => {
                    if (single) return new Set([f.id])
                    const next = new Set(cur)
                    if (next.has(f.id)) next.delete(f.id)
                    else next.add(f.id)
                    return next
                  })
                }
              />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-ink-muted">{formatBytes(f.size)}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button size="xs" className="mt-2" disabled={!ok} onClick={() => onNavigate(toolPath(action.tool, [...picked], action.pages))}>
        Continue with {picked.size || 'selected'} file{picked.size === 1 ? '' : 's'}
      </Button>
    </fieldset>
  )
}
