const dateFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' })

/** "Today, 3:20 PM", "Yesterday, 9:05 AM" or "12 Oct 2026". */
export function formatDate(ms: number, now = Date.now()): string {
  const d = new Date(ms)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000)
  if (diffDays === 0) return `Today, ${timeFmt.format(d)}`
  if (diffDays === 1) return `Yesterday, ${timeFmt.format(d)}`
  return dateFmt.format(d)
}
