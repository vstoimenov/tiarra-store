// Writes the starting site content (pnpm seed:site): the homepage, settings and navigation
// documents, the 7 content pages, and the site images (hero, logo, offer, about).
//
//   pnpm seed:site                            (reads .env.local)
//   ENV_FILE=.env.production.local pnpm seed:site
//
// Everything is validated before anything is written, and the database writes happen in one
// transaction. It overwrites the published documents and pages with the files in seed/, so it
// is for first setup only: do not run it once an admin has edited the content.
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import type postgres from 'postgres'
import { sql } from '../lib/db'
import { HomeDocSchema } from '../lib/sections/schema'
import { NavigationSchema, SettingsSchema } from '../lib/site/schema'
import { importImage } from './import/images'

const SEED = new URL('../seed/', import.meta.url)

const ImagesSchema = z.array(z.object({ path: z.string().min(1), url: z.url() }))
const PagesSchema = z.array(
  z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    seoDescription: z.string().min(1),
  }),
)

function readText(path: string): string {
  return readFileSync(new URL(path, SEED), 'utf8')
}

/** Parses one seed file; the error names the file and every bad field. */
function load<S extends z.ZodType>(file: string, schema: S): z.output<S> {
  const parsed = schema.safeParse(JSON.parse(readText(file)))
  if (!parsed.success) throw new Error(`seed/${file} is invalid:\n${z.prettifyError(parsed.error)}`)
  return parsed.data
}

async function main(): Promise<void> {
  // 1. Validate everything first.
  const documents = {
    home: load('home.json', HomeDocSchema),
    settings: load('settings.json', SettingsSchema),
    navigation: load('navigation.json', NavigationSchema),
  }
  const images = load('images.json', ImagesSchema)
  const pages = load('pages.json', PagesSchema).map((page) => ({
    ...page,
    bodyHtml: readText(`pages/${page.slug}.html`).trim(),
  }))

  // 2. Images go to storage first, so a page never points at an image that is not there.
  for (const { path, url } of images) {
    const { width, height } = await importImage(url, path)
    console.log(`image ${path}: ${width}x${height}`)
  }

  // 3. Documents and pages, all or nothing. Inside begin() only the `tx` handle may be used.
  await sql.begin(async (tx) => {
    for (const [key, doc] of Object.entries(documents)) {
      await tx`
        insert into store.site_documents (key, published, updated_at)
        values (${key}, ${tx.json(doc as unknown as postgres.JSONValue)}, now())
        on conflict (key) do update set published = excluded.published, updated_at = now()`
    }
    for (const page of pages) {
      await tx`
        insert into store.pages (slug, title, body_html, seo_description, updated_at)
        values (${page.slug}, ${page.title}, ${page.bodyHtml}, ${page.seoDescription}, now())
        on conflict (slug) do update set
          title = excluded.title,
          body_html = excluded.body_html,
          seo_description = excluded.seo_description,
          updated_at = now()`
    }
  })

  console.log(`${Object.keys(documents).join(', ')}, ${pages.length} pages written`)
  await sql.end()
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error)
  await sql.end({ timeout: 1 }).catch(() => {})
  process.exit(1)
})
