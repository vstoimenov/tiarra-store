import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { sql } from '@/lib/db'
import { getPage } from '@/lib/site/pages'
import { assertTestDatabase } from './test-db'

beforeEach(async () => {
  assertTestDatabase(process.env.DATABASE_URL)
  await sql`truncate store.pages`
})
afterAll(() => sql.end())

describe('getPage', () => {
  it('returns the page with its title, html and description', async () => {
    await sql`
      insert into store.pages (slug, title, body_html, seo_description)
      values ('kontakti', 'Контакти', '<p>Телефон</p>', 'Свържи се с нас.')`

    expect(await getPage('kontakti')).toEqual({
      slug: 'kontakti',
      title: 'Контакти',
      bodyHtml: '<p>Телефон</p>',
      seoDescription: 'Свържи се с нас.',
    })
  })

  it('returns null for a page that does not exist', async () => {
    expect(await getPage('missing')).toBeNull()
  })
})
