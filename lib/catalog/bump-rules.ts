import type { Perfume } from './types'

export const PRODUCT_BUMP_LABEL = 'Клиентите също добавят'
type Identity = { title: string; brand?: string | null; perfume?: Perfume | null }
const isChogan = (product: Identity) => /chogan|olfazeta|шоган/iu.test(`${product.brand ?? ''} ${product.title}`)

export function isChoganPerfume(product: Identity): boolean {
  if (!isChogan(product)) return false
  if (/кейс|калъф|калъв|комплект|gift\s*set|аксесоар|body\s*(?:cream|wash|mist|spray)|after\s*shave|aftershave|deodorant|shower|beard/iu.test(product.title)) return false
  if (/(?:^|[^\p{L}])(?:крем|шампоан|балсам|душ|гел|лосьон|сапун|дезодорант|афтършейв)/iu.test(product.title)) return false
  return /парфюм|perfume|parfum|extrait|extract|\bedp\b|\bedt\b/iu.test(product.title)
    || Boolean([product.perfume?.top, product.perfume?.heart, product.perfume?.base].some(note => note?.trim()))
}

export function isChogan15MlCase(product: Identity): boolean {
  return isChogan(product) && /кейс|калъф|калъв|\bcase\b/iu.test(product.title)
    && /(?:^|[^\d])15\s*(?:мл|ml)(?:$|[^\p{L}\p{N}])/iu.test(product.title)
}
