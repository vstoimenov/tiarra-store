import type { Metadata } from 'next'
import { Archivo, Manrope } from 'next/font/google'
import type { ReactNode } from 'react'
import { StorefrontChrome } from '@/components/layout/StorefrontChrome'
import { VisitTracker } from '@/components/analytics/VisitTracker'
import { Analytics } from '@/components/analytics/Analytics'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Topbar } from '@/components/layout/Topbar'
import { imageOrigin } from '@/lib/images'
import { SITE_URL } from '@/lib/seo/site'
import { getSiteDocument } from '@/lib/site/documents'
import { getCommerceSettings } from '@/lib/commerce-settings'
import './globals.css'

// Body text. Latin and Cyrillic are both on Manrope.
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-body',
})

// Display type and buttons. Archivo has no Cyrillic, so Cyrillic headings fall back to the
// generic sans-serif, exactly as on the live site; `adjustFontFallback: false` keeps Next from
// inserting its size-adjusted Arial in front of that fallback.
const archivo = Archivo({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['800', '900'],
  display: 'swap',
  variable: '--font-display',
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  // Relative addresses in any page's metadata (an Open Graph image, say) resolve against this.
  metadataBase: new URL(SITE_URL),
  title: 'Tiarra Cosmetics',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [settings, navigation, home, commerce] = await Promise.all([getSiteDocument('settings'), getSiteDocument('navigation'), getSiteDocument('home'), getCommerceSettings()])

  const pictures = imageOrigin()

  return (
    <html lang="bg" className={`${manrope.variable} ${archivo.variable}`}>
      {/* No `crossOrigin`: <img> requests are plain, and a preconnect with it would open a different socket. */}
      <head>{pictures && <link rel="preconnect" href={pictures} />}</head>
      <body>
        <StorefrontChrome theme={home.theme} header={<Header menu={navigation.menu} topbar={<Topbar messages={settings.topbarMessages.map(message=>message.startsWith('Безплатна доставка над')?`Безплатна доставка над ${commerce.freeShippingThreshold.toLocaleString('bg-BG')} €`:message)} />} />} footer={<Footer settings={settings} groups={navigation.footer} />} analytics={<><Analytics googleAnalyticsId={commerce.googleAnalyticsId??process.env.NEXT_PUBLIC_GA_ID??null} googleTagManagerId={commerce.googleTagManagerId??process.env.NEXT_PUBLIC_GTM_ID??null} metaPixelId={commerce.metaPixelId??process.env.NEXT_PUBLIC_META_PIXEL_ID??null}/><VisitTracker /></>}>{children}</StorefrontChrome>
      </body>
    </html>
  )
}
