import { CinematicHero, ProductStory, CinematicFinal } from '@/components/cinematic/Scenes'
import { Discover } from '@/components/cinematic/Discover'
import { Fragment, type ReactNode } from 'react'
import type { ProductCard } from '@/lib/catalog/types'
import { cardsForSection } from '@/lib/sections/products-source'
import type { Section } from '@/lib/sections/schema'
import type { Settings } from '@/lib/site/schema'
import { Banner } from './Banner'
import { Faq } from './Faq'
import { Hero } from './Hero'
import { ImageText } from './ImageText'
import { Offer } from './Offer'
import { ProductsSection } from './ProductsSection'
import { RatingStrip } from './RatingStrip'
import styles from './SectionRenderer.module.css'
import { VideoReviews } from './VideoReviews'
import { Why } from './Why'

interface Props {
  /** The sections to show now, in order (see visibleSections). */
  sections: Section[]
  /** Every visible product card: loaded once per page, each products section picks from it. */
  cards: ProductCard[]
  settings: Settings
}

function renderSection(section: Section, { cards, settings }: Pick<Props, 'cards' | 'settings'>, layout?: 'panel' | 'grid'): ReactNode {
  switch (section.type) {
    case 'cinematicFinal':
      return <CinematicFinal section={section} cards={cards} />
    case 'cinematicHero':
      return <CinematicHero section={section} cards={cards} />
    case 'productStory':
      return <ProductStory section={section} cards={cards} />
    case 'categoryShowcase':
      return <Discover cards={cards} id={section.id} />
    case 'hero':
      return <Hero section={section} />
    case 'rating':
      return <RatingStrip section={section} />
    case 'products':
      return <ProductsSection section={section} cards={cardsForSection(section.data, cards)} layout={layout} />
    case 'offer':
      return <Offer section={section} />
    case 'why':
      return <Why section={section} />
    case 'videoReviews':
      return <VideoReviews section={section} />
    case 'imageText':
      return <ImageText section={section} />
    case 'faq':
      return <Faq section={section} settings={settings} />
    case 'banner':
      return <Banner section={section} />
    default: {
      // A new section type that is not handled here fails to compile.
      const unhandled: never = section
      return unhandled
    }
  }
}

/**
 * Turns the document's sections into components, in order. An offer followed straight by a
 * products section is laid out side by side on a wide screen (the live "campaign row"):
 * the offer on the left, the products as a grid on the right.
 */
export function SectionRenderer({ sections, cards, settings }: Props) {
  const context = { cards, settings }
  const rendered: ReactNode[] = []

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    const next = sections[i + 1]

    if (section.type === 'offer' && next?.type === 'products') {
      rendered.push(
        <div key={section.id} className={styles.campaign}>
          {renderSection(section, context)}
          {renderSection(next, context, 'grid')}
        </div>,
      )
      i++
    } else {
      rendered.push(<Fragment key={section.id}>{renderSection(section, context)}</Fragment>)
    }

  }

  return <div className={styles.sections}>{rendered}</div>
}
