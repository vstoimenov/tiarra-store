export interface ParsedCategory {
  legacyId: number
  slug: string
  name: string
}

export interface ParsedImage {
  sourceUrl: string
  alt: string
}

export interface ParsedVariant {
  name: string
  price: number
  compareAtPrice: number | null
  stock: number | null
  sku: string
  imageSourceUrl: string | null
}

export interface ParsedProduct {
  legacyId: number
  slug: string
  title: string
  descriptionHtml: string
  seoDescription: string
  price: number
  compareAtPrice: number | null
  stock: number | null
  categories: ParsedCategory[]
  images: ParsedImage[]
  optionName: string | null
  variants: ParsedVariant[]
}
