import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn(), revalidate: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ sql: mocks.query }))
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidate, revalidatePath: mocks.revalidatePath }))
import { PUT } from '@/app/api/admin/appearance/route'

const request = (theme: unknown, origin = 'https://shop.test') => new Request('https://shop.test/api/admin/appearance', {
  method: 'PUT', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ theme }),
})

describe('store theme API', () => {
  beforeEach(() => vi.clearAllMocks())
  it('rejects cross-origin and unknown themes', async () => {
    expect((await PUT(request('boost', 'https://other.test'))).status).toBe(403)
    expect((await PUT(request('copied-theme'))).status).toBe(400)
    expect(mocks.query).not.toHaveBeenCalled()
  })
  it('persists the selected theme and invalidates the storefront', async () => {
    mocks.query.mockResolvedValue([{ theme: 'boost' }])
    const response = await PUT(request('boost'))
    expect(await response.json()).toEqual({ theme: 'boost' })
    expect(mocks.revalidate).toHaveBeenCalledWith('site')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})
