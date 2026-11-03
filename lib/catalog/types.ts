export type Gender = 'female' | 'male' | 'unisex'

export interface Category {
  id: string
  slug: string
  name: string
  position: number
}

export interface ProductImage {
  path: string
  width: number
  height: number
  alt: string
  position: number
}

export interface Variant {
  id: string
  name: string
  price: number
  compareAtPrice: number | null
  stock: number | null
  sku: string
  imagePath: string | null
  position: number
}

export interface Perfume {
  top?: string
  heart?: string
  base?: string
  aroma?: string
  volume?: string
}

export interface ProductCard {
  slug: string
  title: string
  brand: string | null
  gender: Gender
  imagePath: string | null
  price: number
  compareAtPrice: number | null
  hasVariants: boolean
  inStock: boolean
  categorySlugs: string[]
  createdAt: string
}

export type Product = ProductCard & {
  id: string
  legacyId: number | null
  /** The product's own stock; `null` when it is not tracked (always so for a product with variants). */
  stock: number | null
  descriptionHtml: string
  optionName: string | null
  perfume: Perfume | null
  seoTitle: string | null
  seoDescription: string | null
  variants: Variant[]
  images: ProductImage[]
  categories: Category[]
}
