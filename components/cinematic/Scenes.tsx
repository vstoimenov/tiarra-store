import Link from 'next/link'
import type { ProductCard } from '@/lib/catalog/types'
import { formatPrice } from '@/lib/format'
import { imageSrcSet, imageUrl } from '@/lib/images'
import type { SectionOf } from '@/lib/sections/schema'
import { SceneMotion } from './SceneMotion'
import styles from './Scenes.module.css'

function selectProduct(cards: ProductCard[], slug: string) {
  return slug ? cards.find(p => p.slug === slug) : cards.find(p => p.inStock && p.imagePath)
}
function ProductImage({ path, title, priority = false }: { path: string; title: string; priority?: boolean }) {
  return <img data-product src={imageUrl(path, 800)} srcSet={imageSrcSet(path)} sizes="(min-width: 900px) 50vw, 90vw" width={800} height={800} alt={title} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
}
export function CinematicHero({ section, cards }: { section: SectionOf<'cinematicHero'>; cards: ProductCard[] }) {
  const d = section.data
  const product = selectProduct(cards, d.productSlug)
  return <SceneMotion className={styles.hero} id={section.id} kind="hero">
    <div className={styles.copy} data-reveal>
      <p className={styles.kicker}>TIARRA COSMETICS</p>
      <h1>{d.title}<br /><em>{d.accent}</em></h1>
      <p>{d.subtitle}</p><Link className={styles.button} href={d.buttonHref}>{d.buttonLabel} ↗</Link>
    </div>
    <div className={styles.visual}><div className={styles.halo} aria-hidden="true" />
      <ProductImage path={product?.imagePath ?? d.fallbackImagePath} title={product?.title ?? 'Tiarra Cosmetics'} priority />
    </div><span className={styles.scroll} aria-hidden="true">ПРОДЪЛЖИ НАДОЛУ ↓</span>
  </SceneMotion>
}
export function ProductStory({ section, cards }: { section: SectionOf<'productStory'>; cards: ProductCard[] }) {
  const product = selectProduct(cards, section.data.productSlug)
  if (!product?.imagePath) return null
  return <SceneMotion id={section.id} kind="story" className={styles.story}>
    <div className={styles.visual}><ProductImage path={product.imagePath} title={product.title} /></div>
    <div className={styles.steps}>
      <div data-step><p className={styles.kicker}>01 / ТВОЯТ РИТУАЛ</p><h2>{section.data.title}</h2><p>{section.data.text}</p></div>
      <div data-step><p className={styles.kicker}>02 / ОТКРИЙ</p><h3>{product.title}</h3>{product.brand && <p>{product.brand}</p>}</div>
      <div data-step><p className={styles.kicker}>03 / ТВОЯТ ИЗБОР</p><p className={styles.price}>{formatPrice(product.price)}</p><p>{product.inStock ? 'В наличност' : 'Изчерпан'}</p><Link className={styles.button} href={`/store/${product.slug}`}>{section.data.buttonLabel} ↗</Link></div>
    </div>
  </SceneMotion>
}
export function CategoryShowcase({ section }: { section: SectionOf<'categoryShowcase'> }) {
  return <SceneMotion className={styles.categories} id={section.id} kind="categories">
    <p className={styles.kicker}>СЕЛЕКЦИЯТА НА TIARRA</p><h2 data-reveal>{section.data.title}</h2>
    {section.data.items.map((item, i) => <Link data-reveal key={item.href} href={item.href} className={styles.category}><span>0{i + 1}</span><h3>{item.title}</h3><span aria-hidden="true">↗</span></Link>)}
  </SceneMotion>
}

export function CinematicFinal({ section, cards }: { section: SectionOf<'cinematicFinal'>; cards: ProductCard[] }) {
  const product = selectProduct(cards, section.data.productSlug)
  return <SceneMotion id={section.id} kind="categories" className={styles.final}>
    <div data-reveal><p className={styles.kicker}>TIARRA COSMETICS</p><h2>{section.data.title}</h2><p>{section.data.text}</p><Link className={styles.button} href={section.data.buttonHref}>{section.data.buttonLabel} ↗</Link></div>
    {product?.imagePath && <div className={styles.visual}><ProductImage path={product.imagePath} title={product.title} /></div>}
  </SceneMotion>
}
