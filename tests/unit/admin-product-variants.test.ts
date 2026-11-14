import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => { const fn = Object.assign(vi.fn(), { json: (value: unknown) => value, begin: vi.fn() }); fn.begin.mockImplementation(async (callback) => callback(fn)); return fn })
vi.mock('@/lib/db', () => ({ sql: query }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { PATCH } from '@/app/api/admin/products/route'

const id = '11111111-1111-4111-8111-111111111111'
const black = { id: '22222222-2222-4222-8222-222222222222', name: 'Черен', price: 20, compareAtPrice: null, stock: 2 }
const brown = { id: '33333333-3333-4333-8333-333333333333', name: 'Кафяв', price: 20, compareAtPrice: null, stock: 3 }
const product = { id, updatedAt: 'revision', title: 'Тестов продукт', brand: null, gender: 'unisex', price: 20, compareAtPrice: null, stock: 5, descriptionHtml: '', hidden: true, categoryIds: [], images: [], variants: [black, brown] }
const request = (body: unknown) => new Request('https://shop.test/api/admin/products', { method: 'PATCH', headers: { origin: 'https://shop.test', 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('adding variants to existing products', () => {
 beforeEach(() => vi.clearAllMocks())
 it('adds the first variants when editing a product', async () => {
  query.mockResolvedValueOnce([{ updated_at: 'revision', slug: 'test' }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ updatedAt: 'next', slug: 'test' }])
  const response = await PATCH(request(product))
  expect(response.status).toBe(200)
  expect(query.mock.calls[2][0].join('')).toContain('admin_add_new_variants')
  expect(query.mock.calls[2][2]).toEqual([black, brown])
 })
 it('appends a variant without deleting existing ones', async () => {
  query.mockResolvedValueOnce([{ updated_at: 'revision', slug: 'test' }]).mockResolvedValueOnce([{ id: black.id }]).mockResolvedValueOnce([{ available: true }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ updatedAt: 'next', slug: 'test' }]).mockResolvedValueOnce([])
  const response = await PATCH(request(product))
  expect(response.status).toBe(200)
  expect(query.mock.calls[3][0].join('')).toContain('admin_append_variants')
  expect(query.mock.calls[3][2]).toEqual([brown])
 })
 it('rejects removal of an already saved variant', async () => {
  query.mockResolvedValueOnce([{ updated_at: 'revision', slug: 'test' }]).mockResolvedValueOnce([{ id: black.id }, { id: brown.id }])
  const response = await PATCH(request({ ...product, variants: [black] }))
  expect(response.status).toBe(409)
 })
 it('reports a missing migration instead of pretending to save', async () => {
  query.mockResolvedValueOnce([{ updated_at: 'revision', slug: 'test' }]).mockResolvedValueOnce([{ id: black.id }]).mockResolvedValueOnce([{ available: false }])
  const response = await PATCH(request(product))
  expect(response.status).toBe(500)
  expect((await response.json()).error).toContain('актуализация на базата')
 })
 it('saves a changed variant picture through the restricted database function', async () => {
  const imagePath = 'https://example.com/brown.webp'
  query.mockResolvedValueOnce([{ updated_at:'revision',slug:'test' }]).mockResolvedValueOnce([{id:black.id,imagePath:null},{id:brown.id,imagePath:null}]).mockResolvedValueOnce([{updatedAt:'next',slug:'test'}]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{available:true}]).mockResolvedValueOnce([])
  const response = await PATCH(request({...product,variants:[black,{...brown,imagePath}]}))
  expect(response.status).toBe(200)
  const call = query.mock.calls.find(args=>args[0].join('').includes('select store.admin_set_variant_images('))
  expect(call?.[2]).toEqual([{...brown,imagePath}])
 })
 it('preserves variant pictures for older clients that omit the image field', async () => {
  query.mockResolvedValueOnce([{ updated_at:'revision',slug:'test' }]).mockResolvedValueOnce([{id:black.id,imagePath:'https://example.com/black.webp'},{id:brown.id,imagePath:null}]).mockResolvedValueOnce([{updatedAt:'next',slug:'test'}]).mockResolvedValueOnce([]).mockResolvedValueOnce([])
  const response = await PATCH(request(product))
  expect(response.status).toBe(200)
  expect(query.mock.calls.some(args=>args[0].join('').includes('admin_set_variant_images'))).toBe(false)
 })

})
