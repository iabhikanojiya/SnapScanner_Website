'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Alex Johnson',
    role: 'Freelancer',
    content: 'Best document scanner I have used on Android. The merge and split features save me hours every week.',
    rating: 5,
  },
  {
    name: 'Sarah Chen',
    role: 'Student',
    content: 'Perfect for scanning notes and assignments. The image to PDF conversion is incredibly fast and accurate.',
    rating: 5,
  },
  {
    name: 'Michael Torres',
    role: 'Business Owner',
    content: 'The signature feature is a game changer. I can sign contracts on the go without printing anything.',
    rating: 5,
  },
  {
    name: 'Emily Davis',
    role: 'Teacher',
    content: 'Clean interface and works entirely offline. Exactly what I needed for managing classroom documents.',
    rating: 4,
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export default function Testimonials() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Loved by users worldwide
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            See what our users are saying about Snap Scanner.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              variants={itemVariants}
              className="relative p-6 rounded-2xl bg-white border border-gray-100 card-hover"
            >
              <Quote className="w-8 h-8 text-[#E53935]/10 absolute top-4 right-4" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${
                      j < testimonial.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4 relative z-10">
                &ldquo;{testimonial.content}&rdquo;
              </p>
              <div className="border-t border-gray-50 pt-3">
                <div className="font-semibold text-sm text-gray-900">{testimonial.name}</div>
                <div className="text-xs text-gray-400">{testimonial.role}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
