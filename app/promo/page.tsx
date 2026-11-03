import { ProductGrid } from '@/components/catalog/ProductGrid'
import { getProductCards } from '@/lib/catalog/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'

export const metadata = pageMetadata({
  title: 'Промоции за месеца | Tiarra Cosmetics',
  description: 'Продуктите на Tiarra Cosmetics с намалена цена този месец. Виж старата и новата цена.',
  path: '/promo',
})

export default async function PromoPage() {
  // Only cards whose old price is above the price, so every card shows its old price and -N%.
  const cards = await getProductCards({ onSale: true })

  return <ProductGrid title="Промоции за месеца" cards={cards} />
}
