import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-50 border-t border-gray-100" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-8 h-8 overflow-hidden rounded-xl shadow-lg shadow-red-500/20 group-hover:shadow-red-500/30 transition-shadow">
                <Image
                  src="/favicon.png"
                  alt="Snap Scanner"
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <span className="font-semibold text-base">Snap Scanner</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Your all-in-one document scanning and PDF editing solution for Android.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/#features" className="text-sm text-gray-500 hover:text-[#E53935] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-sm text-gray-500 hover:text-[#E53935] transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <a
                  href="https://play.google.com/store/apps/details?id=com.antigravity.snapscanner.snap_scanner&hl=en_IN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-[#E53935] transition-colors"
                >
                  Google Play
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://sites.google.com/view/snapscanner/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-[#E53935] transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/support" className="text-sm text-gray-500 hover:text-[#E53935] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="mailto:fusionsix.tech@gmail.com"
                  className="text-sm text-gray-500 hover:text-[#E53935] transition-colors"
                >
                  fusionsix.tech@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} Snap Scanner. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://sites.google.com/view/snapscanner/home"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Privacy
            </a>
            <Link href="/support" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
