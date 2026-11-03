import { sanitizeDescription } from './sanitize'
import type { ParsedCategory, ParsedProduct, ParsedVariant } from './types'

interface RawImage {
  name: string
  base: string
}

interface RawPrice {
  price: number
  salePrice: number
  onSale: boolean
  quantity?: number | null
}

interface RawProduct extends RawPrice {
  id: number
  url: string
  title: string
  description?: { text?: string }
  seoDescription?: string
  images?: RawImage[]
  categories?: { id: number; name: string; url: string }[]
  variations?: { name: string; images?: Record<string, RawImage[]> }[]
  combinations?: (RawPrice & { name: string; sku?: string })[]
}

// The page also holds other `props = {…}` JS literals that are not JSON; only this call carries the product.
const RENDER_CALL = /WebPlatform\.Store\.renderProduct\(\s*root\.find\(\s*'\.product-wrapper'\s*\)\s*,\s*/

/** Returns the `{…}` that starts at `start`; braces and quotes inside JSON strings do not count. */
function balancedObject(text: string, start: number): string {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1)
  }
  throw new Error('Product JSON is not closed: no matching "}" after renderProduct(')
}

function extractProductJson(html: string): RawProduct {
  const call = RENDER_CALL.exec(html)
  if (!call) throw new Error('No WebPlatform.Store.renderProduct(root.find(\'.product-wrapper\'), …) call in the page')
  const start = call.index + call[0].length
  if (html[start] !== '{') throw new Error('renderProduct is not followed by a JSON object')
  return JSON.parse(balancedObject(html, start)) as RawProduct
}

function imageUrl(image: RawImage): string {
  const path = image.name.split('/').map(encodeURIComponent).join('/')
  return `https://content.app-sources.com/${image.base}uploads/${path}`
}

/** On sale, `salePrice` is what the customer pays and `price` becomes the crossed-out old price. */
function mapPrice(raw: RawPrice): { price: number; compareAtPrice: number | null } {
  return raw.onSale
    ? { price: raw.salePrice, compareAtPrice: raw.price }
    : { price: raw.price, compareAtPrice: null }
}

function mapVariants(raw: RawProduct): ParsedVariant[] {
  // The site keys images by the raw value („NYA “), but the combination names are matched trimmed.
  const imageByValue = new Map(
    Object.entries(raw.variations?.[0]?.images ?? {}).map(([value, images]) => [value.trim(), images[0]]),
  )
  return (raw.combinations ?? []).map((c) => {
    const name = c.name.trim()
    const image = imageByValue.get(name)
    return {
      name,
      ...mapPrice(c),
      stock: c.quantity ?? null,
      sku: (c.sku ?? '').trim(),
      imageSourceUrl: image ? imageUrl(image) : null,
    }
  })
}

function mapCategories(raw: RawProduct): ParsedCategory[] {
  return (raw.categories ?? []).map((c) => ({ legacyId: c.id, slug: c.url.trim(), name: c.name.trim() }))
}

export function parseProductPage(html: string): ParsedProduct {
  const raw = extractProductJson(html)
  const title = raw.title.trim()
  return {
    legacyId: raw.id,
    slug: raw.url.trim(),
    title,
    descriptionHtml: sanitizeDescription(raw.description?.text ?? ''),
    seoDescription: (raw.seoDescription ?? '').trim(),
    ...mapPrice(raw),
    stock: raw.quantity ?? null,
    categories: mapCategories(raw),
    images: (raw.images ?? []).map((image) => ({ sourceUrl: imageUrl(image), alt: title })),
    optionName: raw.variations?.[0]?.name.trim() || null,
    variants: mapVariants(raw),
  }
}
