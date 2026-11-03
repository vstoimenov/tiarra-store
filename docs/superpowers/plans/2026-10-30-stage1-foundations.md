# Tiarra Store — Етап 1 „Основи“ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static, fast storefront for tiarracosmetics.com with the current look and the 89 live products, built from our own database and running on a test address that Google does not index.

**Architecture:** Next.js 15 App Router. Every storefront page is generated ahead of time (ISR); visitors never wait on the database. The catalog lives in Postgres (schema `store`) on Supabase, and images are pre-resized WebP in Supabase Storage. A one-off importer reads the product JSON that each live product page embeds. The homepage is a JSON document of typed sections validated with zod, so the stage 3 admin can edit it.

**Tech Stack:** Next.js 15.5.25, React 19.1, TypeScript (strict), pnpm, postgres.js, @supabase/supabase-js (storage), zod 4, sharp, sanitize-html, Vitest 5, Playwright, Supabase CLI (local stack), Lighthouse CLI.

**Spec:** `docs/superpowers/specs/2026-10-30-tiarra-store-design.md` (sections 5–7, 11, 12, stage 1 of 13).

## Global Constraints

- Node 22. pnpm lives in `~/.npm-global/bin`, so prefix commands with `export PATH="$HOME/.npm-global/bin:$PATH"`.
- Supabase CLI is a dev dependency (`pnpm exec supabase`). Every CLI call that touches Docker runs with `DOCKER_CONFIG=/tmp/dockercfg` (that directory contains a `config.json` of `{}`). Otherwise Docker hangs on the keychain.
- No Vercel- or Netlify-specific APIs. The site must build and run on both.
- Storefront pages are static (ISR). The only time-based revalidation is on `/` (`revalidate = 300`, for campaign dates). Search, filters and sorting run in the browser over data embedded in the page.
- Database access goes through `lib/db.ts` only, with postgres.js `{ prepare: false }`. Never issue more parallel queries on one client than its `max`, because the Supabase pooler hangs on pipelined queries.
- Keep every source file under about 300 lines and give it one job.
- Images: plain `<img>` with `srcset` from `imageUrl()` / `imageSrcSet()`, widths 400, 800 and 1200, WebP. No `next/image`; disable the `@next/next/no-img-element` lint rule.
- Customer-facing copy is in Bulgarian:
  - never use the word „тест“;
  - samples are „мостри от нашите продукти“, never „парфюми“;
  - free shipping is „над 39 €“ and the gift is „над 20 €“;
  - legal texts name only „Tiarra Cosmetics“ and the company „СТИЛИСТ ЛЪКИ“ ЕООД, ЕИК 204275889, гр. Плевен.
- Prices are formatted `29,90 €` (bg-BG, two decimals, a space, then €).
- Brand look: gold `#E5A72E` (`#B8860B` / `#C8901F` on white), Archivo italic 800/900 for display and buttons, Manrope 400/600/700 for body text, white backgrounds. The source of truth for markup and CSS is `/Users/macbookpro/Downloads/cloude-c/tiarra-sections/*.html`.
- `SITE_ENV` is `production`, `preview` or `development`. Anything other than `production` sends `X-Robots-Tag: noindex, nofollow` and a `robots.txt` that disallows everything.
- Nothing in stage 1 talks to Ordyx.
- Live-site fetches send `User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36` and `Accept: text/html`. Without them the site answers 403.

## Review Focus

1. **Cyrillic category slugs** (`/store/category/грижа-за-коса`) arrive percent-encoded and must render, not 404. Test: Task 9 e2e `encoded cyrillic category renders`.
2. **A variant with stock 0 among variants in stock.** Only that variant shows „Изчерпан“ and disables the button; the product still counts as in stock. Test: Task 10 `resolveVariantState` cases.
3. **An image that fails to download during import** must not abort the import. The product is saved without it and the report gets a warning. Test: Task 5 `import survives a failed image`.
4. **Running the import twice** must not create duplicate products, variants or images. Test: Task 5 `upsert is idempotent`.
5. **A campaign section whose `showUntil` has passed** disappears from `/` within 5 minutes, without a deploy. Test: Task 6 `visibleSections` window cases, plus `revalidate = 300` on `app/page.tsx` (Task 8 unit check).

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `vitest.config.ts`, `playwright.config.ts`, `app/layout.tsx`, `app/page.tsx`, `tests/unit/smoke.test.ts`
- Create (not committed): `.env.local`
- Modify: `/Users/macbookpro/Downloads/cloude-c/.claude/launch.json` — add the configuration `tiarra-store`: `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next","dev","--port","3100"]`, `cwd: "tiarra-store"`, `port: 3100`.

**Interfaces:**
- Produces scripts:
  - `dev`, `build`, `start`;
  - `test` = `vitest run`;
  - `test:e2e` = `playwright test`;
  - `db:start` = `DOCKER_CONFIG=/tmp/dockercfg supabase start`;
  - `db:reset` = `DOCKER_CONFIG=/tmp/dockercfg supabase db reset`;
  - `import:live` = `tsx scripts/import/run.ts`;
  - `seed:site` = `tsx scripts/seed-site.ts`;
  - `check:urls` = `tsx scripts/check-urls.ts`;
  - `perf` = `node scripts/perf.mjs`.
- Produces env names (`.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`;
  - `DATABASE_URL`;
  - `SITE_ENV`, `SITE_URL`.

- [ ] **Step 1:** Write `package.json` with exact dependencies:
  - `next@15.5.25`, `react@19.1.0`, `react-dom@19.1.0`;
  - `postgres@^3.4`, `@supabase/supabase-js@^2`, `zod@^4`, `sharp@^0.34`, `sanitize-html@^2`.
  
  Dev dependencies: `typescript@^5`, `@types/node`, `@types/react`, `@types/sanitize-html`, `vitest@^5`, `@playwright/test`, `supabase`, `tsx`, `eslint`, `eslint-config-next@15.5.25`.
  
  Then run `pnpm install` and `pnpm exec playwright install chromium`.
- [ ] **Step 2:** Write `tests/unit/smoke.test.ts`: `expect(1 + 1).toBe(2)`. Write `app/page.tsx` that renders `<h1>Tiarra</h1>`. `vitest.config.ts` covers `tests/unit/**` and `tests/integration/**` and resolves the `@/` alias.
- [ ] **Step 3:** Run `pnpm test`. Expected: 1 passed.
- [ ] **Step 4:** Start the preview with `preview_start {name: "tiarra-store"}`, then `read_page`. Expected: the heading „Tiarra“ is present.
- [ ] **Step 5:** Commit: `chore: scaffold the Next.js store with tests and tooling`.

### Task 2: Database schema, client and catalog queries

**Files:**
- Create: `supabase/config.toml` (from `pnpm exec supabase init`), `supabase/migrations/20261030000001_store_schema.sql`, `lib/db.ts`, `lib/catalog/types.ts`, `lib/catalog/queries.ts`, `lib/catalog/stock.ts`, `tests/integration/helpers.ts`, `tests/integration/catalog.test.ts`

**Schema (`store`):**
- `categories(id uuid pk default gen_random_uuid(), legacy_id int unique, slug text unique not null, name text not null, position int not null default 0)`
- `products`:
  - `id uuid pk`, `legacy_id int unique`, `slug text unique not null`;
  - `title text not null`, `brand text`, `gender text not null check (gender in ('female','male','unisex'))`;
  - `description_html text not null default ''`;
  - `price numeric(10,2) not null`, `compare_at_price numeric(10,2)`, `stock int` (null = not tracked);
  - `option_name text`, `perfume jsonb`;
  - `seo_title text`, `seo_description text`;
  - `is_hidden boolean not null default false`;
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
- `product_categories(product_id uuid references products on delete cascade, category_id uuid references categories on delete cascade, primary key both)`
- `product_images(id uuid pk, product_id uuid references products on delete cascade, source_key text not null, path text not null, width int not null, height int not null, alt text not null default '', position int not null, unique(product_id, source_key))`
- `variants(id uuid pk, product_id uuid references products on delete cascade, name text not null, price numeric(10,2) not null, compare_at_price numeric(10,2), stock int, sku text not null default '', image_path text, position int not null, unique(product_id, name))`
- `pages(slug text pk, title text not null, body_html text not null, seo_description text not null default '', updated_at timestamptz default now())`
- `site_documents(key text pk check (key in ('home','settings','navigation')), published jsonb not null, draft jsonb, updated_at timestamptz default now())`
- A public storage bucket: `insert into storage.buckets (id, name, public) values ('products','products',true) on conflict do nothing`.

**Interfaces:**
- Produces in `lib/db.ts`: `export const sql: postgres.Sql`, created from `DATABASE_URL` with `{ prepare: false, max: Number(process.env.DB_MAX ?? 3) }`.
- Produces in `lib/catalog/types.ts`:
  - `Category {id, slug, name, position}`;
  - `ProductImage {path, width, height, alt, position}`;
  - `Variant {id, name, price: number, compareAtPrice: number|null, stock: number|null, sku, imagePath: string|null, position}`;
  - `Perfume {top?, heart?, base?, aroma?, volume?: string}`;
  - `ProductCard {slug, title, brand: string|null, gender: 'female'|'male'|'unisex', imagePath: string|null, price: number, compareAtPrice: number|null, hasVariants: boolean, inStock: boolean, categorySlugs: string[], createdAt: string}`;
  - `Product = ProductCard & {id, legacyId: number|null, descriptionHtml, optionName: string|null, perfume: Perfume|null, seoTitle: string|null, seoDescription: string|null, variants: Variant[], images: ProductImage[], categories: Category[]}`.
- Produces in `lib/catalog/stock.ts`: `isAvailable(stock: number|null): boolean`, which is `stock === null || stock > 0`.
- Produces in `lib/catalog/queries.ts`:
  - `getCategories(): Promise<Category[]>`, ordered by position;
  - `getCategoryBySlug(slug: string): Promise<Category|null>`;
  - `getProductCards(opts?: {categorySlug?: string; onSale?: boolean}): Promise<ProductCard[]>`, newest first;
  - `getProductBySlug(slug: string): Promise<Product|null>`;
  - `getAllProductSlugs(): Promise<string[]>`;
  - `getRelatedProducts(p: Product, limit: number): Promise<ProductCard[]>`.
- Card rules:
  - `price` and `compareAtPrice` come from the cheapest variant when variants exist, otherwise from the product;
  - `inStock` is true when any variant is available (or the product is available, when it has no variants);
  - `imagePath` is the image at position 0;
  - hidden products are excluded everywhere.
- Related products share at least one category, never include the product itself, and have the same gender or `unisex`. When the product is `unisex`, any gender qualifies.

- [ ] **Step 1:** Run `pnpm db:start` and copy the local URLs into `.env.local` (if the AdSnap local stack already holds the default ports, set `[api] port = 55321`, `[db] port = 55322`, `[studio] port = 55323` in `supabase/config.toml` and use those ports below):
  - `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`;
  - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`;
  - the local publishable and secret keys printed by the CLI;
  - `SITE_ENV=development`, `SITE_URL=http://localhost:3100`.
- [ ] **Step 2:** Write the migration and run `pnpm db:reset`. Expected: it finishes without errors.
- [ ] **Step 3:** Write `tests/integration/helpers.ts` with:
  - `resetCatalog()`, which truncates the store tables;
  - `insertTestProduct(input)`, which inserts a product with its categories, variants and images and returns the slug.
- [ ] **Step 4:** Write the failing tests in `tests/integration/catalog.test.ts`:
  - `getProductBySlug returns variants in position order and categories`;
  - `card price comes from the cheapest variant` — variants 34.9/34.9 and 29.9 (compare 34.9) give card `{price: 29.9, compareAtPrice: 34.9}`;
  - `inStock is true when one variant has stock and another has 0`;
  - `hidden products are excluded from cards and slugs`;
  - `getRelatedProducts excludes self and the opposite gender` — a female product sees female and unisex products, never male;
  - `onSale returns only products whose price comes with a compareAtPrice`.
- [ ] **Step 5:** Run `pnpm test tests/integration/catalog.test.ts`. Expected: FAIL, the module is not found.
- [ ] **Step 6:** Implement `lib/db.ts`, `lib/catalog/stock.ts` and `lib/catalog/queries.ts` (SQL with `json_agg` for variants, images and categories).
- [ ] **Step 7:** Run the tests. Expected: 6 passed.
- [ ] **Step 8:** Commit: `feat: catalog schema and read queries`.

### Task 3: Import parsers (pure functions)

**Files:**
- Create: `scripts/import/types.ts`, `scripts/import/parse-product.ts`, `scripts/import/brand.ts`, `scripts/import/perfume.ts`, `scripts/import/sanitize.ts`, `tests/unit/import-parse.test.ts`
- Create fixtures (real pages, fetched with the UA from Global Constraints):
  - `tests/fixtures/product-yodeyma.html` ← `https://tiarracosmetics.com/store/yodeyma-paris-edp-eau-de-parfum-100-mlher`;
  - `tests/fixtures/product-simple.html` ← `https://tiarracosmetics.com/store/nishman-hair-styling-cream-wax-medium-hold-05-profesionalen-krem-za-kosa-100-ml`;
  - `tests/fixtures/product-redone.html` ← `https://tiarracosmetics.com/store/redone-aftershave-natural-cologne-400-ml`.
  
  Use `curl -s --compressed -A "<UA>" -H "Accept: text/html" <url> > <file>`.

**Interfaces:**
- Produces in `scripts/import/types.ts`: `ParsedProduct {legacyId: number, slug, title, descriptionHtml, seoDescription, price: number, compareAtPrice: number|null, stock: number|null, categories: {legacyId: number, slug, name}[], images: {sourceUrl, alt}[], optionName: string|null, variants: {name, price, compareAtPrice: number|null, stock: number|null, sku, imageSourceUrl: string|null}[]}`.
- Produces `parseProductPage(html: string): ParsedProduct`. It reads the JSON object that is the second argument of `WebPlatform.Store.renderProduct(root.find('.product-wrapper'), {…})`, using a balanced-brace scan followed by `JSON.parse`. Field mapping:
  - `price`: `onSale ? salePrice : price`; `compareAtPrice`: `onSale ? price : null`;
  - the same mapping applies to each `combinations[]` entry, keyed by its `name`;
  - `stock` ← `quantity`;
  - `optionName` ← `variations[0].name.trim()`;
  - all names are trimmed;
  - image URL = `https://content.app-sources.com/${base}uploads/${encodeURIComponent each path segment of name}`;
  - a variant image comes from `variations[0].images[value][0]`;
  - `descriptionHtml` ← `sanitizeDescription(description.text)`.
- Produces `detectBrand(title: string): string|null`. It matches the start of the title, case-insensitively, against an ordered list:
  - `NISH LADY`, `NISH MAN` (also `NISHMAN`), `REUZEL`, `AMERICAN CREW`, `STMNT`, `DEPOT`, `BARBURYS`, `YODEYMA`, `SCHWARZKOPF`, `REDONE`, `GUMMY`, `IMMORTAL`;
  - it returns the canonical upper-case name.
- Produces `detectGender(categorySlugs: string[], brand: string|null): 'female'|'male'|'unisex'`:
  - `women` without `men` → female; `men` without `women` → male; both → unisex;
  - otherwise by brand: `NISH LADY` → female; `NISH MAN`, `REUZEL`, `AMERICAN CREW`, `BARBURYS`, `STMNT` → male; else unisex.
- Produces `parsePerfumeNotes(html: string): Perfume|null`. It ports the label rules of `tiarra-sections/07-product-perfume.html`:
  - labels: `Връхни нотки:`, `Сърдечни нотки:` or `Средни нотки:`, `Базови нотки:`, `Аромат:`, `Обем:`;
  - each value runs up to the next `•`, the next label or the end of the paragraph;
  - it returns `null` when fewer than 2 notes are found.
- Produces `sanitizeDescription(html: string): string`:
  - allowed tags: `p, br, strong, b, em, i, ul, ol, li, a, h2, h3, h4`;
  - allowed attributes: `href` on `a`;
  - everything else, including styles, is dropped.

- [ ] **Step 1:** Fetch the three fixtures. Write the failing tests:
  - `parses a variant product`. From the yodeyma fixture expect:
    - `legacyId` 162, `title` `'YODEYMA Paris EDP Eau de Parfum For Her 100 ml'`, `optionName` `'АРОМАТ'`;
    - 10 variants. `variants[0]` is `{name: 'BLACK ELIXIR', price: 29.9, compareAtPrice: 34.9, stock: 2}` and `variants[1]` is `{name: 'BOREAL', price: 34.9, compareAtPrice: null, stock: 1}`;
    - no variant name ends with a space;
    - category slugs `['women','parfimes','тяло-и-аромати']`;
    - 10 images, `images[0].sourceUrl` starts with `'https://content.app-sources.com/s/908012564280219571/uploads/'`.
  - `parses a simple product`. From the simple fixture expect: `legacyId` 31, `price` 10.5, `compareAtPrice` null, `stock` 1, `variants` empty, category slugs `['men','грижа-за-коса']`.
  - `detectBrand`:
    - `'NISH LADY Сребърна грижа шампоан'` → `'NISH LADY'`;
    - `'Nish Man Hair Styling Cream 100 ml'` → `'NISH MAN'`;
    - `'American Crew Помада за коса 85 ml'` → `'AMERICAN CREW'`;
    - `'Ножчета за бръснене'` → `null`.
  - `detectGender`:
    - `(['women','parfimes'],'YODEYMA')` → female;
    - `(['men'],null)` → male;
    - `(['women','men'],null)` → unisex;
    - `(['грижа-за-коса'],'REUZEL')` → male;
    - `(['грижа-за-коса'],'NISH LADY')` → female;
    - `([],null)` → unisex.
  - `parsePerfumeNotes`. On the redone fixture description: `top` starts with `'Зрели и нежни акорди на ананас'`, `heart` with `'Освежаващ и хладен микс'`, `base` with `'Чувствен мускус'`. On `'<p>Без нотки</p>'` it returns `null`.
  - `sanitizeDescription`: `'<p style="color:#888">a<script>x</script></p>'` → `'<p>a</p>'`.
- [ ] **Step 2:** Run `pnpm test tests/unit/import-parse.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the four modules.
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit: `feat: parse live product pages for the import`.

### Task 4: Image pipeline

**Files:**
- Create: `lib/images.ts`, `scripts/import/images.ts`, `tests/unit/images.test.ts`

**Interfaces:**
- Produces in `lib/images.ts`:
  - `IMAGE_WIDTHS = [400, 800, 1200] as const`;
  - `imageUrl(path: string, width: 400|800|1200): string` = `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${path}-${width}.webp`;
  - `imageSrcSet(path: string): string`.
- Produces in `scripts/import/images.ts`:
  - `sourceKey(sourceUrl: string): string`, the first 16 hex characters of the sha1 of the URL;
  - `makeWebpVariants(input: Buffer): Promise<{width: number; data: Buffer}[]>`, which resizes to each of `IMAGE_WIDTHS` with `withoutEnlargement: true` and WebP quality 78, keeping alpha;
  - `uploadVariants(path: string, variants): Promise<void>`, which uses supabase-js storage with `SUPABASE_SECRET_KEY`, `upsert: true`, `cacheControl: '31536000'`, `contentType: 'image/webp'`;
  - `downloadImage(url: string): Promise<Buffer>`, which sends the live UA and throws on non-200;
  - `importImage(url, path)`, which runs download → variants → upload and returns `{width, height}` of the largest variant.

- [ ] **Step 1:** Write the failing tests:
  - `makeWebpVariants returns three webp files` — from a 1600×1000 PNG generated by sharp, the widths are `[400,800,1200]` and every file's `sharp(data).metadata()` reports format `'webp'`;
  - `never enlarges` — from a 600×400 source, all three files are 600 or narrower;
  - `imageUrl` — with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `imageUrl('abc',800)` equals `'http://127.0.0.1:54321/storage/v1/object/public/products/abc-800.webp'`;
  - `imageSrcSet` — contains `'abc-400.webp 400w'` and `'abc-1200.webp 1200w'`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: resize images to webp and serve them by path`.

### Task 5: Import runner (live site → database)

**Files:**
- Create: `scripts/import/fetch-live.ts`, `scripts/import/upsert.ts`, `scripts/import/run.ts`, `scripts/import/verify.ts`, `tests/integration/import-upsert.test.ts`

**Interfaces:**
- Consumes Task 3 (`parseProductPage`, `detectBrand`, `detectGender`, `parsePerfumeNotes`) and Task 4 (`importImage`, `sourceKey`).
- Produces in `fetch-live.ts`:
  - `fetchLive(url: string): Promise<string>`, with the UA, 3 retries and a 150 ms pause between calls;
  - `liveProductUrls(): Promise<string[]>`, from `https://tiarracosmetics.com/sitemap.xml`. It keeps `/store/<slug>` and drops `/store/category/*`, and deduplicates (the sitemap lists `/store/reuzel` twice).
- Produces in `upsert.ts`:
  - `upsertCategory(c): Promise<string>`, keyed by `legacy_id`;
  - `upsertProduct(p: ParsedProduct, deps: {importImage}): Promise<{productId: string; warnings: string[]}>`. It runs in one transaction keyed by `legacy_id`:
    - variants are replaced by `name`;
    - an image row is created only when `(product_id, source_key)` is missing, so an existing image is not re-uploaded;
    - a failed image adds the warning `"<slug>: image <url> failed: <message>"` and is skipped;
    - `brand` and `gender` come from the detectors, and `perfume` comes from `parsePerfumeNotes(descriptionHtml)`;
    - a variant's `image_path` is the stored path of its `imageSourceUrl`;
    - `products.price`, `compare_at_price` and `stock` hold the cheapest variant's values when variants exist.
- `run.ts` prints, and writes to `docs/import/report-<YYYY-MM-DD>.json`, the report `{products, categories, variants, images, warnings}`.
- `verify.ts` refetches every live product, compares price, compare-at price and stock for every variant against the database, and prints `diffs: N`. It exits 1 when N > 0.

- [ ] **Step 1:** Write the failing tests, using the Task 3 fixtures and a fake `importImage`:
  - `upsert is idempotent` — upserting the yodeyma parse twice leaves 1 product, 10 variants, 10 image rows, and the fake is called 10 times in total, not 20;
  - `import survives a failed image` — when the fake throws for `images[1]`, the product is saved with 9 images and `warnings` has 1 entry that contains `'image'`;
  - `gender and brand are stored` — yodeyma gets gender `female` and brand `YODEYMA`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement the upsert, then `run.ts`, then `verify.ts`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Run `pnpm import:live`. Expected report: `products: 89`, `categories: 7`, `variants` ≥ 156. Every warning is listed. Open each warning and decide whether it needs a fix.
- [ ] **Step 6:** Run `pnpm tsx scripts/import/verify.ts`. Expected: `diffs: 0`.
- [ ] **Step 7:** Commit (include the report): `feat: import the live catalog`.

### Task 6: Sections schema and site documents

**Files:**
- Create: `lib/sections/schema.ts`, `lib/sections/visible.ts`, `lib/site/schema.ts`, `lib/site/documents.ts`, `seed/home.json`, `seed/settings.json`, `seed/navigation.json`, `seed/pages/*.html`, `scripts/seed-site.ts`, `tests/unit/sections.test.ts`

**Interfaces:**
- Produces in `lib/sections/schema.ts`: `SectionSchema`, a zod discriminated union on `type`. Every section has the base `{id: string, type, enabled: boolean, showFrom?: string (ISO), showUntil?: string (ISO)}` plus `data`:
  - `hero`: `{imagePath, imageHref, imageAlt, subtitleHtml, buttons: {label, href, style: 'gold'|'ghost'}[], trust: string[]}`
  - `rating`: `{stars: 1–5, score: string, text: string}`
  - `products`: `{title: string, subtitle: string, source: 'all'|'category'|'newest'|'onSale'|'manual', categorySlug?: string, slugs?: string[], limit: number, moreHref?: string}`
  - `offer`: `{productSlug, title, imagePath, oldPrice: number, newPrice: number, endsAt?: string, buttonLabel}`
  - `why`: `{title, items: {icon, title, text}[]}`
  - `videoReviews`: `{videos: {youtubeId, name, stars}[], stats: {value, label}[]}`
  - `imageText`: `{imagePath, title, bodyHtml, buttonLabel?, buttonHref?}`
  - `faq`: `{title, items: {q, aHtml}[]}`
  - `banner`: `{imagePath, title, text, buttonLabel, buttonHref}`
  
  Also produces `HomeDocSchema = z.object({sections: z.array(SectionSchema)})` and `type Section`.
- Produces in `lib/sections/visible.ts`: `visibleSections(doc: HomeDoc, now: Date): Section[]`. It keeps a section when it is enabled and `showFrom <= now < showUntil`, where a missing bound always passes.
- Produces in `lib/site/schema.ts`:
  - `SettingsSchema`: `{topbarMessages: string[], freeShippingThreshold: number, giftThreshold: number, shipping: {econtOffice: number, speedyOffice: number}, company: {legalName, eik, city, email, phone}, social: {instagram?: string, facebook?: string}}`;
  - `NavigationSchema`: `{menu: {label, href}[], footer: {title, links: {label, href}[]}[]}`.
- Produces in `lib/site/documents.ts`: `getSiteDocument(key: 'home'|'settings'|'navigation')`. It returns the parsed `published` value and is wrapped in `unstable_cache` with the tag `'site'`.
- Seed values:
  - **settings**:
    - `topbarMessages`: the 4 strings from `06-topbar.html` (`MSGS`);
    - thresholds 39 and 20; shipping 4.50 and 3.50;
    - `company`: `{legalName: '„СТИЛИСТ ЛЪКИ" ЕООД', eik: '204275889', city: 'гр. Плевен', email: 'info@tiarracosmetics.com', phone: '+359 897 774 441'}`;
    - `social`: from `03-footer.html`.
  - **navigation**:
    - `menu`: ЗА НЕЯ → `/store/category/women`, ЗА НЕГО → `/store/category/men`, ПАРФЮМИ → `/store/category/parfimes`, КОМПЛЕКТИ → `/store/category/komplekt`, ПРОМОЦИИ → `/promo`, ЗА НАС → `/promo/za-nas`, КОНТАКТИ → `/promo/kontakti`;
    - `footer`: the columns of `03-footer.html`. The legal links point to `/obshti-usloviya`, `/dostavka-plashtane`, `/vrashtane-zamyana`, `/poveritelnost`, `/biskvitki`.
  - **home**, in the live order checked on 30.10:
    1. `hero`: texts from `01-hero-v2.html`; image `https://i.ibb.co/qFWsRkB6/image.png` imported through `importImage`; `imageHref` `/store`.
    2. `rating`: `{stars: 5, score: '5.0', text: 'С доверието на 290+ доволни клиенти'}`.
    3. `products`: source `all`, limit 12, `moreHref` `/store`, subtitle `'Продукти, с които работя и зад които заставам с името си. Подбрани продукти, които нашите клиенти избират отново и отново.'`.
    4. `products`: source `newest`, limit 12, subtitle `'Продуктите, с които работя и на които вярвам. Продуктите, които избират нашите клиенти редовно.'`.
    5. `offer`: `productSlug` `nishman-podar-chna-kutiya-za-brada-p-len-premium-komplekt-za-grizha-za-brada`; title = the heading text on the live homepage (the NISH MAN beard kit); old price 59.9, new price 48; `endsAt` = `new Date(1793465390000).toISOString()`; button `ВЗЕМИ СЕГА`; image = the live offer image.
    6. `products`: the 9-item grid under the offer. Its source is not known yet: look at the live grid, pick the source that reproduces it, and note the choice in the commit message.
    7. `why`: from `02-why-white.html`.
    8. `videoReviews`: videos `IvzJARMgi4A`, `KC2bxFlIVNw`, `zm9opr9-Mtc`, `AZtuO67nA0o` with 5 stars each. Take the names from the live widget (only „Антония“ was readable on 30.10; the others are left empty). Stats: `{value: '290+', label: 'ДОВОЛНИ КЛИЕНТИ'}`, `{value: '5', label: 'РЕАЛНА ОЦЕНКА ОТ КЛИЕНТИ'}`.
    9. `imageText`: title `Кой стои зад "Tiarra Cosmetics"`; the body is the full text of `https://tiarracosmetics.com/promo/za-nas`; the image is the live JPG from this section.
    10. `faq`: the 10 items of `09-faq.html`.
  - **pages**:
    - the five legal pages come from `tiarra-sections/pages/*.html` (body content only);
    - `za-nas` gets the same text as section 9;
    - `kontakti` gets the phone and email, with no form.
- `scripts/seed-site.ts` validates each document with its schema before writing, and exits 1 on the first error.

- [ ] **Step 1:** Write the failing tests:
  - `seed home is valid` — `HomeDocSchema.parse(seed/home.json)` has 10 sections;
  - `seed settings is valid`;
  - `unknown section type is rejected`;
  - `visibleSections`: `enabled:false` is hidden; `showUntil` one minute ago is hidden; `showFrom` in one hour is hidden; `showFrom` one hour ago with no `showUntil` is shown.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement the schemas and `visibleSections`, write the seed files, and implement `seed-site.ts`.
- [ ] **Step 4:** Run the tests. Expected: PASS. Then run `pnpm seed:site`. Expected: `home, settings, navigation, 7 pages written`.
- [ ] **Step 5:** Commit: `feat: typed homepage sections and site documents`.

### Task 7: Layout — fonts, topbar, header, footer, 404

**Files:**
- Create: `app/layout.tsx` (replace the Task 1 version), `app/globals.css`, `components/layout/Topbar.tsx` + `.module.css`, `components/layout/Header.tsx` + `.module.css`, `components/layout/Footer.tsx` + `.module.css`, `app/not-found.tsx`, `tests/e2e/layout.spec.ts`

**Interfaces:**
- Consumes `getSiteDocument('settings' | 'navigation')`.
- Fonts come from `next/font/google`: Manrope (subsets `latin`, `cyrillic`; weights 400, 600, 700) and Archivo (subset `latin`; italic; weights 800, 900; Cyrillic falls back exactly as it does live), both with `display: 'swap'`. The CSS variables are `--font-body` and `--font-display`.
- `Topbar` is a client component that ports `06-topbar.html`: rotation every 4500 ms, arrows, swipe, pause on hover only for `(hover: hover)`, and the auto-shrink `fit()` down to 10 px.
- `Header`:
  - the logo is the live PNG `https://content.app-sources.com/s/908012564280219571/uploads/Изображения/F8803101-0800-4683-A5DB-A7B8D55CA7A8-2055071.PNG`, imported through `importImage` with the path `site/logo` during `seed:site`;
  - the menu comes from `navigation.menu`, with a mobile drawer;
  - the search form is `GET /store`, field `q`;
  - the cart link points to `/store/cart` (that page arrives in stage 2).
- `Footer` ports `03-footer.html` without modals. Its links come from `navigation.footer`, its company line from `settings.company`, and it keeps the bottom line `© 2026 Tiarra Cosmetics® · „СТИЛИСТ ЛЪКИ" ЕООД · ЕИК 204275889 · гр. Плевен`.
- The 404 page shows „Страницата не е намерена“ and a link „Към началото“.

- [ ] **Step 1:** Write the failing e2e tests (Playwright against `http://localhost:3100`):
  - `topbar shows a message on one line at 360px` — the text is one of the 4 messages, and `scrollWidth <= clientWidth + 1`;
  - `menu has 7 links in order` — the labels match `navigation.menu`;
  - `footer shows the company line`;
  - `unknown page is 404` — status 404 and the text „Към началото“.
- [ ] **Step 2:** Run `pnpm test:e2e tests/e2e/layout.spec.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Visual check. Take preview screenshots of `/` at 375 px and 1280 px next to the live site at the same widths. Header, topbar and footer must match in colors, sizes and spacing. Fix any differences, then save both screenshot pairs to `docs/perf/visual/`.
- [ ] **Step 6:** Commit: `feat: site layout with topbar, header and footer`.

### Task 8: Homepage sections

**Files:**
- Create: `app/page.tsx`, `components/sections/SectionRenderer.tsx`, `components/sections/{Hero,RatingStrip,ProductsSection,Offer,Countdown,Why,VideoReviews,ImageText,Faq,Banner}.tsx` (each with a `.module.css`), `components/product/ProductCard.tsx` + `.module.css`, `lib/format.ts`, `lib/sections/products-source.ts`, `tests/unit/format.test.ts`, `tests/unit/home-page.test.ts`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes `getSiteDocument('home')`, `visibleSections`, `getProductCards` and `imageUrl` / `imageSrcSet`.
- Produces in `lib/format.ts`: `formatPrice(n: number): string` (bg-BG, so `29,90 €`) and `discountPercent(compareAt: number, price: number): number` (rounded).
- Produces in `lib/sections/products-source.ts`: `cardsForSection(data, allCards: ProductCard[]): ProductCard[]`:
  - `all` and `newest` → newest first;
  - `category` → filtered by `categorySlug`;
  - `onSale` → cards that have a `compareAtPrice`;
  - `manual` → in the order of `slugs`;
  - the result is cut to `limit`.
- `ProductCard` has `data-gender`, an image with `loading="lazy"`, the title, the price, and the old price with `-N%` when `compareAtPrice` is set.
- `app/page.tsx` sets `export const revalidate = 300`.
- `Hero` makes its image eager with `fetchpriority="high"`, because it is the LCP element.
- `VideoReviews` is a facade: it shows the YouTube thumbnail `https://i.ytimg.com/vi/<id>/hqdefault.jpg` and inserts the iframe only on click.
- `Countdown` is a client component that ticks to `endsAt` and hides itself once the time has passed (the offer itself stays).
- `Faq` emits `FAQPage` JSON-LD.

- [ ] **Step 1:** Write the failing unit tests:
  - `formatPrice` — 29.9 → `'29,90 €'`, 48 → `'48,00 €'`;
  - `discountPercent(34.9, 29.9)` → 14;
  - `cardsForSection` — `onSale` keeps only discounted cards; `manual` keeps the slug order; `limit` cuts;
  - `home revalidates every 5 minutes` — import `app/page.tsx` and expect `revalidate` to be 300.
- [ ] **Step 2:** Write the failing e2e tests for `/`:
  - the hero contains „резултатите, които виждаш при фризьора“, and the „За Нея“ link points to `/store/category/women`;
  - the first products section has 12 cards;
  - the offer shows `48,00 €` and `59,90 €`;
  - there are 4 video thumbnails and no `iframe` until a click;
  - there is a `script[type="application/ld+json"]` whose JSON `@type` is `FAQPage`.
- [ ] **Step 3:** Run both. Expected: FAIL.
- [ ] **Step 4:** Implement the sections, porting the markup and CSS from `tiarra-sections` (with `!important` and the 100vw tricks removed, since we own the page now).
- [ ] **Step 5:** Run both. Expected: PASS.
- [ ] **Step 6:** Visual check at 375 px and 1280 px against the live homepage, section by section. Save the screenshots to `docs/perf/visual/`.
- [ ] **Step 7:** Commit: `feat: homepage rendered from typed sections`.

### Task 9: Store, category and promo listings

**Files:**
- Create: `app/store/page.tsx`, `app/store/category/[slug]/page.tsx`, `app/promo/page.tsx`, `components/catalog/ProductGrid.tsx` (client) + `.module.css`, `lib/catalog/filter.ts`, `tests/unit/filter.test.ts`, `tests/e2e/listing.spec.ts`

**Interfaces:**
- Produces in `lib/catalog/filter.ts`: `filterProducts(cards: ProductCard[], q: {text?: string; brand?: string; sort?: 'newest'|'price-asc'|'price-desc'|'discount'}): ProductCard[]`:
  - text matches title or brand, case-insensitive, Cyrillic-safe through `toLocaleLowerCase('bg')`;
  - `discount` sorts by `(compareAtPrice - price) / compareAtPrice`, descending, with no-discount cards last.
- `ProductGrid` receives every card of the page as props. It shows 24 cards, then the button „Покажи още“ adds 24 more. It reads `q` from the URL on `/store` and offers a brand filter and a sort select.
- The category page is built from `generateStaticParams` over the decoded slugs, sets `dynamicParams = false`, and applies `decodeURIComponent` to `params.slug` before the lookup.
- `/promo` lists `getProductCards({onSale: true})` under the title „Промоции за месеца“.

- [ ] **Step 1:** Write the failing unit tests:
  - `text search is case-insensitive` (`'reuzel'` matches REUZEL);
  - `Cyrillic search` (`'помада'` matches „American Crew Помада за коса 85 ml“);
  - `price-asc` sorts;
  - `discount` puts no-discount cards last;
  - `brand filter`.
- [ ] **Step 2:** Write the failing e2e tests:
  - `encoded cyrillic category renders` — `/store/category/%D0%B3%D1%80%D0%B8%D0%B6%D0%B0-%D0%B7%D0%B0-%D0%BA%D0%BE%D1%81%D0%B0` returns 200 with cards;
  - `show more` — on `/store` exactly 24 cards are visible, and after a click there are more than 24;
  - `/store?q=reuzel` shows only cards whose title contains REUZEL;
  - `/promo` shows only cards with an old price.
- [ ] **Step 3:** Run both. Expected: FAIL.
- [ ] **Step 4:** Implement.
- [ ] **Step 5:** Run both. Expected: PASS.
- [ ] **Step 6:** Commit: `feat: store, category and promo listings`.

### Task 10: Product page

**Files:**
- Create: `app/store/[slug]/page.tsx`, `components/product/{Gallery,BuyBox,PerfumePyramid,TrustBlock,ShareButtons,RelatedProducts,Breadcrumbs}.tsx` (each with a `.module.css`), `lib/catalog/variant.ts`, `lib/seo/product-jsonld.ts`, `tests/unit/variant.test.ts`, `tests/unit/jsonld.test.ts`, `tests/e2e/product.spec.ts`

**Interfaces:**
- Produces in `lib/catalog/variant.ts`:
  - `initialVariantId(p: Product): string|null`, the first variant (by position) that is available; null when the product has no variants;
  - `resolveVariantState(p: Product, variantId: string|null): {price, compareAtPrice, discountPercent: number|null, inStock: boolean, imagePath: string|null}`.
- Produces in `lib/seo/product-jsonld.ts`: `productJsonLd(p: Product, url: string): object[]`, returning `[Product, BreadcrumbList]`:
  - with variants: `offers` is an `AggregateOffer` with `lowPrice`, `highPrice`, `priceCurrency: 'EUR'` and `offerCount`;
  - without variants: `offers` is an `Offer` with `price`, `priceCurrency` and `availability` (`https://schema.org/InStock` or `OutOfStock`).
- `BuyBox` (client):
  - option buttons are labelled by `optionName`;
  - the price and old price update with the selection, and so does the main image (`imagePath`);
  - the quantity field goes from 1 up to the stock (or 99 when stock is not tracked);
  - out of stock shows „Изчерпан“ and disables the button;
  - the button „Добави в количката“ takes an `onAdd` prop that is a no-op in stage 1 (stage 2 wires the cart).
- `PerfumePyramid` ports `07-product-perfume.html`. It renders only when `perfume` has at least 2 of top, heart and base.
- `TrustBlock` ports `05-product-trust.html`; its thresholds come from `settings`.
- `ShareButtons` ports `04-product-share.html`.
- `RelatedProducts` uses `getRelatedProducts(p, 8)`.

- [ ] **Step 1:** Write the failing unit tests, using a Product fixture built from the yodeyma parse:
  - `initialVariantId` skips a stock-0 first variant;
  - `resolveVariantState` for BLACK ELIXIR → `{price: 29.9, compareAtPrice: 34.9, discountPercent: 14, inStock: true}`;
  - for a variant with stock 0 → `inStock: false`;
  - a product without variants uses the product's own fields;
  - `productJsonLd` with variants → an `AggregateOffer` with `lowPrice` 29.9, `highPrice` 34.9, `offerCount` 10;
  - for a simple product with stock 0 → availability `https://schema.org/OutOfStock`.
- [ ] **Step 2:** Write the failing e2e tests on `/store/yodeyma-paris-edp-eau-de-parfum-100-mlher`:
  - h1 equals the title;
  - choosing „BOREAL“ shows `34,90 €` and no old price;
  - choosing „BLACK ELIXIR“ shows `29,90 €`, `34,90 €` and `-14%`;
  - every related card has `data-gender` other than `male`;
  - the JSON-LD contains `"@type":"Product"`.
  
  On `/store/redone-aftershave-natural-cologne-400-ml`, the perfume pyramid is visible.
- [ ] **Step 3:** Run both. Expected: FAIL.
- [ ] **Step 4:** Implement.
- [ ] **Step 5:** Run both. Expected: PASS.
- [ ] **Step 6:** Visual check at 375 px and 1280 px against the live product page. Save the screenshots.
- [ ] **Step 7:** Commit: `feat: product page with variants, trust block and structured data`.

### Task 11: Content pages, SEO, redirects and noindex

**Files:**
- Create: `app/[page]/page.tsx`, `app/promo/za-nas/page.tsx`, `app/promo/kontakti/page.tsx`, `app/sitemap.ts`, `app/robots.ts`, `lib/seo/site.ts`, `scripts/check-urls.ts`, `tests/unit/seo.test.ts`
- Modify: `next.config.ts` (redirects and headers)

**Interfaces:**
- Produces in `lib/seo/site.ts`: `SITE_URL` and `isProduction()`, which is `SITE_ENV === 'production'`.
- `app/[page]` has `generateStaticParams` over exactly the 5 legal slugs, sets `dynamicParams = false`, and reads the `pages` table.
- Every page sets metadata: title, description, `alternates.canonical`, and an Open Graph image (the product's main image, or the hero image for other pages).
- Redirects use `statusCode: 301`:
  - `/blog` and `/blog/:slug*` → `/`;
  - `/about-us` → `/promo/za-nas`;
  - `/contact-us` → `/promo/kontakti`;
  - `/special-deals` → `/promo`;
  - `/dsa` → `/`;
  - `/shipping-terms` → `/dostavka-plashtane`;
  - `/signin` → `/`.
- Headers: when not production, every path gets `X-Robots-Tag: noindex, nofollow`.
- `robotsFor(env)`:
  - production → allow everything, with `sitemap: ${SITE_URL}/sitemap.xml`;
  - otherwise → `disallow: '/'`.
  
  The sitemap lists `/`, `/store`, `/promo`, `/promo/za-nas`, `/promo/kontakti`, the 7 categories, the 89 products and the 5 legal pages.
- `scripts/check-urls.ts <base>` fetches every `<loc>` of the live sitemap, rewrites the host to `<base>`, and expects 200 for real pages and 301 for the template pages. It prints the failures and exits 1 if there are any.

- [ ] **Step 1:** Write the failing tests:
  - `robotsFor('preview')` disallows `/`;
  - `robotsFor('production')` allows and links the sitemap;
  - `sitemapEntries(fixtures)` contains the category URL with the Cyrillic slug, correctly encoded.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5:** With the dev server running, run `pnpm check:urls http://localhost:3100`. Expected: `0 failures`. Then run `curl -sI http://localhost:3100/ | grep -i x-robots-tag`. Expected: `noindex, nofollow`.
- [ ] **Step 6:** Commit: `feat: content pages, sitemap, redirects and noindex outside production`.

### Task 12: Speed gate on a local production build

**Files:**
- Create: `scripts/perf.mjs`, plus the outputs in `docs/perf/`

**Interfaces:**
- `node scripts/perf.mjs <base> <label>`:
  - runs `pnpm dlx lighthouse@12 <url> --only-categories=performance --output=json --chrome-flags="--headless=new" --quiet` (mobile emulation and throttling are the Lighthouse defaults) on `/`, `/store/category/women` and `/store/yodeyma-paris-edp-eau-de-parfum-100-mlher`;
  - writes `docs/perf/<YYYY-MM-DD>-<label>.json` with the score and the LCP, CLS and TBT of each URL;
  - exits 1 when any score is below 90 or any LCP is above 2500 ms.

- [ ] **Step 1:** Run `pnpm build && pnpm start -p 3101`, then `pnpm perf http://localhost:3101 local`.
- [ ] **Step 2:** If it fails, fix the measured cause and rerun. Usual causes:
  - the LCP image is not eager (hero or main product image);
  - a client component that could be static ships JavaScript;
  - below-the-fold images are not lazy;
  - a font blocks rendering.
  
  Expected at the end: all three URLs at 90 or above, with LCP at or under 2500 ms.
- [ ] **Step 3:** Commit: `perf: local mobile Lighthouse ≥ 90 on home, category and product`.

### Task 13: Test address (Tiarra Supabase + Netlify)

**Prerequisites from the owner** (stop and ask if missing):
- the Supabase secret key and the database password for project `lpdwzpzgghkdrkuqlwga`, placed in `.env.production.local` (never committed);
- a Netlify account, with `pnpm dlx netlify-cli login` already run in the terminal.

**Files:**
- Create: `netlify.toml` (only the build command `pnpm build`; nothing Netlify-specific in the code)
- Modify: `docs/perf/`

- [ ] **Step 1:** Run `pnpm exec supabase link --project-ref lpdwzpzgghkdrkuqlwga`. Confirm that the pooler host printed in the dashboard's connection string is in the EU (`eu-central-1`). If it is not, stop and tell the owner before importing anything.
- [ ] **Step 2:** Run `pnpm exec supabase db push`. Expected: the migration is applied.
- [ ] **Step 3:** With `.env.production.local` loaded, run `pnpm seed:site`, then `pnpm import:live`, then `pnpm tsx scripts/import/verify.ts`. Expected: `products: 89`, `categories: 7`, `diffs: 0`.
- [ ] **Step 4:** Create the Netlify site `tiarra-store-preview`. Set its environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL=https://lpdwzpzgghkdrkuqlwga.supabase.co`;
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
  - `DATABASE_URL` (transaction pooler, port 6543);
  - `SITE_ENV=preview`;
  - `SITE_URL=https://tiarra-store-preview.netlify.app`.
  
  Then run `pnpm dlx netlify-cli deploy --build --prod`.
- [ ] **Step 5:** Run `pnpm check:urls https://tiarra-store-preview.netlify.app`. Expected: `0 failures`. Run `curl -sI` on the home page. Expected: it contains `noindex`.
- [ ] **Step 6:** Run PageSpeed Insights (mobile, in the browser at pagespeed.web.dev) on the same three URLs as Task 12. Expected: ≥ 90 and LCP ≤ 2,5 s. Record the numbers in `docs/perf/<date>-preview.md`.
- [ ] **Step 7:** Commit: `chore: preview deployment on Netlify with the Tiarra database`. Then send the owner the address and the speed numbers, and ask them to compare the site with the live one on their phone.
