import { readFileSync } from 'node:fs'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { sql } from '@/lib/db'
import { readSiteDocument } from '@/lib/site/documents'
import { assertTestDatabase } from './test-db'

const seed = (name: string): object =>
  JSON.parse(readFileSync(new URL(`../../seed/${name}.json`, import.meta.url), 'utf8'))

async function put(key: string, published: object): Promise<void> {
  await sql`
    insert into store.site_documents (key, published)
    values (${key}, ${sql.json(published as never)})
    on conflict (key) do update set published = excluded.published`
}

beforeEach(async () => {
  assertTestDatabase(process.env.DATABASE_URL)
  await sql`truncate store.site_documents`
})
afterAll(() => sql.end())

describe('readSiteDocument', () => {
  it('returns the published settings, parsed', async () => {
    await put('settings', seed('settings'))

    const settings = await readSiteDocument('settings')

    expect(settings.company.eik).toBe('204275889')
    expect(settings.freeShippingThreshold).toBe(39)
  })

  it('returns the published home document with its sections', async () => {
    await put('home', seed('home'))

    const home = await readSiteDocument('home')

    expect(home.sections).toHaveLength(10)
  })

  it('ignores the draft', async () => {
    await put('navigation', seed('navigation'))
    await sql`update store.site_documents set draft = ${sql.json({ menu: [], footer: [] })} where key = 'navigation'`

    const nav = await readSiteDocument('navigation')

    expect(nav.menu).toHaveLength(7)
  })

  it('says which document is missing and how to create it', async () => {
    await expect(readSiteDocument('home')).rejects.toThrow(/"home".*missing.*seed:site/s)
  })

  it('says which document is invalid', async () => {
    await put('settings', { topbarMessages: 'not a list' })

    await expect(readSiteDocument('settings')).rejects.toThrow(/"settings".*invalid/s)
  })
})
