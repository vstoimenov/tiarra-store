import type { Metadata } from 'next'
import localFont from 'next/font/local'
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

// Local font files make builds independent of Google Fonts availability.
const manrope = localFont({
  src: [
    { path: './fonts/manrope-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/manrope-600.ttf', weight: '600', style: 'normal' },
    { path: './fonts/manrope-700.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap', variable: '--font-body',
})
const archivo = localFont({
  src: [
    { path: './fonts/archivo-800.ttf', weight: '800', style: 'italic' },
    { path: './fonts/archivo-900.ttf', weight: '900', style: 'italic' },
  ],
  display: 'swap', variable: '--font-display', adjustFontFallback: false,
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
        <StorefrontChrome theme={home.theme ?? 'classic'} header={<Header menu={navigation.menu} topbar={<Topbar messages={settings.topbarMessages.map(message=>message.startsWith('Безплатна доставка над')?`Безплатна доставка над ${commerce.freeShippingThreshold.toLocaleString('bg-BG')} €`:message)} />} />} footer={<Footer settings={settings} groups={navigation.footer} />} analytics={<><Analytics googleAnalyticsId={commerce.googleAnalyticsId??process.env.NEXT_PUBLIC_GA_ID??null} googleTagManagerId={commerce.googleTagManagerId??process.env.NEXT_PUBLIC_GTM_ID??null} metaPixelId={commerce.metaPixelId??process.env.NEXT_PUBLIC_META_PIXEL_ID??null}/><VisitTracker /></>}>{children}</StorefrontChrome>
      </body>
    </html>
  )
}
