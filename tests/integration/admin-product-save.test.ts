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
  it('creates a product with two separately stocked variants and orders the selected one', async () => {
    const [category] = await sql<{ id: string }[]>`insert into store.categories(slug,name) values ('accessories','Аксесоари') returning id`
    const variants = [{ id: crypto.randomUUID(), name: 'Черен', price: 10, compareAtPrice: null, stock: 3 }, { id: crypto.randomUUID(), name: 'Кафяв', price: 12, compareAtPrice: null, stock: 2 }]
    const response = await POST(request('POST', { title:'Кейс',brand:'Tiarra',gender:'unisex',price:10,compareAtPrice:null,stock:null,descriptionHtml:'',perfume:null,hidden:false,categoryIds:[category.id],images:[{path:'https://example.com/p.jpg',alt:'',width:800,height:800}],variants }))
    expect(response.status).toBe(201)
    const { id, slug } = await response.json()
    const product = await getProductBySlug(slug)
    expect(product?.variants.map(v => [v.name, v.stock])).toEqual([['Черен',3],['Кафяв',2]])
    expect(product?.optionName).toBe('Вид')
    const [result] = await sql<{ order_number: string }[]>`select * from store.create_order_with_settings_and_promo(${crypto.randomUUID()},'Тест Клиент','0888123456','test@example.com','econt','office','econt:1','София','1000','Офис','',${sql.json([{productId:id,variantId:variants[1].id,quantity:1}])},'')`
    const [line] = await sql<{ variant_name: string }[]>`select oi.variant_name from store.order_items oi join store.orders o on o.id=oi.order_id where o.order_number=${result.order_number}`
    expect(line.variant_name).toBe('Кафяв')
    expect((await getProductBySlug(slug))?.variants.map(v => v.stock)).toEqual([3,1])
  })
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
