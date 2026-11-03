export const CART_STORAGE_KEY = 'tiarra-cart-v1'
export const CART_UPDATED_EVENT = 'tiarra-cart-updated'

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
}

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return []

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
        Number.isFinite(entry.unitPrice) &&
        typeof entry.quantity === 'number' &&
        Number.isInteger(entry.quantity) &&
        entry.quantity > 0
      )
    })
  } catch {
    return []
  }
}

export function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
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
