import type { Gender, Perfume, ProductCard } from '@/lib/catalog/types'

export type QuizProduct = ProductCard & { id: string; perfume: Perfume | null; descriptionNotes?: string[] }
export type Family = 'fruity' | 'floral' | 'fresh' | 'sweet' | 'spicy' | 'woody' | 'amber' | 'musky'
export type Occasion = 'daily' | 'special' | 'both'
export type Intensity = 'light' | 'balanced' | 'strong'
export type QuizAnswers = { gender: Gender | 'any'; families: Family[]; maxPrice: number | null; occasion?: Occasion; intensity?: Intensity; notes?: string[] }
export type Preferences = Pick<QuizAnswers, 'occasion' | 'intensity' | 'notes'>

/** Display scale only; raw scores remain the basis for ranking. */
export function displayMatchPercent(score: number): number {
  return 76 + Math.round(Math.min(100, Math.max(0, score)) * 24 / 100)
}

// Recognize note names, not product names or shared descriptions that can describe other aromas.
const terms: Record<Family, string[]> = {
  fruity: ['прасков', 'круш', 'касис', 'малин', 'ягод', 'ябъл', 'череш', 'слив', 'ананас', 'манго', 'кайси', 'пъпеш', 'къпин', 'мараку', 'смокин', 'плодов', 'плодове', 'peach', 'pear', 'berry', 'apple', 'fruit', 'plum', 'apricot', 'melon', 'fig'],
  floral: ['роза', 'рози', 'розова вода', 'розов цвят', 'жасмин', 'тубероз', 'лили', 'момина сълза', 'ирис', 'божур', 'виолет', 'теменуж', 'лавандул', 'цвет', 'цвят', 'нероли', 'магнол', 'фрези', 'орхиде', 'гардени', 'иланг', 'хелиотроп', 'rose', 'jasmine', 'floral', 'iris', 'violet', 'peony', 'neroli', 'magnolia', 'orchid', 'tuberose'],
  fresh: ['цитрус', 'лимон', 'лайм', 'бергамот', 'портокал', 'грейпфрут', 'мандарин', 'морск', 'водни', 'мент', 'зелен', 'водорасл', 'петигрен', 'citrus', 'lemon', 'lime', 'bergamot', 'orange', 'aquatic', 'marine', 'mint', 'grapefruit', 'mandarin'],
  sweet: ['ванил', 'карамел', 'кафе', 'шоколад', 'какао', 'мед', 'кокос', 'тонка', 'пралине', 'бадем', 'захар', 'лактон', 'кумарин', 'vanilla', 'caramel', 'coffee', 'chocolate', 'cocoa', 'coconut', 'tonka', 'praline', 'almond', 'honey'],
  spicy: ['кож', 'тютюн', 'тамян', 'пипер', 'канел', 'кардамон', 'шафран', 'джинджифил', 'подправ', 'индийско орехче', 'leather', 'tobacco', 'incense', 'pepper', 'cinnamon', 'cardamom', 'spicy', 'saffron', 'ginger'],
  woody: ['кедър', 'кедров', 'сандал', 'пачули', 'ветивер', 'дървес', 'дървет', 'дърво', 'мъх', 'бор', 'кипарис', 'кашмеран', 'пало санто', 'cedar', 'sandal', 'patchouli', 'vetiver', 'oud', 'wood', 'rosewood', 'moss', 'cypress'],
  amber: ['амбра', 'амбър', 'бензоин', 'лабданум', 'стиракс', 'amber', 'benzoin', 'labdanum'],
  musky: ['мускус', 'амброксан', 'musk', 'ambroxan'],
}
const familyKeys = Object.keys(terms) as Family[]
const compiled = Object.fromEntries(familyKeys.map(family => [family, terms[family].map(term => new RegExp(`(?:^|[^\\p{L}])${term}`, 'u'))])) as Record<Family, RegExp[]>

/** One note can belong to several families, but a blossom is not citrus fruit. */
function familiesForNote(note: string): Family[] {
  const text = note.toLocaleLowerCase('bg')
  const withoutBlossom = text.replace(/(?:портокалов\p{L}*\s+цвят|orange\s+blossom)/gu, '')
  return familyKeys.filter(family => !(family === 'floral' && /\brosewood\b/u.test(text)) && compiled[family].some(pattern => pattern.test(family === 'fresh' ? withoutBlossom : text)))
}

const noteKey = (value: string) => value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('bg')
function perfumeNotes(perfume: Perfume | null, descriptionNotes: string[] = []): string[] {
  return [...[perfume?.top, perfume?.heart, perfume?.base].flatMap(text => (text ?? '').split(/[,;\n•]+/u)), ...descriptionNotes].map(noteKey).filter(Boolean)
}

export type CatalogNote = { value: string; count: number }
/** Only notes actually entered for available, relevant perfumes appear in the quiz. */
export function catalogNotesByFamily(products: QuizProduct[], gender: Gender | 'any'): Record<Family, CatalogNote[]> {
  const notes = Object.fromEntries(familyKeys.map(family => [family, new Map<string, number>()])) as Record<Family, Map<string, number>>
  for (const product of products) {
    if (!product.inStock || !isWearablePerfume(product) || (gender !== 'any' && product.gender !== gender && product.gender !== 'unisex')) continue
    for (const note of new Set(perfumeNotes(product.perfume, product.descriptionNotes))) {
      if (note.length > 80) continue
      for (const family of familiesForNote(note)) notes[family].set(note, (notes[family].get(note) ?? 0) + 1)
    }
  }
  return Object.fromEntries(familyKeys.map(family => [family, [...notes[family]].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'bg'))])) as Record<Family, CatalogNote[]>
}

function profile(perfume: Perfume | null, descriptionNotes: string[] = []): Record<Family, number> {
  const scores: Record<Family, number> = { fruity: 0, floral: 0, fresh: 0, sweet: 0, spicy: 0, woody: 0, amber: 0, musky: 0 }
  let total = 0
  for (const [text, weight] of [[perfume?.top, 1], [perfume?.heart, 2], [perfume?.base, 2], [descriptionNotes.join(', '), 1]] as const) {
    for (const note of (text ?? '').split(/[,;\n•]+/u).map(value => value.trim()).filter(Boolean)) {
      const matches = familiesForNote(note)
      total += weight
      for (const family of matches) scores[family] += weight
    }
  }
  if (total) for (const family of familyKeys) scores[family] /= total
  return scores
}

export function hasFragranceNotes(perfume: Perfume | null, descriptionNotes: string[] = []): boolean {
  return Boolean(descriptionNotes.length || (perfume && [perfume.top, perfume.heart, perfume.base].some(value => value?.trim())))
}

/** A transparent heuristic, not a scientific prediction of how a fragrance smells on skin. */
export function preferenceFactor(perfume: Perfume | null, preferences: Preferences = {}): number {
  let factor = 1
  if (preferences.occasion && preferences.occasion !== 'both' && perfume?.occasion && perfume.occasion !== 'both' && perfume.occasion !== preferences.occasion) factor *= 0.8
  if (preferences.intensity && perfume?.intensity && preferences.intensity !== perfume.intensity) {
    factor *= preferences.intensity === 'balanced' || perfume.intensity === 'balanced' ? 0.9 : 0.75
  }
  return factor
}

export function noteMatchPercent(perfume: Perfume | null, selected: Family[], preferences: Preferences = {}, descriptionNotes: string[] = []): number | null {
  if (!selected.length || !hasFragranceNotes(perfume, descriptionNotes)) return null
  const scores = profile(perfume, descriptionNotes)
  const matched = selected.filter(family => scores[family] > 0)
  if (!matched.length) return null
  const coverage = matched.length / selected.length
  const intensity = Math.min(1, matched.reduce((sum, family) => sum + scores[family], 0) / selected.length)
  let score = 100 * coverage * (0.5 + 0.5 * intensity)
  if (preferences.notes?.length) {
    const present = new Set(perfumeNotes(perfume, descriptionNotes))
    const exact = preferences.notes.filter(note => present.has(noteKey(note))).length / preferences.notes.length
    score = 0.5 * score + 50 * exact
  }
  return Math.round(score * preferenceFactor(perfume, preferences))
}

export function matchingFamilies(perfume: Perfume | null, descriptionNotes: string[] = []): Family[] {
  const scores = profile(perfume, descriptionNotes)
  return familyKeys.filter(family => scores[family] > 0)
}

/** The source category also contains accessories, aftershaves, hair and beard products. */
export function isWearablePerfume(product: QuizProduct): boolean {
  const title = product.title.toLocaleLowerCase('bg')
  if (/(?:кейс|калъф|калъв|аксесоар|флакон за парфюм|кутия за парфюм|подаръчн\p{L}* комплект|за брада|за коса|брада|дезодорант|афтършейв|след бръснене|спрей за тяло|мист за тяло|body\s*mist|body\s*spray|after\s*shave|aftershave|deodorant|beard|mustache|hair\s*parf|hair\s*perf|shower|душ гел|лосьон за тяло)/iu.test(title)) return false
  return /(?:парфюм|parf[uy]m|perfume|\bedp\b|\bedt\b|olfazeta\s+by\s+chogan)/iu.test(title) || Boolean(product.descriptionNotes?.length || (product.perfume && [product.perfume.top, product.perfume.heart, product.perfume.base].some(Boolean)))
}

function eligibleProducts(products: QuizProduct[], answers: QuizAnswers): QuizProduct[] {
  return products.filter(product => product.inStock && isWearablePerfume(product) &&
    (answers.gender === 'any' || product.gender === answers.gender || product.gender === 'unisex') &&
    (answers.maxPrice === null || product.price <= answers.maxPrice))
}

export function recommendPerfumes(products: QuizProduct[], answers: QuizAnswers): QuizProduct[] {
  return eligibleProducts(products, answers)
    .map(product => {
      const scores = profile(product.perfume, product.descriptionNotes)
      const matched = answers.families.filter(family => scores[family] > 0)
      return { product, matches: matched.length, strength: (noteMatchPercent(product.perfume, answers.families, answers, product.descriptionNotes) ?? 0) }
    })
    .filter(({ matches }) => answers.families.length === 0 || matches > 0)
    .sort((a, b) => b.strength - a.strength || b.matches - a.matches || b.product.createdAt.localeCompare(a.product.createdAt) || a.product.slug.localeCompare(b.product.slug))
    .map(({ product }) => product)
}

// Weaker, neighbouring fragrance families are presented separately from direct matches.
const neighbours: Record<Family, Partial<Record<Family, number>>> = {
  fruity: { floral: 0.55, fresh: 0.5, sweet: 0.45 },
  floral: { fruity: 0.55, fresh: 0.4, sweet: 0.4, musky: 0.3 },
  fresh: { fruity: 0.5, floral: 0.4, woody: 0.35, musky: 0.3 },
  sweet: { fruity: 0.45, floral: 0.4, spicy: 0.45, woody: 0.3, amber: 0.5 },
  spicy: { woody: 0.6, sweet: 0.45, floral: 0.25, amber: 0.55 },
  woody: { spicy: 0.6, fresh: 0.35, sweet: 0.3, amber: 0.5, musky: 0.3 },
  amber: { woody: 0.5, spicy: 0.55, sweet: 0.5, musky: 0.4 },
  musky: { floral: 0.3, fresh: 0.3, woody: 0.3, amber: 0.4 },
}

export function recommendRelatedPerfumes(products: QuizProduct[], answers: QuizAnswers): { product: QuizProduct; percent: number }[] {
  if (!answers.families.length) return []
  return eligibleProducts(products, answers)
    .flatMap(product => {
      if (noteMatchPercent(product.perfume, answers.families, {}, product.descriptionNotes) !== null) return []
      const scores = profile(product.perfume, product.descriptionNotes)
      const affinity = answers.families.reduce((sum, selected) => sum + Math.max(0, ...familyKeys.map(family => (neighbours[selected][family] ?? 0) * scores[family])), 0) / answers.families.length
      return affinity > 0 ? [{ product, percent: Math.max(1, Math.round(10 * affinity * preferenceFactor(product.perfume, answers))) }] : []
    })
    .sort((a, b) => b.percent - a.percent || b.product.createdAt.localeCompare(a.product.createdAt) || a.product.slug.localeCompare(b.product.slug))
}

/** Last resort: eligible perfumes with no reliable note-based comparison, without a fabricated score. */
export function recommendFallbackPerfumes(products: QuizProduct[], answers: QuizAnswers, excludedIds: string[]): QuizProduct[] {
  const excluded = new Set(excludedIds)
  return eligibleProducts(products, answers).filter(product => !excluded.has(product.id))
    .map(product => ({ product, factor: preferenceFactor(product.perfume, answers), known: Number(Boolean(product.perfume?.occasion)) + Number(Boolean(product.perfume?.intensity)) }))
    .sort((a, b) => b.factor - a.factor || b.known - a.known || b.product.createdAt.localeCompare(a.product.createdAt) || a.product.slug.localeCompare(b.product.slug))
    .map(({ product }) => product)
}
