export const CART_STORAGE_KEY = 'tiarra-cart-v1'
export const CART_UPDATED_EVENT = 'tiarra-cart-updated'
// Keep the current SPA session usable when Safari/storage quotas reject writes.
let volatileCart: CartItem[] | null = null

export interface CartItem {
  key: string
  productId: string
  slug: string
  title: string
  imagePath: string | null
  variantId: string | null
  variantName: string | null
  unitPrice: number
  quantity: number
  source?: 'bump' | 'upsell'
}

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  if (volatileCart !== null) return volatileCart.map(item => ({ ...item }))

  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is CartItem => {
      if (!item || typeof item !== 'object') return false
      const entry = item as Partial<CartItem>
      return (
        typeof entry.key === 'string' &&
        typeof entry.productId === 'string' &&
        typeof entry.slug === 'string' &&
        typeof entry.title === 'string' &&
        typeof entry.unitPrice === 'number' &&
        Number.isFinite(entry.unitPrice) && entry.unitPrice >= 0 &&
        typeof entry.quantity === 'number' &&
        Number.isInteger(entry.quantity) &&
        entry.quantity > 0
      )
    }).map(item => ({
      key: item.key, productId: item.productId, slug: item.slug, title: item.title, unitPrice: item.unitPrice, quantity: Math.min(item.quantity, 99),
      variantId: typeof item.variantId === 'string' && item.variantId ? item.variantId : null,
      variantName: typeof item.variantName === 'string' ? item.variantName : null,
      imagePath: typeof item.imagePath === 'string' ? item.imagePath : null,
      ...(item.source === 'bump' || item.source === 'upsell' ? { source: item.source } : {}),
    }))
  } catch {
    return []
  }
}

export function writeCart(items: CartItem[]) {
  try { window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)); volatileCart = null }
  catch { volatileCart = items.map(item => ({ ...item })) }
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function addCartItem(item: CartItem) {
  const items = readCart()
  const existing = items.find((entry) => entry.key === item.key)

  if (existing) existing.quantity = Math.min(existing.quantity + item.quantity, 99)
  else items.push(item)

  writeCart(items)
}

export function cartQuantity(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

/** Preserve items added from another tab while a purchase request was in flight. */
export function removePurchasedCartItems(purchased: CartItem[]) {
  const remaining = new Map<string, number>()
  for (const item of purchased) remaining.set(item.key, (remaining.get(item.key) ?? 0) + item.quantity)
  writeCart(readCart().flatMap(item => {
    const used = Math.min(item.quantity, remaining.get(item.key) ?? 0)
    remaining.set(item.key, (remaining.get(item.key) ?? 0) - used)
    return item.quantity > used ? [{ ...item, quantity: item.quantity - used }] : []
  }))
}
