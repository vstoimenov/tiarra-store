import { cinematicHomeV1 } from '@/lib/sections/cinematic'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import { getProductCards } from '@/lib/catalog/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { visibleSections } from '@/lib/sections/visible'
import { getSiteDocument } from '@/lib/site/documents'

export const metadata = pageMetadata({
  title: 'Tiarra Cosmetics | Професионална козметика за коса, лице и тяло',
  description:
    'Онлайн магазин за професионална козметика за коса, лице и тяло в България. 100% оригинални продукти и безплатна доставка над 39 €.',
  path: '/',
})

// The page is static, rebuilt at most every 5 minutes. That is how a campaign section with a
// `showFrom` / `showUntil` appears and disappears without a deploy.
export const revalidate = 300

export default async function HomePage() {
  // One catalog query for the whole page: every products section picks its cards from it.
  const [home, settings, cards] = await Promise.all([
    getSiteDocument('home'),
    getSiteDocument('settings'),
    getProductCards(),
  ])

  return <SectionRenderer sections={visibleSections(process.env.CINEMATIC_HOME === '1' ? cinematicHomeV1(home) : home, new Date())} cards={cards} settings={settings} />
}
