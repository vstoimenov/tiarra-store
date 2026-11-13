import type { Gender, Perfume, ProductCard } from '@/lib/catalog/types'

export type QuizProduct = ProductCard & { id: string; perfume: Perfume | null }
export type Family = 'fruity' | 'floral' | 'fresh' | 'sweet' | 'spicy' | 'woody'
export type QuizAnswers = { gender: Gender | 'any'; families: Family[]; maxPrice: number | null }

// Only the structured notes are used: inherited descriptions can contain other perfumes.
const terms: Record<Family, string[]> = {
  fruity: ['прасков', 'круш', 'касис', 'малин', 'ягод', 'ябъл', 'череш', 'слив', 'ананас', 'манго', 'плодов', 'peach', 'pear', 'berry', 'apple', 'fruit'],
  floral: ['роз', 'жасмин', 'тубероз', 'лили', 'ирис', 'божур', 'виолет', 'лавандул', 'цвет', 'rose', 'jasmine', 'floral', 'iris', 'violet', 'peony'],
  fresh: ['цитрус', 'лимон', 'бергамот', 'портокал', 'грейпфрут', 'мандарин', 'морск', 'водни', 'мент', 'зелен', 'citrus', 'lemon', 'bergamot', 'orange', 'aquatic', 'marine', 'mint'],
  sweet: ['ванил', 'карамел', 'кафе', 'шоколад', 'мед', 'кокос', 'тонка', 'пралине', 'ванилия', 'vanilla', 'caramel', 'coffee', 'chocolate', 'coconut', 'tonka', 'praline'],
  spicy: ['кож', 'тютюн', 'тамян', 'пипер', 'канел', 'кардамон', 'шафран', 'джинджифил', 'подправ', 'leather', 'tobacco', 'incense', 'pepper', 'cinnamon', 'cardamom', 'spicy'],
  woody: ['кедър', 'кедров', 'сандал', 'пачули', 'ветивер', 'дървес', 'мъх', 'cedar', 'sandal', 'patchouli', 'vetiver', 'oud', 'wood', 'moss'],
}

export function matchingFamilies(perfume: Perfume | null): Family[] {
  if (!perfume) return []
  const notes = [perfume.top, perfume.heart, perfume.base].filter(Boolean).join(' ').toLocaleLowerCase('bg')
  return (Object.keys(terms) as Family[]).filter((family) => terms[family].some((term) => new RegExp(`(?:^|[^\\p{L}])${term}`, 'u').test(notes)))
}

export function recommendPerfumes(products: QuizProduct[], answers: QuizAnswers): QuizProduct[] {
  return products.filter((product) => product.inStock &&
    (answers.gender === 'any' || product.gender === answers.gender || product.gender === 'unisex') &&
    (answers.maxPrice === null || product.price <= answers.maxPrice))
    .map((product) => ({ product, score: matchingFamilies(product.perfume).filter((family) => answers.families.includes(family)).length }))
    .filter(({ score }) => answers.families.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score || b.product.createdAt.localeCompare(a.product.createdAt))
    .map(({ product }) => product)
}
