import type { Gender, Perfume, ProductCard } from '@/lib/catalog/types'

export type QuizProduct = ProductCard & { id: string; perfume: Perfume | null }
export type Family = 'fruity' | 'floral' | 'fresh' | 'sweet' | 'spicy' | 'woody'
export type QuizAnswers = { gender: Gender | 'any'; families: Family[]; maxPrice: number | null }

// Recognize note names, not product names or shared descriptions that can describe other aromas.
const terms: Record<Family, string[]> = {
  fruity: ['прасков', 'круш', 'касис', 'малин', 'ягод', 'ябъл', 'череш', 'слив', 'ананас', 'манго', 'кайси', 'пъпеш', 'къпин', 'мараку', 'смокин', 'плодов', 'плодове', 'peach', 'pear', 'berry', 'apple', 'fruit', 'plum', 'apricot', 'melon', 'fig'],
  floral: ['роза', 'рози', 'розова вода', 'розов цвят', 'жасмин', 'тубероз', 'лили', 'момина сълза', 'ирис', 'божур', 'виолет', 'теменуж', 'лавандул', 'цвет', 'цвят', 'нероли', 'магнол', 'фрези', 'орхиде', 'гардени', 'иланг', 'хелиотроп', 'rose', 'jasmine', 'floral', 'iris', 'violet', 'peony', 'neroli', 'magnolia', 'orchid', 'tuberose'],
  fresh: ['цитрус', 'лимон', 'лайм', 'бергамот', 'портокал', 'грейпфрут', 'мандарин', 'морск', 'водни', 'мент', 'зелен', 'водорасл', 'петигрен', 'citrus', 'lemon', 'lime', 'bergamot', 'orange', 'aquatic', 'marine', 'mint', 'grapefruit', 'mandarin'],
  sweet: ['ванил', 'карамел', 'кафе', 'шоколад', 'какао', 'мед', 'кокос', 'тонка', 'пралине', 'бадем', 'захар', 'vanilla', 'caramel', 'coffee', 'chocolate', 'cocoa', 'coconut', 'tonka', 'praline', 'almond', 'honey'],
  spicy: ['кож', 'тютюн', 'тамян', 'пипер', 'канел', 'кардамон', 'шафран', 'джинджифил', 'подправ', 'индийско орехче', 'leather', 'tobacco', 'incense', 'pepper', 'cinnamon', 'cardamom', 'spicy', 'saffron', 'ginger'],
  woody: ['кедър', 'кедров', 'сандал', 'пачули', 'ветивер', 'дървес', 'дърво', 'мъх', 'бор', 'кипарис', 'cedar', 'sandal', 'patchouli', 'vetiver', 'oud', 'wood', 'rosewood', 'moss', 'cypress'],
}
const familyKeys = Object.keys(terms) as Family[]
const compiled = Object.fromEntries(familyKeys.map(family => [family, terms[family].map(term => new RegExp(`(?:^|[^\\p{L}])${term}`, 'u'))])) as Record<Family, RegExp[]>

/** One note can belong to several families, but a blossom is not citrus fruit. */
function familiesForNote(note: string): Family[] {
  const text = note.toLocaleLowerCase('bg')
  const withoutBlossom = text.replace(/(?:портокалов\p{L}*\s+цвят|orange\s+blossom)/gu, '')
  return familyKeys.filter(family => !(family === 'floral' && /\brosewood\b/u.test(text)) && compiled[family].some(pattern => pattern.test(family === 'fresh' ? withoutBlossom : text)))
}

function profile(perfume: Perfume | null): Record<Family, number> {
  const scores: Record<Family, number> = { fruity: 0, floral: 0, fresh: 0, sweet: 0, spicy: 0, woody: 0 }
  let total = 0
  for (const [text, weight] of [[perfume?.top, 1], [perfume?.heart, 2], [perfume?.base, 2]] as const) {
    for (const note of (text ?? '').split(/[,;\n•]+/u).map(value => value.trim()).filter(Boolean)) {
      const matches = familiesForNote(note)
      total += weight
      for (const family of matches) scores[family] += weight
    }
  }
  if (total) for (const family of familyKeys) scores[family] /= total
  return scores
}

export function hasFragranceNotes(perfume: Perfume | null): boolean {
  return Boolean(perfume && [perfume.top, perfume.heart, perfume.base].some(value => value?.trim()))
}

/** A transparent heuristic, not a scientific prediction of how a fragrance smells on skin. */
export function noteMatchPercent(perfume: Perfume | null, selected: Family[]): number | null {
  if (!selected.length || !hasFragranceNotes(perfume)) return null
  const scores = profile(perfume)
  const matched = selected.filter(family => scores[family] > 0)
  if (!matched.length) return null
  const coverage = matched.length / selected.length
  const intensity = Math.min(1, matched.reduce((sum, family) => sum + scores[family], 0) / selected.length)
  return Math.round(100 * coverage * (0.5 + 0.5 * intensity))
}

export function matchingFamilies(perfume: Perfume | null): Family[] {
  const scores = profile(perfume)
  return familyKeys.filter(family => scores[family] > 0)
}

/** The source category also contains accessories, aftershaves, hair and beard products. */
export function isWearablePerfume(product: QuizProduct): boolean {
  const title = product.title.toLocaleLowerCase('bg')
  if (/(?:кейс|калъф|калъв|аксесоар|флакон за парфюм|кутия за парфюм|подаръчн\p{L}* комплект|за брада|за коса|брада|дезодорант|афтършейв|след бръснене|спрей за тяло|мист за тяло|body\s*mist|body\s*spray|after\s*shave|aftershave|deodorant|beard|mustache|hair\s*parf|hair\s*perf|shower|душ гел|лосьон за тяло)/iu.test(title)) return false
  return /(?:парфюм|parf[uy]m|perfume|\bedp\b|\bedt\b|olfazeta\s+by\s+chogan)/iu.test(title) || Boolean(product.perfume && [product.perfume.top, product.perfume.heart, product.perfume.base].some(Boolean))
}

export function recommendPerfumes(products: QuizProduct[], answers: QuizAnswers): QuizProduct[] {
  return products.filter(product => product.inStock && isWearablePerfume(product) &&
    (answers.gender === 'any' || product.gender === answers.gender || product.gender === 'unisex') &&
    (answers.maxPrice === null || product.price <= answers.maxPrice))
    .map(product => {
      const scores = profile(product.perfume)
      const matched = answers.families.filter(family => scores[family] > 0)
      return { product, matches: matched.length, strength: matched.reduce((sum, family) => sum + scores[family], 0) }
    })
    .filter(({ matches }) => answers.families.length === 0 || matches > 0)
    .sort((a, b) => b.matches - a.matches || b.strength - a.strength || b.product.createdAt.localeCompare(a.product.createdAt) || a.product.slug.localeCompare(b.product.slug))
    .map(({ product }) => product)
}
