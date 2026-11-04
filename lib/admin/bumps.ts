import { sql } from '@/lib/db'

export interface AdminProductOption {
  id: string
  slug: string
  title: string
}

export interface AdminBumpMapping {
  productId: string
  bumpProductId: string
  label: string
}

export async function getBumpAdminData(): Promise<{
  products: AdminProductOption[]
  mappings: AdminBumpMapping[]
}> {
  const [products, mappings] = await Promise.all([
    sql<AdminProductOption[]>`
      select id, slug, title
      from store.products
      where not is_hidden
      order by title, slug`,
    sql<{ product_id: string; bump_product_id: string; label: string }[]>`
      select product_id, bump_product_id, label
      from store.product_bumps
      order by updated_at desc`,
  ])

  return {
    products,
    mappings: mappings.map((row) => ({
      productId: row.product_id,
      bumpProductId: row.bump_product_id,
      label: row.label,
    })),
  }
}

