'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Smartphone, ChevronRight, Sparkles, Star, Scan, Signature, FileText, CheckCircle2,
} from 'lucide-react'

const stages = [
  { icon: Scan, label: 'Scanning document...', color: '#E53935' },
  { icon: FileText, label: 'Processing PDF...', color: '#f59e0b' },
  { icon: Signature, label: 'Ready to sign', color: '#10b981' },
  { icon: CheckCircle2, label: 'Complete!', color: '#10b981' },
]

function StageIcon({ stage }: { stage: number }) {
  const Icon = stages[stage].icon
  return <Icon className="w-3 h-3" style={{ color: stages[stage].color }} />
}

export default function Hero() {
  const [stage, setStage] = useState(0)
  const [scanY, setScanY] = useState(10)
  const [isVisible, setIsVisible] = useState(false)
  const rafRef = useRef<number>()
  const sectionRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => (s + 1) % stages.length)
    }, prefersReducedMotion ? 5000 : 3000)
    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  useEffect(() => {
    if (stage !== 0 || !isVisible) {
      setScanY(10)
      return
    }
    const animate = () => {
      setScanY((prev) => {
        const next = prev + 1.5
        return next > 220 ? 10 : next
      })
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [stage, isVisible])

  return (
    <section ref={sectionRef} className="relative min-h-[90vh] flex items-center overflow-hidden pt-20 sm:pt-24">
      <div className="absolute inset-0 bg-gradient-to-b from-red-50/40 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#E53935]/5 rounded-full blur-2xl pointer-events-none hidden md:block" />
      <div className="absolute top-1/3 -right-32 w-80 h-80 bg-[#ff6f61]/5 rounded-full blur-2xl pointer-events-none hidden md:block" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#E53935]/5 rounded-full blur-2xl pointer-events-none hidden md:block" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <Badge className="mb-6 animate-fade-in" variant="default">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Available on Android
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
              Your Smart{' '}
              <span className="text-gradient">PDF Scanner</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-500 leading-relaxed max-w-xl">
              Scan documents, convert images into PDF, merge, split, compress, sign and protect PDFs — all from one simple app.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="group relative overflow-hidden" asChild>
                <a
                  href="https://play.google.com/store/apps/details?id=com.antigravity.snapscanner.snap_scanner&hl=en_IN"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download Snap Scanner from Google Play"
                >
                  <span className="relative z-10 flex items-center">
                    <Smartphone className="w-5 h-5 mr-2" />
                    Download on Google Play
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-[#d32f2f] to-[#E53935] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#features" aria-label="View all features">
                  View Features
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center gap-6 text-sm text-gray-400"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Works Offline
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                No Watermarks
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Free to Use
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                5 Star Rating
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="relative flex items-center justify-center lg:justify-end will-change-transform"
          >
            <div className="relative w-[280px] h-[400px] sm:w-[320px] sm:h-[460px] lg:w-[360px] lg:h-[500px]">
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-gray-800 p-[3px] shadow-2xl shadow-black/20">
                <div className="w-full h-full rounded-[2.35rem] bg-white overflow-hidden relative">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-700 border-2 border-gray-600" />
                  </div>

                  <div className="absolute inset-0 pt-8 pb-4 px-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[10px] font-medium text-gray-400 ml-2">scan.pdf</span>
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 relative overflow-hidden">
                      <div className="space-y-2.5">
                        <div className="w-full h-2.5 bg-gray-200 rounded-full" />
                        <div className="w-3/4 h-2.5 bg-gray-200 rounded-full" />
                        <div className="w-5/6 h-2.5 bg-gray-200 rounded-full" />
                        <div className="w-1/2 h-2.5 bg-gray-200 rounded-full" />
                        <div className="w-full h-2.5 bg-gray-200 rounded-full" />
                        <div className="w-2/3 h-2.5 bg-gray-200 rounded-full" />
                        <div className="w-4/5 h-2.5 bg-gray-200 rounded-full" />
                        <div className="w-3/5 h-2.5 bg-gray-200 rounded-full" />
                      </div>

                      <AnimatePresence mode="wait">
                        {stage === 0 && (
                          <motion.div
                            key="scanline"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ top: `${scanY}px` }}
                            className="absolute left-0 right-0 h-8 pointer-events-none"
                          >
                            <div className="h-full w-full bg-gradient-to-b from-transparent via-[#E53935]/20 to-transparent" />
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-[#E53935]/60 shadow-[0_0_8px_rgba(229,57,53,0.4)]" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence mode="wait">
                        {stage === 1 && (
                          <motion.div
                            key="processing"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
                          >
                            <div className="text-center">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-12 h-12 rounded-full border-3 border-[#f59e0b] border-t-transparent mx-auto mb-2"
                                style={{ borderWidth: 3 }}
                              />
                              <p className="text-xs font-medium text-amber-600">Converting...</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence mode="wait">
                        {stage === 2 && (
                          <motion.div
                            key="signature"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
                          >
                            <svg viewBox="0 0 200 80" className="w-40 h-16">
                              <motion.path
                                d="M10 60 Q 30 20 50 50 T 90 30 T 130 55 T 170 25 T 190 45"
                                fill="none"
                                stroke="#E53935"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, ease: 'easeInOut' }}
                              />
                            </svg>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence mode="wait">
                        {stage === 3 && (
                          <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
                          >
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            >
                              <CheckCircle2 className="w-12 h-12 text-green-500" />
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-2 flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={stages[stage].label}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="flex items-center gap-1.5"
                          >
                            <StageIcon stage={stage} />
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: stages[stage].color }}
                            >
                              {stages[stage].label}
                            </span>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <div className="flex gap-1">
                        {stages.map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                              i === stage ? 'bg-[#E53935] w-3' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                animate={prefersReducedMotion ? { y: 0 } : { y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-4 -bottom-4 sm:-right-6 sm:-bottom-6 bg-white rounded-2xl p-3 sm:p-4 shadow-xl border border-gray-100 z-10"
              >
                <div className="flex items-center gap-2">
                  <Scan className="w-4 h-4 sm:w-5 sm:h-5 text-[#E53935]" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">Instant Scan</span>
                </div>
              </motion.div>

              <motion.div
                animate={prefersReducedMotion ? { y: 0 } : { y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-4 top-1/4 bg-white rounded-2xl p-3 sm:p-4 shadow-xl border border-gray-100 z-10 hidden sm:block"
              >
                <div className="flex items-center gap-2">
                  <Signature className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">Sign PDFs</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
