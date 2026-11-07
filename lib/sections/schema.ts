import { z } from 'zod'

// The homepage is a list of typed sections. The admin (stage 3) edits this document and the
// storefront renders it. The document is parsed as a whole (readSiteDocument): one section whose
// data does not parse makes the whole `home` document invalid, and reading it throws an error
// that gives the path of the bad field. A build of `/` then fails, and a revalidation fails too
// (Next keeps serving the previous copy). So a bad section never renders, but it also holds back
// every other change to the homepage until it is fixed; the admin has to validate before it publishes.

const str = z.string()
const filled = z.string().min(1)
// `+02:00` style offsets are fine; every bound is compared as an instant.
const isoDate = z.iso.datetime({ offset: true })

/** A section is `{ ...base, type, data }`; `section()` stamps the base onto each type's data. */
const base = {
  id: filled,
  enabled: z.boolean(),
  showFrom: isoDate.optional(),
  showUntil: isoDate.optional(),
}

function section<T extends string, D extends z.ZodType>(type: T, data: D) {
  return z.object({ ...base, type: z.literal(type), data })
}

const HeroData = z.object({
  /** Storage path without width or extension, e.g. `site/hero` (see imageUrl()). */
  imagePath: filled,
  imageHref: str,
  imageAlt: str,
  subtitleHtml: str,
  buttons: z.array(z.object({ label: filled, href: filled, style: z.enum(['gold', 'ghost']) })),
  trust: z.array(filled),
})

const RatingData = z.object({
  stars: z.number().int().min(1).max(5),
  score: str,
  text: str,
  /** Small round customer photos left of the stars: storage paths without width or extension. */
  avatars: z.array(filled).max(8).optional(),
})

const PRODUCT_SOURCES = ['all', 'mixed', 'category', 'newest', 'onSale', 'manual'] as const

const ProductsData = z
  .object({
    title: str,
    subtitle: str,
    source: z.enum(PRODUCT_SOURCES),
    /** Required when source is `category`. */
    categorySlug: filled.optional(),
    /** Required, in display order, when source is `manual`. */
    slugs: z.array(filled).optional(),
    limit: z.number().int().positive(),
    moreHref: filled.optional(),
  })
  .refine((d) => d.source !== 'category' || d.categorySlug !== undefined, {
    message: 'A category section needs a categorySlug',
    path: ['categorySlug'],
  })
  .refine((d) => d.source !== 'manual' || (d.slugs?.length ?? 0) > 0, {
    message: 'A manual section needs at least one slug',
    path: ['slugs'],
  })

const OfferData = z.object({
  productSlug: filled,
  title: filled,
  imagePath: filled,
  oldPrice: z.number().positive(),
  newPrice: z.number().positive(),
  /** When set, the countdown runs to this instant. */
  endsAt: isoDate.optional(),
  buttonLabel: filled,
})

/** A word or phrase of `title` shown in gold; it must occur in the title, or the gold would silently vanish. */
const inTitle = (d: { title: string; titleHighlight?: string }) =>
  d.titleHighlight === undefined || d.title.includes(d.titleHighlight)
const inTitleIssue = { message: 'titleHighlight must be part of the title', path: ['titleHighlight'] }

const WhyData = z
  .object({
    /** The small gold line above the title. */
    kicker: str.optional(),
    title: str,
    titleHighlight: filled.optional(),
    /** `icon` is a name the renderer maps to an SVG: shield, truck, card or return. */
    items: z.array(z.object({ icon: filled, title: filled, text: str })),
  })
  .refine(inTitle, inTitleIssue)

const VideoReviewsData = z.object({
  videos: z.array(
    z.object({
      /** Goes into thumbnail and embed URLs, so it is exactly what YouTube issues: 11 URL-safe characters. */
      youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
      /** May be empty: the card then shows no name. */
      name: str,
      stars: z.number().int().min(1).max(5),
    }),
  ),
  stats: z.array(z.object({ value: filled, label: filled })),
})

const ImageTextData = z.object({
  imagePath: filled,
  title: str,
  bodyHtml: str,
  buttonLabel: filled.optional(),
  buttonHref: filled.optional(),
})

const FaqData = z
  .object({
    kicker: str.optional(),
    title: str,
    titleHighlight: filled.optional(),
    items: z.array(z.object({ q: filled, aHtml: str })),
    /** The box under the questions; the email and Instagram links in it come from the site settings. */
    help: z.object({ title: filled, text: str }).optional(),
  })
  .refine(inTitle, inTitleIssue)

const BannerData = z.object({
  imagePath: filled,
  title: str,
  text: str,
  buttonLabel: filled,
  buttonHref: filled,
})

export const SectionSchema = z.discriminatedUnion('type', [
  section('hero', HeroData),
  section('cinematicHero', z.object({
    title: filled, accent: filled, subtitle: str, buttonLabel: filled, buttonHref: filled,
    fallbackImagePath: filled, productSlug: str,
  })),
  section('cinematicFinal', z.object({ title: filled, text: str, buttonLabel: filled, buttonHref: filled, productSlug: str })),
  section('productStory', z.object({
    productSlug: str, title: filled, text: str, buttonLabel: filled,
  })),
  section('categoryShowcase', z.object({
    title: filled, items: z.array(z.object({ title: filled, href: filled })).min(1),
  })),
  section('rating', RatingData),
  section('products', ProductsData),
  section('offer', OfferData),
  section('why', WhyData),
  section('videoReviews', VideoReviewsData),
  section('imageText', ImageTextData),
  section('faq', FaqData),
  section('banner', BannerData),
])

export const StoreThemeSchema = z.enum(['classic', 'boost'])
export const HomeDocSchema = z.object({
  theme: StoreThemeSchema.default('classic'),
  sections: z.array(SectionSchema),
})

export type Section = z.infer<typeof SectionSchema>
export type SectionType = Section['type']
/** One section type, e.g. `SectionOf<'hero'>`; what a section component takes as its prop. */
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>
export type HomeDoc = z.infer<typeof HomeDocSchema>
export type StoreTheme = z.infer<typeof StoreThemeSchema>
