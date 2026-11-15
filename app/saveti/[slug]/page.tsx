import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductCards } from '@/lib/catalog/queries'
import { getCommerceSettings } from '@/lib/commerce-settings'
import { getSiteDocument } from '@/lib/site/documents'
import { ProductCard } from '@/components/product/ProductCard'
import { GuideLinks } from '@/components/guides/GuideLinks'
import { guides,guideSlugs,isGuideSlug,guideProducts,guideFaq } from '@/lib/geo/guides'
import { faqJsonLd } from '@/lib/sections/faq-jsonld'
import { serializeJsonLd } from '@/lib/seo/product-jsonld'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { siteUrl } from '@/lib/site/url'
import styles from '@/components/guides/Guides.module.css'
export const revalidate=300
export const dynamicParams=false
export function generateStaticParams(){return guideSlugs.map(slug=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!isGuideSlug(slug))return {};return pageMetadata({title:guides[slug].title+' | Tiarra Cosmetics',description:guides[slug].description,path:'/saveti/'+slug})}
export default async function GuidePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;if(!isGuideSlug(slug))notFound()
 const [cards,commerce,settings]=await Promise.all([getProductCards({availableVariantPrice:true}),getCommerceSettings(),getSiteDocument('settings')])
 const products=guideProducts(slug,cards),faq=guideFaq(slug,commerce,cards),guide=guides[slug],url=siteUrl()+'/saveti/'+slug
 const schema=[faqJsonLd(faq.map(item=>({q:item.q,aHtml:item.a}))),{'@context':'https://schema.org','@type':'CollectionPage',name:guide.title,url,mainEntity:{'@type':'ItemList',numberOfItems:products.length,itemListElement:products.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.title,url:siteUrl()+'/store/'+encodeURIComponent(p.slug)}))}},{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Начало',item:siteUrl()},{'@type':'ListItem',position:2,name:guide.title,item:url}]}]
 return <><main className={styles.page}><nav className={styles.crumbs} aria-label="Път до страницата"><Link href="/">Начало</Link><span>/</span><span>Съвети и подборки</span></nav><header className={styles.intro}><p className={styles.kicker}>ПОДБОРКАТА НА TIARRA</p><h1>{guide.title}</h1><p>{faq[0].a}</p><div className={styles.facts}><span>{products.length} налични предложения</span><span>Изпращане до {commerce.dispatchHours} ч.</span><span>Доставка: {commerce.deliveryEstimate}</span></div><div className={styles.actions}><a href="#predlozheniya">Разгледай предложенията</a>{slug==='olfazeta-chogan-dostavka'?<Link href="/aromat-test">Открий своя аромат</Link>:<a href={'mailto:'+settings.company.email}>Попитай за съвет</a>}</div></header><section id="predlozheniya" aria-label="Налични продукти"><h2>Налични предложения и актуални цени</h2><p>{faq[1].a}</p>{products.length?<div className={styles.grid}>{products.map((p,i)=><ProductCard key={p.slug} card={p} priority={i<2}/>)}</div>:<Link href="/store">Разгледай магазина</Link>}</section><section className={styles.faq}><h2>Преди да поръчаш</h2>{faq.map(item=><article key={item.q}><h3>{item.q}</h3><p>{item.a}</p></article>)}<p><Link href="/dostavka-plashtane">Доставка и плащане</Link> · <Link href="/vrashtane-zamyana">Връщане и замяна</Link> · <Link href="/promo/kontakti">Контакти</Link></p></section><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(schema)}}/></main><GuideLinks/></>
}
