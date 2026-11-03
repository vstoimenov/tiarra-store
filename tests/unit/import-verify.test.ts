import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseProductPage } from '@/scripts/import/parse-product'
import type { ParsedProduct } from '@/scripts/import/types'
import { diffProduct, type DbProduct } from '@/scripts/import/verify'

function fixture(name: string): ParsedProduct {
  return parseProductPage(readFileSync(new URL(`../fixtures/product-${name}.html`, import.meta.url), 'utf8'))
}

/** What the database holds after a faithful import of `p`. */
function dbCopy(p: ParsedProduct): DbProduct {
  return {
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    stock: p.stock,
    variants: p.variants.map((v) => ({ name: v.name, price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock })),
  }
}

describe('diffProduct', () => {
  it('finds nothing when the database matches the live page', () => {
    expect(diffProduct(fixture('yodeyma'), dbCopy(fixture('yodeyma')))).toEqual([])
    expect(diffProduct(fixture('redone'), dbCopy(fixture('redone')))).toEqual([])
  })

  it('reports a changed variant price, compare-at price and stock', () => {
    const live = fixture('yodeyma')
    const db = dbCopy(live)
    db.variants[1] = { ...db.variants[1], price: 30, compareAtPrice: 40, stock: 99 }

    const diffs = diffProduct(live, db)

    expect(diffs).toHaveLength(3)
    expect(diffs.every((d) => d.includes(live.slug) && d.includes(live.variants[1].name))).toBe(true)
    expect(diffs.join('\n')).toMatch(/price/)
    expect(diffs.join('\n')).toMatch(/compare-at/)
    expect(diffs.join('\n')).toMatch(/stock/)
  })

  it('tells null stock (not tracked) apart from 0', () => {
    const live = fixture('yodeyma')
    const db = dbCopy(live)
    db.variants[3] = { ...db.variants[3], stock: null }

    expect(live.variants[3].stock).toBe(0)
    expect(diffProduct(live, db)).toHaveLength(1)
  })

  it('reports a variant that is missing from, or extra in, the database', () => {
    const live = fixture('yodeyma')
    const db = dbCopy(live)
    const removed = db.variants.pop()!
    db.variants.push({ name: 'GHOST', price: 1, compareAtPrice: null, stock: null })

    const diffs = diffProduct(live, db)

    expect(diffs).toHaveLength(2)
    expect(diffs.join('\n')).toContain(removed.name)
    expect(diffs.join('\n')).toContain('GHOST')
  })

  it('compares the product row itself when the product has no variants', () => {
    const live = fixture('redone')
    const db = { ...dbCopy(live), price: 8.9, stock: 0 }

    expect(diffProduct(live, db)).toHaveLength(2)
  })

  it('does not compare the product row when variants exist (it holds the cheapest variant)', () => {
    const live = fixture('yodeyma')
    const db = { ...dbCopy(live), price: 1, stock: 500 }

    expect(diffProduct(live, db)).toEqual([])
  })

  it('reports a product that is not in the database', () => {
    const live = fixture('redone')

    expect(diffProduct(live, undefined)).toEqual([`${live.slug}: missing in the database`])
  })
})
