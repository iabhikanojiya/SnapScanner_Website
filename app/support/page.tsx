import PageLayout from '@/components/PageLayout'
import { Mail, MessageSquare, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support - Snap Scanner',
  description: 'Get help and support for Snap Scanner Android application. Contact us for questions, feedback, or issues.',
  alternates: {
    canonical: 'https://snapscanner.app/support',
  },
}

const supportOptions = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Send us an email and we will get back to you within 24 hours.',
    action: 'fusionsix.tech@gmail.com',
    href: 'mailto:fusionsix.tech@gmail.com',
  },
  {
    icon: MessageSquare,
    title: 'In-App Feedback',
    description: 'Use the feedback option in the app settings to report issues directly.',
    action: 'Open App Settings',
    href: '#',
  },
  {
    icon: ExternalLink,
    title: 'Google Play Support',
    description: 'Leave a review or ask questions on our Google Play listing.',
    action: 'Visit Google Play',
    href: 'https://play.google.com/store/apps/details?id=com.antigravity.snapscanner.snap_scanner&hl=en_IN',
  },
]

export default function Support() {
  return (
    <PageLayout title="Support">
      <p className="text-gray-500 text-lg mb-8">
        We are here to help. Choose a support option below or browse our FAQ for quick answers.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {supportOptions.map((option) => {
          const Icon = option.icon
          return (
            <a
              key={option.title}
              href={option.href}
              target={option.href.startsWith('http') ? '_blank' : undefined}
              rel={option.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="p-6 rounded-2xl bg-white border border-gray-100 card-hover block"
            >
              <Icon className="w-6 h-6 text-[#E53935] mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">{option.title}</h3>
              <p className="text-sm text-gray-500 mb-3 leading-relaxed">{option.description}</p>
              <span className="text-sm font-medium text-[#E53935]">{option.action} →</span>
            </a>
          )
        })}
      </div>

      <h2>Frequently Asked Questions</h2>

      <div className="space-y-6 mt-4">
        {[
          {
            q: 'How do I report a bug?',
            a: 'Please email us at fusionsix.tech@gmail.com with a description of the issue, your device model, and Android version. Screenshots are helpful.',
          },
          {
            q: 'Can I request a new feature?',
            a: 'Absolutely! We love hearing from our users. Send your feature requests to fusionsix.tech@gmail.com.',
          },
          {
            q: 'How long does it take to get a response?',
            a: 'We typically respond to all inquiries within 24 hours on business days.',
          },
          {
            q: 'I lost my purchased features after reinstalling. What should I do?',
            a: 'Please contact us at fusionsix.tech@gmail.com with your Google Play order ID and we will help restore your purchase.',
          },
        ].map((item) => (
          <div key={item.q}>
            <h3 className="font-semibold text-gray-900 text-sm">{item.q}</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}
