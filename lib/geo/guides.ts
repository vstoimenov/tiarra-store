import { type GuideSlug } from './routes'
export { guideSlugs,type GuideSlug } from './routes'
import type { ProductCard } from '@/lib/catalog/types'
import type { CommerceSettings } from '@/lib/commerce-settings-schema'
import { formatPrice } from '@/lib/format'
export const guides:Record<GuideSlug,{title:string;question:string;label:string;description:string}> = {
 'olfazeta-chogan-dostavka': {title:'OLFazeta by CHOGAN с доставка до дома в България',question:'Къде да купя OLFazeta by CHOGAN парфюми с доставка до дома?',label:'Парфюми CHOGAN с доставка',description:'Парфюми OLFazeta by CHOGAN от Tiarra Cosmetics: актуални цени, наличности, доставка до адрес и помощ при избор на аромат.'},
 'podarak-za-mazh-s-brada-do-50-euro':{title:'Подарък за мъж с брада до 50 €',question:'Какъв подарък за мъж с брада до 50 евро да избера?',label:'Подарък за мъж с брада до 50 €',description:'Подборка на налични подаръчни комплекти за брада до 50 евро от Tiarra Cosmetics. Сравни продуктите, съдържанието в заглавията и текущите цени.'},
 'nish-lady-komplekti-za-kosa':{title:'NISH LADY: комплект шампоан, балсам и маска',question:'Къде да намеря NISH LADY комплект шампоан, балсам и маска в България?',label:'Комплекти NISH LADY за коса',description:'Комплекти NISH LADY от Tiarra Cosmetics: шампоан, балсам и маска. Избор според серията, актуални цени и помощ за боядисана коса.'}
} as const
export function isGuideSlug(value:string):value is GuideSlug { return Object.hasOwn(guides,value) }
export function guideProducts(slug:GuideSlug,cards:ProductCard[]):ProductCard[]{
 return cards.filter(p=>p.inStock && (slug==='olfazeta-chogan-dostavka'
  ? /chogan/i.test(p.brand??'') && !/кейс|калъф|калъв|аксесоар|спрей за тяло|body mist/i.test(p.title) && /парфюм|olfazeta|chogan/i.test(p.title)
  : slug==='podarak-za-mazh-s-brada-do-50-euro'
   ? p.categorySlugs.includes('komplekt') && /брада|beard/i.test(p.title) && p.price<=50
   : /nish\s*lady/i.test(p.brand??p.title) && p.categorySlugs.includes('komplekt')))
  .sort((a,b)=>a.price-b.price||a.slug.localeCompare(b.slug))
}
export function homeDeliveryOptions(s:CommerceSettings){
 return [...(s.econtEnabled&&s.econtAddressEnabled?[{name:'Еконт',price:s.econtAddressPrice}]:[]),...(s.speedyEnabled&&s.speedyAddressEnabled?[{name:'Спиди',price:s.speedyAddressPrice}]:[])]
}
export function deliveryAnswer(s:CommerceSettings):string{
 const options=homeDeliveryOptions(s)
 return options.length
  ? `В Tiarra Cosmetics можеш да поръчаш OLFazeta by CHOGAN с доставка до домашен адрес в България чрез ${options.map(o=>o.name).join(' или ')}. Избираш „До адрес“ при завършване на поръчката.`
  : 'В Tiarra Cosmetics можеш да поръчаш OLFazeta by CHOGAN онлайн. Доставката до адрес в момента не е активна; наличните начини за получаване се показват при завършване на поръчката.'
}
export function guideFaq(slug:GuideSlug,s:CommerceSettings,cards:ProductCard[]){
 const products=guideProducts(slug,cards)
 const priceText=products.length?`В тази подборка има ${products.length} налични продукта с цени от ${formatPrice(products[0].price)}${products[0].hasVariants?' за най-достъпния вариант':''}. При продукти с варианти точната цена се показва след избора им.`:'В момента няма налични продукти за тази подборка. Провери каталога или се свържи с нас.'
 const primary=slug==='olfazeta-chogan-dostavka'?deliveryAnswer(s):slug==='podarak-za-mazh-s-brada-do-50-euro'
  ? 'В Tiarra Cosmetics можеш да избереш наличен комплект за брада до 50 €. По-долу са текущите предложения; имената показват включените продукти и посочените им разфасовки. За комплект с варианти провери цената на избрания вариант.'
  : 'В Tiarra Cosmetics има готови комплекти NISH LADY. По-долу виждаш наличните серии и актуалните цени. Провери дали името на избрания комплект включва шампоан, балсам и маска.'
 return [
  {q:guides[slug].question,a:primary},
  {q:'Какви са текущите цени и наличности?',a:priceText},
  {q:'Колко струва доставката?',a:`${s.freeShippingThreshold===0?'Доставката е безплатна.':`Безплатна доставка над ${formatPrice(s.freeShippingThreshold)}.`} ${s.freeShippingThreshold!==0&&homeDeliveryOptions(s).length?`Под този праг доставката до адрес е ${homeDeliveryOptions(s).map(o=>`${formatPrice(o.price)} с ${o.name}`).join(' или ')}.`:''} Крайната сума се показва в обобщението на поръчката.`},
  {q:'Кога изпращате поръчката?',a:`Изпращане до ${s.dispatchHours} часа. Посоченият срок за доставка е ${s.deliveryEstimate}. Сроковете се отнасят за налични продукти; при промяна ще се свържем с теб.`},
  ...(slug==='olfazeta-chogan-dostavka'?[{q:'Как да избера подходящия аромат?',a:'Използвай теста за аромат на Tiarra. Той подрежда наличните парфюми според избраните нотки и предпочитания. Препоръките са ориентировъчни; показаните нотки са в страницата на всеки продукт.'}]:[]),
  ...(slug==='nish-lady-komplekti-za-kosa'?[{q:'Как да избера комплект за боядисана коса?',a:'Започни със серията „Защита на цвета“, когато е налична, и прочети описанието на конкретния комплект. При изсветлена, къдрава или суха коса изборът зависи и от състоянието ѝ. Пиши ни какъв е типът на косата ти, за да помогнем с избора. За употреба и честота следвай указанията върху продуктите.'}]:[])
 ]
}
