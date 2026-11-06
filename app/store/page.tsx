import { CategoryNav } from '@/components/catalog/CategoryNav'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { getCategories, getProductCards } from '@/lib/catalog/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'

export const metadata = pageMetadata({
  title: 'Всички продукти | Tiarra Cosmetics',
  description: 'Всички продукти на Tiarra Cosmetics: парфюми, грижа за коса, брада и тяло. Безплатна доставка над 39 €.',
  path: '/store',
})

// Static: the page carries every card and the search runs in the browser.
export default async function StorePage() {
  const [cards, categories] = await Promise.all([getProductCards(), getCategories()])

  return (
    <ProductGrid title="Всички продукти" cards={cards} readQuery defaultShelf>
      <CategoryNav categories={categories} />
    </ProductGrid>
  )
}
