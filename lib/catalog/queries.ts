import { sql } from '@/lib/db'
import { isAvailable } from './stock'
import type { Category, Gender, Perfume, Product, ProductCard, ProductImage, Variant } from './types'

// postgres.js returns numeric columns as strings, so prices are cast to float8 in SQL
// (json_agg already emits numbers). Every function below issues one query at a time.

interface CardRow {
  slug: string
  title: string
  brand: string | null
  gender: Gender
  created_at: Date
  stock: number | null
  image_path: string | null
  price: number
  compare_at_price: number | null
  /** One entry per variant (null = not tracked); null when the product has no variants. */
  variant_stocks: (number | null)[] | null
  category_slugs: string[]
}

interface ProductRow extends CardRow {
  id: string
  legacy_id: number | null
  description_html: string
  option_name: string | null
  perfume: Perfume | null
  seo_title: string | null
  seo_description: string | null
  variants: Variant[]
  images: ProductImage[]
  categories: Category[]
}

// The one order of categories (ruling R15), for the category list and for the categories of a
// product alike, so a product's first category is the one the shop lists first. The import gives
// every category position 0, so the order of the live shop (women, men, parfimes, komplekt, …)
// comes from its legacy ids; a category made here has none and goes last, by name. Alias: `c`.
const categoryOrder = sql`c.position, c.legacy_id nulls last, c.name`

// Card fields. `cv` summarises the variants (cheapest first); `eff` is the card's price,
// taken from the cheapest variant when there are variants, else from the product.
const cardColumns = sql`
  p.slug, p.title, p.brand, p.gender, p.created_at, p.stock,
  (select i.path from store.product_images i
    where i.product_id = p.id order by i.position, i.id limit 1) as image_path,
  eff.price, eff.compare_at_price, cv.stocks as variant_stocks,
  coalesce((select array_agg(c.slug order by ${categoryOrder})
    from store.product_categories pc join store.categories c on c.id = pc.category_id
    where pc.product_id = p.id), '{}') as category_slugs`

const cardJoins = sql`
  from store.products p
  cross join lateral (
    select
      (array_agg(v.price order by v.price, v.position))[1] as price,
      (array_agg(v.compare_at_price order by v.price, v.position))[1] as compare_at_price,
      json_agg(v.stock order by v.position) as stocks
    from store.variants v
    where v.product_id = p.id
  ) cv
  cross join lateral (
    select
      (case when cv.stocks is null then p.price else cv.price end)::float8 as price,
      (case when cv.stocks is null then p.compare_at_price else cv.compare_at_price end)::float8
        as compare_at_price
  ) eff`

const newestFirst = sql`order by p.created_at desc, p.slug`

function toCard(row: CardRow): ProductCard {
  return {
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    gender: row.gender,
    imagePath: row.image_path,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    hasVariants: row.variant_stocks !== null,
    inStock: (row.variant_stocks ?? [row.stock]).some(isAvailable),
    categorySlugs: row.category_slugs,
    createdAt: row.created_at.toISOString(),
  }
}

function toCategory(row: Category): Category {
  return { id: row.id, slug: row.slug, name: row.name, position: row.position }
}

export async function getCategories(): Promise<Category[]> {
  const rows = await sql<Category[]>`
    select c.id, c.slug, c.name, c.position from store.categories c
    order by ${categoryOrder}`
  return rows.map(toCategory)
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const rows = await sql<Category[]>`
    select id, slug, name, position from store.categories where slug = ${slug}`
  return rows[0] ? toCategory(rows[0]) : null
}

export async function getProductCards(
  opts: { categorySlug?: string; onSale?: boolean } = {},
): Promise<ProductCard[]> {
  const inCategory = opts.categorySlug
    ? sql`and exists (
        select 1 from store.product_categories pc join store.categories c on c.id = pc.category_id
        where pc.product_id = p.id and c.slug = ${opts.categorySlug})`
    : sql``
  // An old price only counts when it is above the price (ruling R7), the same test the card uses.
  const onSale = opts.onSale ? sql`and eff.compare_at_price > eff.price` : sql``

  const rows = await sql<CardRow[]>`
    select ${cardColumns}
    ${cardJoins}
    where not p.is_hidden ${inCategory} ${onSale}
    ${newestFirst}`
  return rows.map(toCard)
}

/** Visible perfume-category products and their structured notes for the fragrance finder. */
export async function getPerfumeQuizProducts(): Promise<(ProductCard & { perfume: Perfume | null })[]> {
  const rows = await sql<(CardRow & { perfume: Perfume | null })[]>`
    select ${cardColumns}, p.perfume
    ${cardJoins}
    where not p.is_hidden and exists (
      select 1 from store.product_categories pc join store.categories c on c.id = pc.category_id
      where pc.product_id = p.id and c.slug = 'parfimes')
    ${newestFirst}`
  return rows.map((row) => ({ ...toCard(row), perfume: row.perfume }))
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const rows = await sql<ProductRow[]>`
    select ${cardColumns},
      p.id, p.legacy_id, p.description_html, p.option_name, p.perfume,
      p.seo_title, p.seo_description,
      (select coalesce(json_agg(json_build_object(
          'id', v.id, 'name', v.name, 'price', v.price, 'compareAtPrice', v.compare_at_price,
          'stock', v.stock, 'sku', v.sku, 'imagePath', v.image_path, 'position', v.position
        ) order by v.position, v.id), '[]'::json)
        from store.variants v where v.product_id = p.id) as variants,
      (select coalesce(json_agg(json_build_object(
          'path', i.path, 'width', i.width, 'height', i.height, 'alt', i.alt, 'position', i.position
        ) order by i.position, i.id), '[]'::json)
        from store.product_images i where i.product_id = p.id) as images,
      (select coalesce(json_agg(json_build_object(
          'id', c.id, 'slug', c.slug, 'name', c.name, 'position', c.position
        ) order by ${categoryOrder}), '[]'::json)
        from store.product_categories pc join store.categories c on c.id = pc.category_id
        where pc.product_id = p.id) as categories
    ${cardJoins}
    where p.slug = ${slug} and not p.is_hidden`

  const row = rows[0]
  if (!row) return null
  return {
    ...toCard(row),
    id: row.id,
    legacyId: row.legacy_id,
    stock: row.stock,
    descriptionHtml: row.description_html,
    optionName: row.option_name,
    perfume: row.perfume,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    variants: row.variants,
    images: row.images,
    categories: row.categories,
  }
}

export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await sql<{ slug: string }[]>`
    select slug from store.products where not is_hidden order by slug`
  return rows.map((r) => r.slug)
}

/** Every visible product with the time it last changed, for the sitemap. */
export async function getProductSitemapEntries(): Promise<{ slug: string; updatedAt: Date }[]> {
  const rows = await sql<{ slug: string; updated_at: Date }[]>`
    select slug, updated_at from store.products where not is_hidden order by slug`
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at }))
}

/** Visible products sharing a category with `product`, same gender or unisex, newest first. */
export async function getRelatedProducts(product: Product, limit: number): Promise<ProductCard[]> {
  const genderMatch =
    product.gender === 'unisex' ? sql`` : sql`and p.gender in (${product.gender}, 'unisex')`

  const rows = await sql<CardRow[]>`
    select ${cardColumns}
    ${cardJoins}
    where not p.is_hidden and p.id <> ${product.id} ${genderMatch}
      and exists (
        select 1
        from store.product_categories mine
        join store.product_categories theirs on theirs.category_id = mine.category_id
        where mine.product_id = ${product.id} and theirs.product_id = p.id)
    ${newestFirst}
    limit ${limit}`
  return rows.map(toCard)
}
