'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const reasons = [
  'Works Offline',
  'No Watermarks',
  'Fast Processing',
  'High Quality Scans',
  'Secure PDF Protection',
  'Easy to Use',
  'Lightweight App',
]

function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const num = parseInt(value.replace(/[^0-9]/g, ''))
  const hasPlus = value.includes('+')

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0
          const duration = 1500
          const step = Math.ceil(num / (duration / 16))
          const timer = setInterval(() => {
            start += step
            if (start >= num) {
              setCount(num)
              clearInterval(timer)
            } else {
              setCount(start)
            }
          }, 16)
          return () => clearInterval(timer)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [num])

  return (
    <div ref={ref}>
      <div className="text-2xl sm:text-3xl font-bold text-gray-900">
        {count}{hasPlus ? '+' : ''}{suffix}
      </div>
    </div>
  )
}

export default function WhySnapScanner() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Why choose{' '}
              <span className="text-gradient">Snap Scanner</span>?
            </h2>
            <p className="mt-4 text-gray-500 text-lg leading-relaxed">
              We built Snap Scanner to be the most capable yet easy-to-use document scanner for Android. No subscriptions, no watermarks, no hassle.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {reasons.map((reason, i) => (
                <motion.div
                  key={reason}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-6 h-6 rounded-full bg-[#E53935]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#E53935] transition-colors duration-300">
                    <Check className="w-3.5 h-3.5 text-[#E53935] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{reason}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="glass-dark rounded-3xl p-8 sm:p-10">
              <div className="grid grid-cols-2 gap-8">
                {[
                  { value: '1K+', label: 'Active Users' },
                  { value: '5★', label: 'App Rating' },
                  { value: '15MB', label: 'App Size' },
                  { value: '100%', label: 'Free to Use' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <AnimatedCounter value={stat.value} />
                    <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
