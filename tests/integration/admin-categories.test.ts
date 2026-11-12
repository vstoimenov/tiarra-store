import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from '@/lib/db'
import { getCategoryBySlug } from '@/lib/catalog/queries'
import { resetCatalog } from './helpers'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { POST } from '@/app/api/admin/categories/route'
const request = (name: string) => new Request('https://shop.test/api/admin/categories', { method: 'POST', headers: { origin: 'https://shop.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
beforeEach(resetCatalog)
afterAll(() => sql.end())
describe('creating categories', () => {
  it('saves a Bulgarian name and exposes the category in the catalog', async () => {
    const response = await POST(request('Кейсове за парфюми'))
    expect(response.status).toBe(201)
    const result = await response.json()
    expect(await getCategoryBySlug('кейсове-за-парфюми')).toMatchObject({ id: result.category.id, name: 'Кейсове за парфюми' })
    expect((await POST(request('Кейсове за парфюми'))).status).toBe(409)
  })
})
