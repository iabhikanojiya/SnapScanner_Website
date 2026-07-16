'use client'

import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'Is Snap Scanner free to use?',
    answer: 'Yes, Snap Scanner is completely free to use. There are no subscription fees, no hidden charges, and we do not add watermarks to your documents.',
  },
  {
    question: 'Does it work offline?',
    answer: 'Absolutely. All document scanning and PDF processing happens directly on your device. No internet connection is required, ensuring your documents stay private and secure.',
  },
  {
    question: 'Can I convert images to PDF?',
    answer: 'Yes, you can easily convert any image or photo from your gallery into a PDF document. You can also combine multiple images into a single PDF file.',
  },
  {
    question: 'How do I merge multiple PDFs?',
    answer: 'Simply select the PDF files you want to combine, arrange them in your preferred order, and tap merge. Snap Scanner will create a single PDF document from your selected files.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All processing happens locally on your device. We do not upload your documents to any server, ensuring your sensitive information stays completely private and secure.',
  },
  {
    question: 'Can I password-protect my PDFs?',
    answer: 'Yes, Snap Scanner allows you to lock your PDFs with a strong password. Only people with the password will be able to open and view the protected document.',
  },
  {
    question: 'How do I add my signature to a document?',
    answer: 'You can draw your signature directly in the app using your finger or stylus. Once saved, you can reuse it anytime to sign documents with just a few taps.',
  },
  {
    question: 'What Android version do I need?',
    answer: 'Snap Scanner requires Android 8.0 (Oreo) or higher. We recommend the latest Android version for the best experience and performance.',
  },
  {
    question: 'Can I compress PDF files?',
    answer: 'Yes, you can reduce the file size of your PDFs by compressing them. This is especially useful when you need to email large documents or save storage space.',
  },
  {
    question: 'How do I get support?',
    answer: 'If you have any questions or encounter any issues, you can reach us at fusionsix.tech@gmail.com. We typically respond within 24 hours on business days.',
  },
]

export default function FAQSection() {
  return (
    <section id="faq" className="py-20 sm:py-28 bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            Got questions? We have answers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 p-2 sm:p-4"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-sm sm:text-base px-3">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-3 text-gray-500 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
