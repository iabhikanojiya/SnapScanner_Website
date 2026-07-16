export default function SchemaMarkup() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'Snap Scanner',
    operatingSystem: 'Android',
    applicationCategory: 'Multimedia',
    description:
      'Scan documents, convert images into PDF, merge, split, compress, sign and protect PDFs — all from one simple app.',
    url: 'https://snapscanner.app',
    image: 'https://snapscanner.app/og-image.png',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'Snap Scanner',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
