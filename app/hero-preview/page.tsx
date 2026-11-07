import Link from 'next/link'
import { getProductCards } from '@/lib/catalog/queries'
import { imageUrl } from '@/lib/images'
import { HeroPreview } from './preview'

export const metadata={title:'Преглед на херо | Tiarra Cosmetics',robots:{index:false,follow:false}}
export const dynamic='force-dynamic'
export default async function Page(){
 const available=(await getProductCards()).filter(card=>card.imagePath&&card.inStock)
 const isPerfume=(card:typeof available[number])=>card.categorySlugs.some(slug=>/parfum|parfym|parfime|perfume/i.test(slug))||/парфюм|perfume|parfum|\bedp\b|\bedt\b/i.test(card.title)
 const perfumes=available.filter(isPerfume), cosmetics=available.filter(card=>!isPerfume(card))
 const cards=Array.from({length:4},(_,index)=>[perfumes[index],cosmetics[index]]).flat().filter((card):card is typeof available[number]=>Boolean(card))
 return <><HeroPreview products={cards.map(card=>({slug:card.slug,title:card.title,image:imageUrl(card.imagePath!,400)}))}/><div style={{padding:'36px',textAlign:'center'}}><Link href="/">← Обратно към магазина</Link></div></>
}
