'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const screenshots = [
  { src: '/Images/Benefit Section/2.jpeg', label: 'Screenshot 1' },
  { src: '/Images/Benefit Section/3.jpeg', label: 'Screenshot 2' },
  { src: '/Images/Benefit Section/4.jpeg', label: 'Screenshot 3' },
  { src: '/Images/Benefit Section/5.jpeg', label: 'Screenshot 4' },
  { src: '/Images/Benefit Section/Hero.jpeg', label: 'Screenshot 5' },
]

export default function ScreenshotsCarousel() {
  const [current, setCurrent] = useState(0)

  const prev = () => setCurrent((c) => (c === 0 ? screenshots.length - 1 : c - 1))
  const next = () => setCurrent((c) => (c === screenshots.length - 1 ? 0 : c + 1))

  const prevIdx = current === 0 ? screenshots.length - 1 : current - 1
  const nextIdx = current === screenshots.length - 1 ? 0 : current + 1

  return (
    <section className="py-20 sm:py-28 bg-gray-50/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Beautiful & intuitive design
          </h2>
          <p className="mt-4 text-gray-500 text-lg leading-relaxed">
            Clean, modern interface designed for productivity.
          </p>
        </motion.div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-center gap-0 sm:gap-6 lg:gap-8 px-2 sm:px-0">
          <motion.div
            key={prevIdx}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 0.5, x: 0, scale: 0.8 }}
            className="relative w-[180px] h-[360px] sm:w-[200px] sm:h-[400px] hidden sm:block flex-shrink-0 cursor-pointer"
            onClick={prev}
          >
            <div className="absolute inset-0 rounded-[2rem] bg-gray-900 p-[2px] shadow-lg">
              <div className="w-full h-full rounded-[1.9rem] bg-white overflow-hidden relative">
                <Image
                  src={screenshots[prevIdx].src}
                  alt={screenshots[prevIdx].label}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative w-[220px] h-[440px] sm:w-[260px] sm:h-[520px] lg:w-[280px] lg:h-[560px] flex-shrink-0 z-10 will-change-transform"
          >
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-gray-800 p-[3px] shadow-2xl shadow-black/20">
              <div className="w-full h-full rounded-[2.35rem] bg-white overflow-hidden relative">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
                  <div className="w-2 h-2 rounded-full bg-gray-700 border-2 border-gray-600" />
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={screenshots[current].src}
                      alt={screenshots[current].label}
                      fill
                      className="object-cover"
                      sizes="280px"
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          <motion.div
            key={nextIdx}
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 0.5, x: 0, scale: 0.8 }}
            className="relative w-[180px] h-[360px] sm:w-[200px] sm:h-[400px] hidden sm:block flex-shrink-0 cursor-pointer"
            onClick={next}
          >
            <div className="absolute inset-0 rounded-[2rem] bg-gray-900 p-[2px] shadow-lg">
              <div className="w-full h-full rounded-[1.9rem] bg-white overflow-hidden relative">
                <Image
                  src={screenshots[nextIdx].src}
                  alt={screenshots[nextIdx].label}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-8 sm:mt-10">
          <button
            onClick={prev}
            className="p-2.5 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            aria-label="Previous screenshot"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex gap-2">
            {screenshots.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'bg-[#E53935] w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to screenshot ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="p-2.5 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            aria-label="Next screenshot"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </section>
  )
}
