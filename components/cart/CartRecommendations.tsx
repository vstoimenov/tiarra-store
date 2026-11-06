'use client'
import { useEffect, useState } from 'react'
import { type CartItem, addCartItem } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import { imageUrl } from '@/lib/images'
import styles from './CartClient.module.css'
type Bump = {productId: string;slug: string;title: string;imagePath: string|null;unitPrice:number}
export function CartRecommendations({items,onAdded}:{items:CartItem[];onAdded:()=>void}) {
  const [bumps,setBumps]=useState<Bump[]>([])
  const ids=JSON.stringify([...new Set(items.map(item=>item.productId))].slice(0,50))
  useEffect(()=>{
    const controller=new AbortController()
    if(ids==='[]')return
    fetch('/api/orders/bumps',{method:'POST',headers:{'Content-Type':'application/json'},body:`{"productIds":${ids}}`,signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{if(!controller.signal.aborted)setBumps(data.bumps)}).catch(()=>{if(!controller.signal.aborted)setBumps([])})
    return()=>controller.abort()
  },[ids])
  const choices=bumps.filter(b=>!items.some(i=>i.productId===b.productId))
  if(!choices.length)return null
  return <section className={styles.recommendations}><h3>Подходящо допълнение</h3>{choices.map(b=><div key={b.productId}>{b.imagePath&&<img src={imageUrl(b.imagePath,400)} width={48} height={48} alt="" loading="lazy"/>}<span>{b.title}<strong>{formatPrice(b.unitPrice)}</strong></span><button type="button" onClick={()=>{addCartItem({...b,key:`${b.productId}:default`,variantId:null,variantName:null,quantity:1,source:'bump'});onAdded()}} aria-label={`Добави ${b.title}`}>+ Добави</button></div>)}</section>
}
