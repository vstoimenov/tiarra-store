import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getProductBump } from '@/lib/catalog/bumps'
import { getProductBySlug } from '@/lib/catalog/queries'
import { PRODUCT_BUMP_LABEL } from '@/lib/catalog/bump-rules'
import { insertTestProduct, resetCatalog } from './helpers'
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { PUT } from '@/app/api/admin/bumps/route'

beforeEach(resetCatalog)
afterAll(() => sql.end())
async function fixture(gender: 'male' | 'female' | 'unisex' = 'male') {
  await insertTestProduct({ slug: 'chogan', title: 'OLFazeta by CHOGAN 125 — MEDITERRANEO Luxury Extract de Perfume 30%', brand: 'OLFazeta by CHOGAN', gender, price: 30, variants: [{ name: '15 мл', price: 15, stock: 4 }, { name: '70 мл', price: 30, stock: 2 }] })
  await insertTestProduct({ slug: 'case-colours', title: 'OLFazeta Кейс за парфюм 15 мл черен/кафяв', brand: 'OLFazeta by CHOGAN', gender: 'unisex', price: 15, variants: [{ name: 'Черен', price: 15, stock: 0 }, { name: 'Кафяв', price: 15, stock: 2 }] })
  await insertTestProduct({ slug: 'case-single', title: 'OLFazeta Кейс за парфюм 15 мл', brand: 'OLFazeta by CHOGAN', gender: 'female', stock: 3, price: 13 })
  await insertTestProduct({ slug: 'shampoo', title: 'SIEM Шампоан', brand: 'SIEM', stock: 10, price: 5 })
  const [product, colours, single, shampoo] = await Promise.all(['chogan', 'case-colours', 'case-single', 'shampoo'].map(getProductBySlug))
  // Reproduce the persisted mapping that previously displayed shampoo.
  await sql`insert into store.product_bumps(product_id,bump_product_id,label) values (${product!.id},${shampoo!.id},'Добави към ритуала си')`
  return { product: product!, colours: colours!, single: single!, shampoo: shampoo! }
}
it.each([['male', 'case-colours'], ['female', 'case-single'], ['unisex', 'case-colours']] as const)('offers the available 15 ml case for %s CHOGAN, overriding unrelated saved mappings', async (gender, slug) => {
  const { product } = await fixture(gender)
  const bump = await getProductBump(product)
  expect(bump?.product.slug).toBe(slug)
  expect(bump?.label).toBe(PRODUCT_BUMP_LABEL)
  expect(bump?.product.inStock).toBe(true)
  expect(bump?.isManual).toBe(false)
})
it('honours a manually selected case and keeps its colour variants', async () => {
  const { product, colours } = await fixture('female')
  await sql`update store.product_bumps set bump_product_id=${colours.id} where product_id=${product.id}`
  const bump = await getProductBump(product)
  expect(bump?.isManual).toBe(true)
  expect(bump?.product.variants.map(variant => [variant.name, variant.stock])).toEqual([['Черен', 0], ['Кафяв', 2]])
})
it('uses the remaining available case and hides the offer when no case can be bought', async () => {
  const { product, colours, single } = await fixture('female')
  await sql`update store.products set is_hidden=true where id=${single.id}`
  expect((await getProductBump(product))?.product.id).toBe(colours.id)
  await sql`update store.variants set stock=0 where product_id=${colours.id}`
  expect(await getProductBump(product)).toBeNull()
})
it('does not apply the CHOGAN rule to YODEYMA and uses the renamed heading for a legacy mapping', async () => {
  const { shampoo } = await fixture()
  await insertTestProduct({ slug: 'yodeyma', title: 'YODEYMA Paris Eau de Parfum', brand: 'YODEYMA', stock: 4 })
  const product = (await getProductBySlug('yodeyma'))!
  await sql`insert into store.product_bumps(product_id,bump_product_id,label) values (${product.id},${shampoo.id},'Добави към ритуала си')`
  const bump = await getProductBump(product)
  expect(bump?.product.id).toBe(shampoo.id)
  expect(bump?.isManual).toBe(true)
  expect(bump?.label).toBe(PRODUCT_BUMP_LABEL)
})
it('rejects an unrelated manual recommendation for CHOGAN and saves the fixed label for a case', async () => {
  const { product, shampoo, single } = await fixture()
  const request = (id: string) => new NextRequest('https://shop.test/api/admin/bumps', { method: 'PUT', headers: { origin: 'https://shop.test', 'content-type': 'application/json' }, body: JSON.stringify({ productId: product.id, bumpProductId: id, label: 'Добави към ритуала си' }) })
  expect((await PUT(request(shampoo.id))).status).toBe(400)
  expect((await PUT(request(single.id))).status).toBe(200)
  const [saved] = await sql<{ label: string }[]>`select label from store.product_bumps where product_id=${product.id}`
  expect(saved.label).toBe(PRODUCT_BUMP_LABEL)
})
