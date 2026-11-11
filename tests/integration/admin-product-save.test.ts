import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from '@/lib/db'
import { getProductBySlug } from '@/lib/catalog/queries'
import { resetCatalog } from './helpers'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { POST, PATCH } from '@/app/api/admin/products/route'

beforeEach(resetCatalog)
afterAll(() => sql.end())
const request = (method: string, data: unknown) => new Request('https://shop.test/api/admin/products', {
  method, headers: { origin: 'https://shop.test', 'content-type': 'application/json' }, body: JSON.stringify(data),
})

describe('admin product save against Postgres', () => {
  it.each([null, { top: 'Бергамот', heart: 'Роза', base: 'Мускус' }])('creates a visible product and keeps its notes: %s', async perfume => {
    const [category] = await sql<{ id: string }[]>`insert into store.categories(slug,name) values ('parfimes','Парфюми') returning id`
    const data = { title: 'Тестов аромат', brand: 'Тест', gender: 'unisex', price: 25, compareAtPrice: null, stock: 3, descriptionHtml: 'Описание', perfume, hidden: false, categoryIds: [category.id], images: [{ path: 'https://example.com/p.jpg', alt: '', width: 800, height: 800 }] }
    const response = await POST(request('POST', data))
    expect(await response.clone().text()).toContain('slug')
    expect(response.status).toBe(201)
    const { id, slug } = await response.json()
    expect(await getProductBySlug(slug)).toMatchObject({ title: data.title, perfume, categorySlugs: ['parfimes'] })
    const [row] = await sql<{ updated_at: string }[]>`select updated_at::text from store.products where id=${id}`
    const update = await PATCH(request('PATCH', { ...data, id, updatedAt: row.updated_at, variants: [], images: (await sql`select id,path,alt,width,height from store.product_images where product_id=${id}`), perfume: { top: 'Жасмин' } }))
    expect(await update.clone().text()).toContain('updatedAt')
    expect(update.status).toBe(200)
    expect((await getProductBySlug(slug))?.perfume).toEqual({ top: 'Жасмин' })
  })
})
