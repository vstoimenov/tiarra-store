/**
 * Emits an idempotent SQL batch for the live catalog without needing a database password.
 * Images retain their original public CDN URLs; the normal importer can later copy them to
 * Supabase Storage after those bootstrap rows are cleared or migrated.
 *
 * Usage: pnpm tsx scripts/import/export-bootstrap-sql.ts <start> <count>
 */
import { detectBrand, detectGender } from './brand'
import { fetchLive, liveProductUrls } from './fetch-live'
import { parsePerfumeNotes } from './perfume'
import { parseProductPage } from './parse-product'

const start = Number(process.argv[2] ?? 0)
const count = Number(process.argv[3] ?? 10)
if (!Number.isInteger(start) || start < 0 || !Number.isInteger(count) || count < 1) {
  throw new Error('start must be 0 or more and count must be 1 or more')
}

function text(value: string): string {
  const encoded = Buffer.from(value).toString('base64')
  return `convert_from(decode('${encoded}', 'base64'), 'utf8')`
}

function nullable(value: string | null): string {
  return value === null ? 'null' : text(value)
}

function number(value: number | null): string {
  return value === null ? 'null' : String(value)
}

const urls = (await liveProductUrls()).slice(start, start + count)
let sql = 'begin;\n'

for (const url of urls) {
  const product = parseProductPage(await fetchLive(url))
  const brand = detectBrand(product.title)
  const gender = detectGender(product.categories.map((category) => category.slug), brand)
  const perfume = parsePerfumeNotes(product.descriptionHtml)
  const variants = [...new Map(product.variants.map((variant) => [variant.name, variant])).values()]
  const cheapest = variants.length
    ? variants.reduce((best, variant) => variant.price < best.price ? variant : best)
    : product

  for (const category of product.categories) {
    sql += `insert into store.categories (legacy_id,slug,name) values (${category.legacyId},${text(category.slug)},${text(category.name)}) on conflict (legacy_id) do update set slug=excluded.slug,name=excluded.name;\n`
  }

  sql += 'insert into store.products (legacy_id,slug,title,brand,gender,description_html,price,compare_at_price,stock,option_name,perfume,seo_description,created_at,updated_at) values ('
  sql += `${product.legacyId},${text(product.slug)},${text(product.title)},${nullable(brand)},${text(gender)},${text(product.descriptionHtml)},${cheapest.price},${number(cheapest.compareAtPrice)},${number(cheapest.stock)},${nullable(product.optionName)},${perfume ? `${text(JSON.stringify(perfume))}::jsonb` : 'null'},${text(product.seoDescription)},timestamptz '2020-01-01 00:00:00+00' + make_interval(secs => ${product.legacyId}::float8),now()) `
  sql += 'on conflict (legacy_id) do update set slug=excluded.slug,title=excluded.title,brand=excluded.brand,gender=excluded.gender,description_html=excluded.description_html,price=excluded.price,compare_at_price=excluded.compare_at_price,stock=excluded.stock,option_name=excluded.option_name,perfume=excluded.perfume,seo_description=excluded.seo_description,updated_at=now();\n'

  sql += `delete from store.product_categories where product_id=(select id from store.products where legacy_id=${product.legacyId});\n`
  for (const category of product.categories) {
    sql += `insert into store.product_categories (product_id,category_id) select p.id,c.id from store.products p,store.categories c where p.legacy_id=${product.legacyId} and c.legacy_id=${category.legacyId} on conflict do nothing;\n`
  }

  sql += `delete from store.product_images where product_id=(select id from store.products where legacy_id=${product.legacyId});\n`
  product.images.forEach((image, position) => {
    sql += `insert into store.product_images (product_id,source_key,path,width,height,alt,position) select id,${text(image.sourceUrl)},${text(image.sourceUrl)},800,800,${text(image.alt)},${position} from store.products where legacy_id=${product.legacyId};\n`
  })

  sql += `delete from store.variants where product_id=(select id from store.products where legacy_id=${product.legacyId});\n`
  variants.forEach((variant, position) => {
    sql += `insert into store.variants (product_id,name,price,compare_at_price,stock,sku,image_path,position) select id,${text(variant.name)},${variant.price},${number(variant.compareAtPrice)},${number(variant.stock)},${text(variant.sku)},${nullable(variant.imageSourceUrl)},${position} from store.products where legacy_id=${product.legacyId};\n`
  })
}

sql += 'commit;'
process.stdout.write(sql)
