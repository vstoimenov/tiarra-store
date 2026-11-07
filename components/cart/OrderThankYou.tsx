'use client'
import Link from 'next/link'
import { useEffect,useRef,useState } from 'react'
import type { CartItem } from '@/lib/cart'
import type { ProductCard as Card } from '@/lib/catalog/types'
import { ProductCard } from '@/components/product/ProductCard'
import { formatPrice } from '@/lib/format'
import styles from './OrderThankYou.module.css'

export type Confirmation={number:string;total:number;courier:string;delivery:string;items:CartItem[]}
export function OrderThankYou({order}:{order:Confirmation}){
 const heading=useRef<HTMLHeadingElement>(null),[cards,setCards]=useState<Card[]>([])
 useEffect(()=>{
  window.scrollTo({top:0,left:0,behavior:'instant'});heading.current?.focus({preventScroll:true})
  const controller=new AbortController()
  fetch('/api/checkout/recommendations',{signal:controller.signal}).then(response=>response.ok?response.json():null).then(data=>{if(!data||controller.signal.aborted||!Array.isArray(data.cards))return;const purchased=new Set(order.items.map(item=>item.slug));setCards((data.cards as Card[]).filter(card=>!purchased.has(card.slug)).slice(0,4))}).catch(()=>{})
  return()=>controller.abort()
 },[order.items])
 return <div className={styles.wrap}>
  <section className={styles.hero} aria-labelledby="order-confirmation-heading"><div className={styles.mark} aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="m8 16 5 5L24 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div><p className={styles.eyebrow}>ПОРЪЧКАТА Е ПРИЕТА</p><h1 id="order-confirmation-heading" ref={heading} tabIndex={-1}>Благодарим ти<span>.</span></h1><p className={styles.lead}>Радваме се, че избра Tiarra Cosmetics. Поръчката ти е записана успешно.</p><div className={styles.number}><span>НОМЕР НА ПОРЪЧКАТА</span><strong>№ {order.number}</strong></div></section>
  <div className={styles.columns}><section className={styles.panel}><span className={styles.kicker}>КАКВО СЛЕДВА</span><h2>От нас до теб</h2><div className={styles.steps}><div><span>01</span><p><strong>Подготвяме поръчката</strong>Ще се свържем с теб за потвърждение.</p></div><div><span>02</span><p><strong>Изпращаме с {order.courier==='econt'?'Еконт':'Спиди'}</strong>Към избрания адрес, офис или автомат.</p></div><div><span>03</span><p><strong>Плащаш при получаване</strong>Обща сума: {formatPrice(order.total)}.</p></div></div></section><section className={styles.panel}><span className={styles.kicker}>ТВОЯТА ПОРЪЧКА</span><h2>Всичко на едно място</h2><div className={styles.items}>{order.items.map(item=><div key={item.key}><span>{item.title}{item.variantName?` — ${item.variantName}`:''}<small>Количество: {item.quantity}</small></span></div>)}</div><div className={styles.total}><span>Общо за плащане</span><strong>{formatPrice(order.total)}</strong></div><p className={styles.address}><strong>Доставка с {order.courier==='econt'?'Еконт':'Спиди'}</strong><br/>{order.delivery}</p></section></div>
  <div className={styles.help}><p><strong>Нужда от помощ?</strong><br/>Свържи се с нас и посочи номер на поръчката.</p><a href="mailto:info@tiarracosmetics.com">info@tiarracosmetics.com ↗</a></div>
  {cards.length>0&&<section className={styles.recommendations}><div className={styles.recHead}><div><span className={styles.kicker}>ОЩЕ ЗА ТЕБ</span><h2>Открий още от Tiarra</h2></div><Link href="/store">Всички продукти ↗</Link></div><div className={styles.grid}>{cards.map(card=><ProductCard key={card.slug} card={card} sizes="(min-width:900px) 280px, 45vw"/>)}</div></section>}
  <div className={styles.back}><Link href="/store">Продължи към магазина →</Link></div>
 </div>
}
