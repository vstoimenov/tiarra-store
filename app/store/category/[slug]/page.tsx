import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryNav } from '@/components/catalog/CategoryNav'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { getCategories, getCategoryBySlug, getProductCards } from '@/lib/catalog/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'

// Only the categories that exist are pages; anything else is a 404 and never reaches the database.
export const dynamicParams = false

// Cyrillic slugs go in as they are stored. A request carries them percent-encoded, so the
// params of a request are decoded (see `slugOf`) before they are looked up.
export async function generateStaticParams() {
  return (await getCategories()).map((category) => ({ slug: category.slug }))
}

function slugOf(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw // not valid percent-encoding: no category has such a slug, so it ends up a 404
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const category = await getCategoryBySlug(slugOf((await params).slug))
  if (!category) return {}

  return pageMetadata({
    title: `${category.name} | Tiarra Cosmetics`,
    description: `${category.name}: продукти на Tiarra Cosmetics. Безплатна доставка над 39 €.`,
    path: `/store/category/${encodeURIComponent(category.slug)}`,
  })
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ gender?: string }> }) {
  const slug = slugOf((await params).slug)
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const [cards, categories] = await Promise.all([getProductCards({ categorySlug: slug }), getCategories()])
  const gender = (await searchParams).gender === 'male' ? 'male' as const : undefined

  return (
    <ProductGrid title={category.name} cards={cards} initialGender={gender}>
      <CategoryNav categories={categories} current={slug} />
    </ProductGrid>
  )
}
