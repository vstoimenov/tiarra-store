import type { Product } from './types'

export interface Crumb {
  label: string
  /** Path on the site, already percent-encoded where it needs to be. */
  href: string
}

/**
 * The path shown above a product and repeated in its structured data: home, the first category
 * (by the categories' position), the product itself. One list feeds both, so they cannot differ.
 */
export function productCrumbs(p: Pick<Product, 'slug' | 'title' | 'categories'>): Crumb[] {
  const category = [...p.categories].sort((a, b) => a.position - b.position)[0]

  return [
    { label: 'Начало', href: '/' },
    ...(category ? [{ label: category.name, href: `/store/category/${encodeURIComponent(category.slug)}` }] : []),
    { label: p.title, href: `/store/${encodeURIComponent(p.slug)}` },
  ]
}
