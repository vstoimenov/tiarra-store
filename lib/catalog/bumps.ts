import { sql } from '@/lib/db'
import type { Product } from './types'
import { getProductBySlug } from './queries'
import { isChogan15MlCase, isChoganPerfume, PRODUCT_BUMP_LABEL } from './bump-rules'

interface BumpRow {
  slug: string
  label: string
}

export interface ProductBumpResult {
  product: Product
  label: string
  isManual: boolean
}

/**
 * Return the owner-selected bump, or a lower-priced in-stock product sharing
 * the strongest category/gender context. The fallback only picks products
 * without variants so it can be added with one tap.
 */
export async function getProductBump(product: Product): Promise<ProductBumpResult | null> {
  if (isChoganPerfume(product)) {
    // The 15 ml refill's case is the relevant accessory, including cases with colour variants.
    // Ignore unrelated saved mappings; never substitute shampoo if cases are unavailable.
    const cases = await sql<{ slug: string; title: string; brand: string | null; is_manual: boolean }[]>`
      select target.slug, target.title, target.brand,
        exists (select 1 from store.product_bumps pb where pb.product_id=${product.id} and pb.bump_product_id=target.id) as is_manual
      from store.products target
      where target.id<>${product.id} and not target.is_hidden
        and target.title ~* '(кейс|калъф|калъв|case)'
        and target.title ~* '(^|[^0-9])15[[:space:]]*(мл|ml)([^[:alnum:]]|$)'
        and ((not exists(select 1 from store.variants v where v.product_id=target.id) and (target.stock is null or target.stock>0))
          or exists(select 1 from store.variants v where v.product_id=target.id and (v.stock is null or v.stock>0)))
      order by is_manual desc,
        case when target.gender=${product.gender} then 2 when target.gender='unisex' then 1 else 0 end desc,
        target.slug`
    const match = cases.find(isChogan15MlCase)
    if (!match) return null
    const bump = await getProductBySlug(match.slug)
    return bump ? { product: bump, label: PRODUCT_BUMP_LABEL, isManual: match.is_manual } : null
  }
  const rows = await sql<(BumpRow & { is_manual: boolean })[]>`
    with explicit_bump as (
      select target.slug, pb.label, true as is_manual, 0 as priority,
        1000::float8 as relevance
      from store.product_bumps pb
      join store.products target on target.id = pb.bump_product_id
      where pb.product_id = ${product.id}
        and not target.is_hidden
        and (
          (not exists (select 1 from store.variants v where v.product_id = target.id)
            and (target.stock is null or target.stock > 0))
          or exists (select 1 from store.variants v where v.product_id = target.id
            and (v.stock is null or v.stock > 0))
        )
    ),
    automatic_bump as (
      select target.slug, ${PRODUCT_BUMP_LABEL}::text as label,
        false as is_manual, 1 as priority,
        (
          100 * (select count(*) from store.product_categories mine
            join store.product_categories theirs on theirs.category_id = mine.category_id
            where mine.product_id = ${product.id} and theirs.product_id = target.id)
          + case when target.gender in (${product.gender}, 'unisex') then 20 else 0 end
          + case when target.price <= greatest(25, ${product.price} * 0.6) then 10 else 0 end
          - least(abs(target.price - least(25, ${product.price} * 0.4))::float8, 100) / 100
        )::float8 as relevance
      from store.products target
      where target.id <> ${product.id}
        and not target.is_hidden
        and not exists (select 1 from store.variants v where v.product_id = target.id)
        and (target.stock is null or target.stock > 0)
    )
    select slug, label, is_manual
    from (
      select * from explicit_bump
      union all
      select * from automatic_bump
    ) candidates
    order by priority, relevance desc, slug
    limit 1`

  const match = rows[0]
  if (!match) return null
  const bump = await getProductBySlug(match.slug)
  return bump ? { product: bump, label: PRODUCT_BUMP_LABEL, isManual: match.is_manual } : null
}

