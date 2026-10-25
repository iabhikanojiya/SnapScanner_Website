'use client'

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const Accordion = AccordionPrimitive.Root

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn('border-b border-gray-200 last:border-b-0', className)} {...props} />
}

function AccordionTrigger({
  className,
  children,
  headingLevel = 3,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & { headingLevel?: 2 | 3 | 4 }) {
  const Heading = `h${headingLevel}` as const
  return (
    <AccordionPrimitive.Header asChild>
      <Heading className="flex">
        <AccordionPrimitive.Trigger
          className={cn(
            'flex flex-1 items-center justify-between gap-4 rounded-lg py-5 text-left text-base font-semibold text-ink transition-colors hover:text-brand-700 focus-visible:ring-offset-0 [&[data-state=open]>svg]:rotate-180',
            className
          )}
          {...props}
        >
          {children}
          <ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200" />
        </AccordionPrimitive.Trigger>
      </Heading>
    </AccordionPrimitive.Header>
  )
}

// Always mounted (hidden while closed) so the answers are in the server-rendered
// HTML for search engines, and find-in-page can reach them.
function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      forceMount
      className="overflow-hidden data-[state=closed]:hidden data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn('pb-5 pr-9 leading-relaxed text-ink-soft', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
