import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

// Design tokens. Brand red #E53935 is used for accents and icons; text and
// filled buttons use the darker 600/700 steps so ordinary-size text meets
// WCAG AA contrast (white on #E53935 is only 4.2:1).
const config: Config = {
  content: ['./components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        brand: {
          50: '#FDF1F0',
          100: '#FBE0DE',
          200: '#F6BDB9',
          DEFAULT: '#E53935',
          500: '#E53935',
          600: '#D32F2F', // filled buttons: white text 5.0:1
          700: '#B92525', // red text: 6.3:1 on white, 5.6:1 on sand-100
          800: '#8F1D1D',
        },
        coral: {
          DEFAULT: '#FF6F61',
          100: '#FFE7E4',
        },
        ink: {
          DEFAULT: '#111827',
          soft: '#374151', // secondary text: 10.3:1 on white
          muted: '#4B5563', // tertiary text: 7.6:1 on white, 6.9:1 on gray-100
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['clamp(2.25rem, 1.6rem + 2.8vw, 3.5rem)', { lineHeight: '1.06', letterSpacing: '-0.025em' }],
        title: ['clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem)', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
      },
      maxWidth: {
        page: '76rem',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 1px rgba(17, 24, 39, 0.02)',
        lift: '0 12px 32px -12px rgba(17, 24, 39, 0.18)',
        panel: '0 1px 3px rgba(17, 24, 39, 0.06), 0 8px 24px -12px rgba(17, 24, 39, 0.12)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
}

export default config
