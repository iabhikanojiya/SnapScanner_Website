'use client'

import { motion } from 'framer-motion'
import {
  Scan,
  Image,
  CopyPlus,
  Scissors,
  FileDown,
  Lock,
  Signature,
  Crop,
  Pen,
  WifiOff,
} from 'lucide-react'

const features = [
  { icon: Scan, title: 'Scan PDF', description: 'Scan documents directly with your camera and save as PDF.' },
  { icon: Image, title: 'Image to PDF', description: 'Convert any image or photo to PDF format instantly.' },
  { icon: CopyPlus, title: 'Merge PDF', description: 'Combine multiple PDF files into a single document.' },
  { icon: Scissors, title: 'Split PDF', description: 'Extract pages from PDFs and split into separate files.' },
  { icon: FileDown, title: 'Compress PDF', description: 'Reduce PDF file size without losing quality.' },
  { icon: Lock, title: 'Lock PDF', description: 'Protect your PDFs with strong password encryption.' },
  { icon: Signature, title: 'Sign PDF', description: 'Add your handwritten signature to any document.' },
  { icon: Crop, title: 'Resize Images', description: 'Crop, rotate, and resize images before converting.' },
  { icon: Pen, title: 'Saved Signatures', description: 'Store and reuse signatures for quick document signing.' },
  { icon: WifiOff, title: 'Fast Offline Processing', description: 'All processing happens on your device — no internet needed.' },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Everything you need in one app
          </h2>
          <p className="mt-4 text-gray-500 text-lg leading-relaxed">
            Powerful document scanning and PDF editing tools, designed for simplicity and speed.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group relative p-5 rounded-2xl bg-white border border-gray-100 card-hover overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#E53935]/0 to-[#ff6f61]/0 group-hover:from-[#E53935]/5 group-hover:to-[#ff6f61]/5 transition-all duration-500" />
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E53935]/10 to-[#ff6f61]/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:from-[#E53935] group-hover:to-[#ff6f61] transition-all duration-300">
                    <Icon className="w-5 h-5 text-[#E53935] group-hover:text-white group-hover:rotate-3 transition-all duration-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1.5 group-hover:text-[#E53935] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-600 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
