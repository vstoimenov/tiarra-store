import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { HomeDocSchema, type HomeDoc } from '@/lib/sections/schema'
import { NavigationSchema, SettingsSchema, type Navigation, type Settings } from './schema'

// The three editable site documents live in `store.site_documents` (published + draft).
// The storefront only ever reads `published`.

export interface SiteDocuments {
  home: HomeDoc
  settings: Settings
  navigation: Navigation
}
export type SiteDocumentKey = keyof SiteDocuments

const SCHEMAS: { [K in SiteDocumentKey]: z.ZodType<SiteDocuments[K]> } = {
  home: HomeDocSchema,
  settings: SettingsSchema,
  navigation: NavigationSchema,
}
const KEYS = Object.keys(SCHEMAS) as SiteDocumentKey[]

/**
 * The published document, parsed. Not cached and free of Next, so scripts and tests can call it.
 * A missing or invalid document throws with its key in the message: rendering a page from a
 * half-valid document would be worse than failing the build or the revalidation.
 */
export async function readSiteDocument<K extends SiteDocumentKey>(key: K): Promise<SiteDocuments[K]> {
  const rows = await sql<{ published: unknown }[]>`
    select published from store.site_documents where key = ${key}`
  if (rows.length === 0) throw new Error(`Site document "${key}" is missing; run pnpm seed:site`)

  const parsed = SCHEMAS[key].safeParse(rows[0].published)
  if (!parsed.success) {
    throw new Error(`Site document "${key}" is invalid:\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}

// One cached reader per key. The only invalidation is `revalidateTag('site')` (called when the
// admin publishes); there is deliberately no time-based revalidate here.
// `unstable_cache` needs a Next request or build context and throws without one, so call
// `getSiteDocument` from app code only, and `readSiteDocument` from scripts and tests.
const cachedReaders = Object.fromEntries(
  // Bump the cache namespace when the parsed document shape changes. Otherwise a deployment can
  // receive a value serialized by the previous schema (for example a home document without theme).
  KEYS.map((key) => [key, unstable_cache(() => readSiteDocument(key), ['site-document-v2', key], { tags: ['site'] })]),
) as { [K in SiteDocumentKey]: () => Promise<SiteDocuments[K]> }

export function getSiteDocument<K extends SiteDocumentKey>(key: K): Promise<SiteDocuments[K]> {
  return cachedReaders[key]()
}
