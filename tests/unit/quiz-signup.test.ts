import { beforeEach, describe, expect, it, vi } from 'vitest'
const query = vi.hoisted(() => vi.fn())
const limit = vi.hoisted(() => vi.fn())
vi.mock('@/lib/db', () => ({ sql: query }))
vi.mock('@/lib/rate-limit', () => ({ checkoutRateLimit: limit }))
import { POST } from '@/app/api/quiz-signup/route'
const request = (body: unknown, origin = 'https://shop.test') => new Request('https://shop.test/api/quiz-signup', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
describe('quiz marketing signup', () => {
  beforeEach(() => { vi.clearAllMocks(); limit.mockResolvedValue(true); query.mockResolvedValue([]) })
  it('never records an address without explicit consent or with invalid email', async () => {
    expect((await POST(request({ email: 'x@example.com', consent: false }))).status).toBe(400)
    expect((await POST(request({ email: 'invalid', consent: true }))).status).toBe(400)
    expect(query).not.toHaveBeenCalled()
  })
  it('stores a normalized address when consent is given', async () => {
    expect((await POST(request({ email: ' X@Example.com ', consent: true }))).status).toBe(200)
    expect(query).toHaveBeenCalledOnce()
    expect(query.mock.calls[0]).toContain('x@example.com')
  })
  it('rejects cross-origin and rate limited requests', async () => {
    expect((await POST(request({ email: 'x@example.com', consent: true }, 'https://other.test'))).status).toBe(403)
    limit.mockResolvedValue(false)
    expect((await POST(request({ email: 'x@example.com', consent: true }))).status).toBe(429)
    expect(query).not.toHaveBeenCalled()
  })
  it('reports failure instead of claiming the address was saved', async () => {
    query.mockRejectedValue(new Error('unavailable'))
    expect((await POST(request({ email: 'x@example.com', consent: true }))).status).toBe(503)
  })
})
