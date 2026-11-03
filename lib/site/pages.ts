import { sql } from '@/lib/db'

/**
 * The legal pages, which live at the top level (`/obshti-usloviya`). `store.pages` also holds
 * `za-nas` and `kontakti`, but those have their own addresses under /promo, so this list, not the
 * table, decides which slugs the `[page]` route builds.
 */
export const LEGAL_PAGE_SLUGS = [
  'obshti-usloviya',
  'dostavka-plashtane',
  'vrashtane-zamyana',
  'poveritelnost',
  'biskvitki',
] as const

export interface ContentPage {
  slug: string
  title: string
  bodyHtml: string
  seoDescription: string
}

export async function getPage(slug: string): Promise<ContentPage | null> {
  const rows = await sql<{ slug: string; title: string; body_html: string; seo_description: string }[]>`
    select slug, title, body_html, seo_description from store.pages where slug = ${slug}`
  const row = rows[0]
  return row ? { slug: row.slug, title: row.title, bodyHtml: row.body_html, seoDescription: row.seo_description } : null
}
