import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { CartItem } from '@/lib/cart'
import { currentVisitSession, recordVisit } from '@/lib/visit-analytics'

const item: CartItem = { key: 'p:default', productId: 'p', slug: 'p', title: 'Продукт', variantId: null, variantName: null, imagePath: null, unitPrice: 10, quantity: 1 }
beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())
function browser(initial = '[]') {
  let value = initial
  const localStorage = { getItem: vi.fn(() => value), setItem: vi.fn((_key: string, next: string) => { value = next }) }
  vi.stubGlobal('window', { localStorage, dispatchEvent: vi.fn() })
  return localStorage
}
it('keeps additions usable when storage is blocked or its quota is full', async () => {
  const storage = browser(JSON.stringify([item]))
  storage.setItem.mockImplementation(() => { throw new Error('QuotaExceededError') })
  const { addCartItem, readCart, writeCart } = await import('@/lib/cart')
  addCartItem(item)
  expect(readCart()[0].quantity).toBe(2)
  addCartItem(item)
  expect(readCart()[0].quantity).toBe(3)
  const copy = readCart(); copy[0].quantity = 90
  expect(readCart()[0].quantity).toBe(3)
  storage.setItem.mockImplementation(() => {})
  writeCart([])
  storage.getItem.mockReturnValue('[]')
  expect(readCart()).toEqual([])
})
it('normalizes old cart records before checkout and rejects invalid prices', async () => {
  browser(JSON.stringify([{ ...item, variantId: undefined, variantName: {}, imagePath: {}, quantity: 120, source: 'bad' }, { ...item, unitPrice: -1 }]))
  const { readCart } = await import('@/lib/cart')
  expect(readCart()).toEqual([{ ...item, quantity: 99 }])
})
it('removes only purchased quantities, keeping additions made during submission', async () => {
  browser(JSON.stringify([{ ...item, quantity: 3 }, { ...item, key: 'another', productId: 'another', quantity: 2 }]))
  const { readCart, removePurchasedCartItems } = await import('@/lib/cart')
  removePurchasedCartItems([{ ...item, quantity: 2 }])
  expect(readCart().map(({ key, quantity }) => ({ key, quantity }))).toEqual([{ key: item.key, quantity: 1 }, { key: 'another', quantity: 2 }])
})
it('does not crash visits or checkout when the storage getter itself throws', () => {
  vi.stubGlobal('window', { get localStorage() { throw new Error('SecurityError') } })
  vi.stubGlobal('fetch', vi.fn())
  expect(currentVisitSession()).toBeNull()
  expect(() => recordVisit('/store')).not.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
