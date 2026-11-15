import Link from 'next/link'
import type { ProductCard } from '@/lib/catalog/types'
import type { SectionOf } from '@/lib/sections/schema'
import { ProductsSection } from './ProductsSection'

/** Uses the same cards and bottom action as the other homepage product sections. */
export function KitsCollection({ section, cards }: { section: SectionOf<'products'>; cards: ProductCard[] }) {
  if(!cards.length)return null
  return <><ProductsSection section={{ ...section, data: {
    ...section.data,
    title: section.data.title.trim() || 'Комплекти за всеки',
    subtitle: section.data.subtitle.trim() || 'Подбрани комбинации за грижа за косата, брадата и тялото.',
    moreHref: section.data.moreHref || '/store/category/komplekt',
  } }} cards={cards} /><p style={{textAlign:'center',padding:'0 20px',fontSize:14}}><Link href="/saveti/podarak-za-mazh-s-brada-do-50-euro">Подарък за мъж с брада до 50 €</Link> · <Link href="/saveti/nish-lady-komplekti-za-kosa">Избор на комплект NISH LADY</Link></p></>
}
