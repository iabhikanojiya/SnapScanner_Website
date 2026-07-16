'use client'

import { motion } from 'framer-motion'

interface PageLayoutProps {
  title: string
  children: React.ReactNode
}

export default function PageLayout({ title, children }: PageLayoutProps) {
  return (
    <main className="min-h-screen pt-24 sm:pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-8">
            {title}
          </h1>
          <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-[#E53935]">
            {children}
          </div>
        </motion.div>
      </div>
    </main>
  )
}
