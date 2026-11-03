import type { Gender } from '../../lib/catalog/types'

interface Brand {
  name: string
  /** Matched at the start of the title; spaces inside the pattern are optional. */
  pattern: string
}

// Order matters: the first match wins.
const BRANDS: Brand[] = [
  { name: 'NISH LADY', pattern: 'NISH\\s*LADY' },
  { name: 'NISH MAN', pattern: 'NISH\\s*MAN' },
  { name: 'REUZEL', pattern: 'REUZEL' },
  { name: 'AMERICAN CREW', pattern: 'AMERICAN\\s+CREW' },
  { name: 'STMNT', pattern: 'STMNT' },
  { name: 'DEPOT', pattern: 'DEPOT' },
  { name: 'BARBURYS', pattern: 'BARBURYS' },
  { name: 'YODEYMA', pattern: 'YODEYMA' },
  { name: 'SCHWARZKOPF', pattern: 'SCHWARZKOPF' },
  { name: 'REDONE', pattern: 'REDONE' },
  { name: 'GUMMY', pattern: 'GUMMY' },
  { name: 'IMMORTAL', pattern: 'IMMORTAL' },
  { name: 'PRINCESS', pattern: 'PRINCESS' },
  { name: 'SIEM', pattern: 'SIEM' },
  // The live title is "Ножчета за бръснене - Gillette Platinum, …": the product type comes first.
  { name: 'GILLETTE', pattern: '(?:Ножчета\\s+за\\s+бръснене\\s*[-–—]\\s*)?GILLETTE' },
]

// A brand is a whole word: "Depotx" is not DEPOT.
const MATCHERS = BRANDS.map((b) => ({
  name: b.name,
  re: new RegExp(`^\\s*${b.pattern}(?![\\p{L}\\p{N}])`, 'iu'),
}))

export function detectBrand(title: string): string | null {
  return MATCHERS.find((m) => m.re.test(title))?.name ?? null
}

const FEMALE_BRANDS = ['NISH LADY']
const MALE_BRANDS = ['NISH MAN', 'REUZEL', 'AMERICAN CREW', 'BARBURYS', 'STMNT']

/** Category slugs decide first; the brand only breaks the tie when neither gender category is present. */
export function detectGender(categorySlugs: string[], brand: string | null): Gender {
  const women = categorySlugs.includes('women')
  const men = categorySlugs.includes('men')
  if (women && men) return 'unisex'
  if (women) return 'female'
  if (men) return 'male'
  if (brand && FEMALE_BRANDS.includes(brand)) return 'female'
  if (brand && MALE_BRANDS.includes(brand)) return 'male'
  return 'unisex'
}
