// Strips active content from user-supplied HTML before it's previewed. The
// preview iframe is also sandboxed without scripts; this is defence in depth.

const BLOCKED = 'script,noscript,iframe,frame,frameset,object,embed,applet,form,input,button,select,textarea,base,link[rel=import],meta[http-equiv],portal'

export function sanitizeHtml(html: string): { head: string; body: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll(BLOCKED).forEach((el) => el.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(attr.name)
      else if (['href', 'src', 'xlink:href', 'action', 'formaction', 'srcset', 'poster'].includes(name) && /^(javascript|vbscript):/.test(value.replace(/\s/g, '')))
        el.removeAttribute(attr.name)
    }
  })
  // Keep only styles from the head; titles and metadata aren't needed.
  const head = Array.from(doc.head.querySelectorAll('style'))
    .map((s) => s.outerHTML)
    .join('')
  return { head, body: doc.body.innerHTML }
}
