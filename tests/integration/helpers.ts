import { sql } from '@/lib/db'
import { assertTestDatabase } from './test-db'

export interface TestVariantInput {
  name: string
  price: number
  compareAtPrice?: number | null
  stock?: number | null
  sku?: string
  imagePath?: string | null
  /** Defaults to the variant's index in the list. */
  position?: number
}

export interface TestImageInput {
  path: string
  width?: number
  height?: number
  alt?: string
}

export interface TestCategoryInput {
  slug: string
  /** Defaults to the slug. */
  name?: string
  position?: number
  /** The category's id on the old shop; the import writes it, and it orders categories of equal position. */
  legacyId?: number
}

export interface TestProductInput {
  slug: string
  title?: string
  brand?: string | null
  gender?: 'female' | 'male' | 'unisex'
  price?: number
  compareAtPrice?: number | null
  stock?: number | null
  optionName?: string | null
  perfume?: Record<string, string> | null
  isHidden?: boolean
  /** ISO timestamp; set it when a test depends on ordering. */
  createdAt?: string
  categories?: TestCategoryInput[]
  variants?: TestVariantInput[]
  images?: TestImageInput[]
}

/** Empties the catalog tables. Refuses to run anywhere but the local `tiarra_test` database. */
export async function resetCatalog(): Promise<void> {
  assertTestDatabase(process.env.DATABASE_URL)
  await sql`truncate store.product_images, store.variants, store.product_categories, store.products, store.categories cascade`
}

/** Inserts a product with its categories, variants and images; returns its slug. */
export async function insertTestProduct(input: TestProductInput): Promise<string> {
  await sql.begin(async (tx) => {
    const [product] = await tx<{ id: string }[]>`
      insert into store.products
        (slug, title, brand, gender, price, compare_at_price, stock, option_name, perfume, is_hidden, created_at)
      values (
        ${input.slug},
        ${input.title ?? input.slug},
        ${input.brand ?? null},
        ${input.gender ?? 'unisex'},
        ${input.price ?? 10},
        ${input.compareAtPrice ?? null},
        ${input.stock ?? null},
        ${input.optionName ?? null},
        ${input.perfume ? tx.json(input.perfume) : null},
        ${input.isHidden ?? false},
        ${input.createdAt ?? new Date().toISOString()}
      )
      returning id`

    for (const category of input.categories ?? []) {
      const [row] = await tx<{ id: string }[]>`
        insert into store.categories (legacy_id, slug, name, position)
        values (${category.legacyId ?? null}, ${category.slug}, ${category.name ?? category.slug}, ${category.position ?? 0})
        on conflict (slug) do update set slug = excluded.slug
        returning id`
      await tx`insert into store.product_categories (product_id, category_id) values (${product.id}, ${row.id})`
    }

    for (const [index, variant] of (input.variants ?? []).entries()) {
      await tx`
        insert into store.variants
          (product_id, name, price, compare_at_price, stock, sku, image_path, position)
        values (
          ${product.id},
          ${variant.name},
          ${variant.price},
          ${variant.compareAtPrice ?? null},
          ${variant.stock ?? null},
          ${variant.sku ?? ''},
          ${variant.imagePath ?? null},
          ${variant.position ?? index}
        )`
    }

    for (const [index, image] of (input.images ?? []).entries()) {
      await tx`
        insert into store.product_images
          (product_id, source_key, path, width, height, alt, position)
        values (
          ${product.id},
          ${image.path},
          ${image.path},
          ${image.width ?? 800},
          ${image.height ?? 800},
          ${image.alt ?? ''},
          ${index}
        )`
    }
  })

  return input.slug
}
