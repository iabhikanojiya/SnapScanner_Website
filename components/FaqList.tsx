import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { FaqItem } from '@/lib/content'

export default function FaqList({ items, headingLevel = 3 }: { items: FaqItem[]; headingLevel?: 2 | 3 | 4 }) {
  return (
    <Accordion type="multiple" className="card px-5 sm:px-6">
      {items.map((item, i) => (
        <AccordionItem key={item.question} value={`faq-${i}`}>
          <AccordionTrigger headingLevel={headingLevel}>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
