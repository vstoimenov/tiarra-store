import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { sql } from '@/lib/db'
import { getAdminProducts } from '@/lib/admin/products'
import { getProductBySlug } from '@/lib/catalog/queries'
import { resetCatalog } from './helpers'
import type { TransactionSql } from 'postgres'
// Run API transactions with the production app role, not the test database owner.
vi.mock('@/lib/db', async importOriginal => {
  const { sql: client } = await importOriginal<typeof import('@/lib/db')>()
  return { sql: new Proxy(client, {
    get(target, key, receiver) {
      if (key !== 'begin') return Reflect.get(target, key, receiver)
      return (callback: (tx: TransactionSql) => Promise<unknown>) => target.begin(async tx => {
        await tx`set local role tiarra_app`
        return callback(tx)
      })
    },
  }) }
})
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { PATCH, POST } from '@/app/api/admin/products/route'

beforeEach(async () => {
  await resetCatalog()
  // The initial deployment provisions catalog reads outside the migration files.
  // Reproduce that baseline; keep stock writes restricted to update_inventory.
  await sql`grant select on store.products,store.variants,store.categories,store.product_categories,store.product_images to tiarra_app`
})
afterAll(() => sql.end())
const request = (method: string, data: unknown) => new Request('https://shop.test/api/admin/products', {
  method, headers: { origin: 'https://shop.test', 'content-type': 'application/json' }, body: JSON.stringify(data),
})
async function fixture() {
  const [category] = await sql<{ id: string }[]>`insert into store.categories(slug,name) values ('hair','Коса') returning id`
  const variants = [{ id: crypto.randomUUID(), name: 'M1', price: 10.5, compareAtPrice: null, stock: 4 }, { id: crypto.randomUUID(), name: 'M2', price: 10.5, compareAtPrice: null, stock: 7 }]
  const created = await POST(request('POST', { title: 'NISH MAN Вакса', brand: 'NISH MAN', gender: 'male', price: 10.5, compareAtPrice: null, stock: null, descriptionHtml: '', perfume: null, hidden: false, categoryIds: [category.id], images: [{ path: 'https://example.com/wax.webp', alt: '', width: 800, height: 800 }], variants }))
  expect(created.status).toBe(201)
  const { id } = await created.json()
  const product = (await getAdminProducts()).find(product => product.id === id)!
  const draft = { ...product, variants: product.variants.map(variant => ({ ...variant, expectedStock: variant.stock })) }
  return { product, draft }
}
it('loads and edits separate existing quantities, including zero and unlimited, and appends a stocked type', async () => {
  const { product, draft } = await fixture()
  expect(product.variants.map(variant => variant.stock)).toEqual([4, 7])
  const [permissions] = await sql<{ direct_stock_write: boolean }[]>`select has_column_privilege('tiarra_app','store.variants','stock','update') as direct_stock_write`
  expect(permissions.direct_stock_write).toBe(false)
  draft.variants[0].stock = 0
  draft.variants[1].stock = null
  draft.variants.push({ id: crypto.randomUUID(), name: 'M3', price: 10.5, compareAtPrice: null, stock: 3, expectedStock: undefined })
  const response = await PATCH(request('PATCH', draft))
  expect(response.status).toBe(200)
  expect((await getProductBySlug(product.slug))?.variants.map(variant => [variant.name, variant.stock])).toEqual([['M1', 0], ['M2', null], ['M3', 3]])
  const [stored] = await sql<{ stock: number | null }[]>`select stock from store.products where id=${product.id}`
  expect(stored.stock).toBeNull()
  const order = (variantId: string) => sql`select * from store.create_order_with_settings_and_promo(${crypto.randomUUID()},'Тест Клиент','0888123456','test@example.invalid','econt','office','econt:1','София','1000','Офис','',${sql.json([{ productId: product.id, variantId, quantity: 1 }])},'')`
  await expect(order(draft.variants[0].id)).rejects.toThrow('INSUFFICIENT_STOCK')
  await order(draft.variants[2].id)
  expect((await getProductBySlug(product.slug))?.variants.map(variant => variant.stock)).toEqual([0, null, 2])
})
it('does not restore stock sold after the editor opened when the quantity field was unchanged', async () => {
  const { product, draft } = await fixture()
  await sql`select * from store.create_order_with_settings_and_promo(${crypto.randomUUID()},'Тест Клиент','0888123456','test@example.invalid','econt','office','econt:1','София','1000','Офис','',${sql.json([{ productId: product.id, variantId: draft.variants[0].id, quantity: 1 }])},'')`
  draft.title = 'NISH MAN Вакса — редактирано име'
  const response = await PATCH(request('PATCH', draft))
  expect(response.status).toBe(200)
  expect((await getProductBySlug(product.slug))?.variants.map(variant => variant.stock)).toEqual([3, 7])
})
it('rolls back the entire edit if another inventory edit changed an explicitly edited quantity', async () => {
  const { product, draft } = await fixture()
  await sql`select * from store.update_inventory(${draft.variants[0].id},'variant',2)`
  draft.title = 'Това не трябва да се запише'
  draft.variants[0].stock = 5
  draft.variants[1].stock = 1
  const response = await PATCH(request('PATCH', draft))
  expect(response.status).toBe(409)
  expect((await response.json()).error).toContain('Наличността на вид е променена')
  const current = (await getAdminProducts()).find(row => row.id === product.id)!
  expect(current.title).toBe(product.title)
  expect(current.updatedAt).toBe(product.updatedAt)
  expect(current.variants.map(variant => variant.stock)).toEqual([2, 7])
})
it.each([-1, 1.5, 100000])('rejects an invalid existing stock quantity: %s', async stock => {
  const { product, draft } = await fixture()
  draft.variants[0].stock = stock
  expect((await PATCH(request('PATCH', draft))).status).toBe(400)
  expect((await getProductBySlug(product.slug))?.variants.map(variant => variant.stock)).toEqual([4, 7])
})
