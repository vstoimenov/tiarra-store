import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => { const fn = Object.assign(vi.fn(), { json: (value: unknown) => value, begin: vi.fn() }); fn.begin.mockImplementation(async (callback) => callback(fn)); return fn })
vi.mock('@/lib/db', () => ({ sql: query }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { POST } from '@/app/api/admin/products/route'

const product = {
  title: 'Тестов продукт', brand: 'Tiarra', gender: 'unisex' as const,
  price: 20, compareAtPrice: null, stock: 10, descriptionHtml: '',
  hidden: false, categoryIds: [],
  images: [{ path: 'https://example.com/product.webp', alt: '', width: 800, height: 800 }],
}
const request = (body: unknown) => new Request('https://shop.test/api/admin/products', {
  method: 'POST', headers: { origin: 'https://shop.test', 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

describe('product category validation', () => {
  beforeEach(() => vi.clearAllMocks())
  it('requires a category for a visible product', async () => {
    const response = await POST(request(product))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('категория')
    expect(query).not.toHaveBeenCalled()
  })
  it('allows an uncategorized hidden draft', async () => {
    query.mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111', slug: 'test' }])
    const response = await POST(request({ ...product, hidden: true }))
    expect(response.status).toBe(201)
    expect(query).toHaveBeenCalledOnce()
  })
  it('reports an error when the database does not persist perfume notes', async () => {
    query.mockResolvedValueOnce([{ id: '11111111-1111-4111-8111-111111111111', slug: 'test' }]).mockResolvedValueOnce([{ matches: false }])
    const response = await POST(request({ ...product, hidden: true, perfume: { top: 'Бергамот' } }))
    expect(response.status).toBe(500)
    expect((await response.json()).error).toContain('Нотките не бяха записани')
  })
})
