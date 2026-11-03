# Cinematic experience v1 — 2026-11-03

## Audit
The supplied archive contains Next 15.5.25 / React 19.1, typed Zod sections, server-rendered catalog and product routes, Storage image helpers, site_documents reads, ISR=300, unit/integration/E2E suites, and the stage 1 specification and plan. No Git history, public assets, .env.local or connected database was supplied. A new local branch feat/tiarra-cinematic-experience was initialized; it is not connected to the remote repository.

Reuse: all catalog queries, price formatting, ProductCard components, product URLs, image sizes, original product/trust/video/brand/FAQ sections, metadata, sitemap, robots and redirects. No database writes or migration, seed replacement, checkout change or deployment occurred.

## Implementation
Enable CINEMATIC_HOME=1 in the local environment to apply cinematicHomeV1 to the published home document in memory. Leaving the variable unset preserves the original homepage. Roll back by removing the flag; no content migration is necessary.

Four section types are registered in schema and SectionRenderer: cinematicHero, productStory, categoryShowcase and cinematicFinal. Each has normal id/enabled/schedule fields and editable data. The generated hero/story/categories inherit the original hero's schedule. Existing sections retain their original data and order. Explicit productSlug selects that product; an empty value chooses the first available catalog product with an image. Missing story products omit that scene; hero falls back to its configured site image.

Server components render headings, images, price, stock and links. Only SceneMotion is a client boundary; it receives rendered children, not catalog data. GSAP and ScrollTrigger load dynamically. Context and matchMedia cleanup support navigation and Strict Mode. Reduced-motion leaves content static, and desktop pinning is limited to viewports at least 1000px wide and 750px tall. Mobile uses ordinary document flow. No WebGL dependency was added.

## Validation
- TypeScript: successful, including the final CTA addition.
- Unit suite: 30 files / 287 assertions passed with NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co (placeholder only for pure URL tests; no database connection). Without this variable the existing JSON-LD absolute-image assertion fails.
- Next production compilation, lint/type stage: successful before final CTA addition. Full build stops collecting page data because DATABASE_URL is missing.
- Browser install attempt failed because its default cache location is unavailable. No browser screenshots, Lighthouse measurements, Core Web Vitals, database integration tests or catalog/variant E2E results are claimed.
- Tooling in this executor: Node 24.19 and pnpm 11.25; repository requests Node 22 and pnpm 12.8.1. Repeat release validation in the requested environment.

## Remaining
Visual QA on real desktop/mobile screens and keyboard navigation; screenshots; dynamic reduced-motion verification; integration/E2E using an isolated configured database; Lighthouse and CWV; category image art direction; more seamless cross-section product continuity; editorial offer redesign based on verified current campaign data. Existing offer handling is retained and needs a separate live data audit before release. Original Instagram video was not analyzed frame by frame.

## Cloud bootstrap — 2026-11-03

- GitHub `vstoimenov/tiarra-store` now contains the project on `main`.
- Supabase project `tiarra` has the store schema, 3 site documents, 7 content pages, 89 products, 7 categories, 161 variants and 235 product images.
- Bootstrap catalog images retain their public source CDN URLs. `imageUrl()` supports those URLs; the regular importer remains the path for later WebP copies in Supabase Storage.
- A least-privilege `tiarra_app` database role has read-only access to the `store` schema.
- Vercel project `tiarra-store` exists and uses Node 22. Environment-variable creation is blocked by the current connector permission, so no deployment has been claimed.

## Running
Restore the project's environment configuration locally (do not upload secrets to chat), with DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SITE_URL, and add CINEMATIC_HOME=1. Use the repository's Node/pnpm versions, pnpm install, pnpm dev. Expected local URL: http://localhost:3100. This URL is an instruction for local startup, not a running hosted preview.
