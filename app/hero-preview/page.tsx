import Link from 'next/link'
import { getProductCards } from '@/lib/catalog/queries'
import { imageUrl } from '@/lib/images'
import { HeroPreview } from './preview'

export const metadata={title:'Преглед на херо | Tiarra Cosmetics',robots:{index:false,follow:false}}
export const dynamic='force-dynamic'
export default async function Page(){
 const cards=(await getProductCards()).filter(card=>card.imagePath&&card.inStock).slice(0,8)
 return <><HeroPreview products={cards.map(card=>({slug:card.slug,title:card.title,image:imageUrl(card.imagePath!,400)}))}/><div style={{padding:'36px',textAlign:'center'}}><Link href="/">← Обратно към магазина</Link></div></>
}
