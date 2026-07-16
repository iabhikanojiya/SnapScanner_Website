import Hero from '@/components/Hero'
import Features from '@/components/Features'
import ScreenshotsCarousel from '@/components/ScreenshotsCarousel'
import WhySnapScanner from '@/components/WhySnapScanner'
import FAQSection from '@/components/FAQ'
import Testimonials from '@/components/Testimonials'
import CTA from '@/components/CTA'

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <ScreenshotsCarousel />
      <WhySnapScanner />
      <Testimonials />
      <FAQSection />
      <CTA />
    </main>
  )
}
