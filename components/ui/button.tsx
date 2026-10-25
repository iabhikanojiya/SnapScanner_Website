import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-600',
        secondary:
          'border border-gray-300 bg-white text-ink hover:border-ink-muted hover:bg-gray-50 focus-visible:ring-brand-600',
        dark: 'bg-ink text-white hover:bg-ink-soft focus-visible:ring-ink',
        light: 'bg-white text-ink hover:bg-gray-100 focus-visible:ring-white focus-visible:ring-offset-ink',
        ghost: 'text-ink-soft hover:bg-gray-100 hover:text-ink focus-visible:ring-brand-600',
        danger: 'border border-brand-200 bg-white text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-600',
      },
      size: {
        xs: 'h-9 rounded-lg px-3 text-sm',
        sm: 'h-10 px-4 text-sm',
        md: 'h-12 px-5 text-[0.95rem]',
        lg: 'h-14 px-6 text-base',
        icon: 'h-11 w-11',
        'icon-sm': 'h-9 w-9 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button, buttonVariants }
