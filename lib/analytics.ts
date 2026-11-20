import { normalizeMetaContext, metaPurchaseEventId, type MetaContext } from '@/lib/meta-context'
export type CommerceItem = { item_id: string; item_name: string; price: number; quantity: number; item_variant?: string }

declare global {
  interface Window {
    dataLayer?: unknown[]
    fbq?: (...args: unknown[]) => void
  }
}

export function analyticsAllowed() {
  try { return typeof window !== 'undefined' && window.localStorage.getItem('tiarra-consent-v1') === 'accepted' }
  catch { return false }
}

export function trackCommerce(event: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase', data: { currency: 'EUR'; value: number; items: CommerceItem[]; transaction_id?: string }) {
  if (!analyticsAllowed()) return
  try {
  window.dataLayer?.push({ event, ecommerce: data })
  const metaEvent = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase' }[event]
  window.fbq?.('track', metaEvent, { value: data.value, currency: data.currency, content_ids: data.items.map((item) => item.item_id), contents: data.items.map((item) => ({ id: item.item_id, quantity: item.quantity, item_price: item.price })) }, data.transaction_id ? { eventID: metaPurchaseEventId(data.transaction_id) } : undefined)
  } catch { /* Third-party tracking must not interrupt shopping. */ }
}

function metaCookie(name: string) {
 try { return decodeURIComponent(document.cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))?.slice(name.length+1)??'') }
 catch { return '' }
}
/** Called only once advertising consent has been accepted. */
export function captureMetaClick() {
 if (!analyticsAllowed()) return
 try {
  const click = new URL(window.location.href).searchParams.get('fbclid')
  if (!click || !/^[A-Za-z0-9_-]{1,800}$/.test(click) || metaCookie('_fbc').endsWith('.'+click)) return
  document.cookie=`_fbc=${encodeURIComponent(`fb.1.${Date.now()}.${click}`)}; Max-Age=7776000; Path=/; SameSite=Lax; Secure`
 } catch { /* Optional attribution must not interrupt shopping. */ }
}
export function metaCheckoutContext(): MetaContext {
 if (!analyticsAllowed()) return { consent: false }
 captureMetaClick()
 return normalizeMetaContext({ consent: true, fbp: metaCookie('_fbp'), fbc: metaCookie('_fbc') })
}
