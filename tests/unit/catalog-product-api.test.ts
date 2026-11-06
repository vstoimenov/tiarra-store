import { beforeEach, describe, expect, it, vi } from 'vitest'

const getProductBySlug = vi.hoisted(() => vi.fn())
vi.mock('@/lib/catalog/queries', () => ({ getProductBySlug }))
import { GET } from '@/app/api/catalog/products/[slug]/route'

describe('catalog product API', () => {
  beforeEach(() => vi.clearAllMocks())
  it('returns a current visible product without caching', async () => {
    getProductBySlug.mockResolvedValue({ slug: 'cream', title: 'Cream' })
    const response = await GET(new Request('https://shop.test/api/catalog/products/cream'), { params: Promise.resolve({ slug: 'cream' }) })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect((await response.json()).product.slug).toBe('cream')
  })
  it('returns 404 when a product became hidden', async () => {
    getProductBySlug.mockResolvedValue(null)
    const response = await GET(new Request('https://shop.test/api/catalog/products/missing'), { params: Promise.resolve({ slug: 'missing' }) })
    expect(response.status).toBe(404)
  })
})
