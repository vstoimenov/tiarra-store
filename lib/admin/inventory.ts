import { sql } from '@/lib/db'

export interface InventoryItem { id: string; productId: string; slug: string; title: string; variantName: string | null; stock: number | null; kind: 'product' | 'variant' }

export async function getInventory(): Promise<InventoryItem[]> {
  const rows = await sql<{ id: string; product_id: string; slug: string; title: string; variant_name: string | null; stock: number | null; kind: 'product' | 'variant' }[]>`
    select p.id, p.id as product_id, p.slug, p.title, null::text as variant_name, p.stock, 'product'::text as kind
    from store.products p where not p.is_hidden and not exists (select 1 from store.variants v where v.product_id=p.id)
    union all
    select v.id, p.id as product_id, p.slug, p.title, v.name, v.stock, 'variant'::text as kind
    from store.variants v join store.products p on p.id=v.product_id where not p.is_hidden
    order by title, variant_name nulls first`
  return rows.map((row) => ({ id: row.id, productId: row.product_id, slug: row.slug, title: row.title, variantName: row.variant_name, stock: row.stock, kind: row.kind }))
}
