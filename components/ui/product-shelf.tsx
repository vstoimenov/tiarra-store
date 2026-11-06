'use client'

// Shelf composition inspired by Product Shelf, designed and built by Aakash Mehra.
// Real Tiarra photography, variants, availability and cart replace the sample catalogue.
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowUpRight, ShoppingBag, X } from 'lucide-react'
import type { Product, ProductCard } from '@/lib/catalog/types'
import { imageUrl } from '@/lib/images'
import { formatPrice } from '@/lib/format'
import { addCartItem } from '@/lib/cart'
import { trackCommerce } from '@/lib/analytics'
import { initialVariantId, resolveVariantState } from '@/lib/catalog/variant'
import { BuyBox } from '@/components/product/BuyBox'
import styles from './product-shelf.module.css'

function ShelfDetails({product}:{product:Product}){
 const [variant,setVariant]=useState(()=>initialVariantId(product)),[message,setMessage]=useState('')
 const state=resolveVariantState(product,variant)
 const reduce=useReducedMotion(),angle=useMotionValue(0),drag=useRef<number|null>(null)
 useEffect(()=>{trackCommerce('view_item',{currency:'EUR',value:product.price,items:[{item_id:product.id,item_name:product.title,price:product.price,quantity:1}]})},[product])
 function add(quantity:number){
  try{const choice=product.variants.find(v=>v.id===variant);addCartItem({key:`${product.id}:${variant??'default'}`,productId:product.id,slug:product.slug,title:product.title,imagePath:state.imagePath,variantId:variant,variantName:choice?.name??null,unitPrice:state.price,quantity});trackCommerce('add_to_cart',{currency:'EUR',value:state.price*quantity,items:[{item_id:variant??product.id,item_name:product.title,price:state.price,quantity}]});setMessage('Продуктът е добавен в количката.')}catch{setMessage('Количката не може да се запази. Разреши съхранението в браузъра и опитай отново.')}
 }
 return <div className={styles.detailGrid}>
  <div className={styles.stage}><motion.div className={styles.productImage} style={{rotateY:angle}} initial={reduce?false:{opacity:0,y:25}} animate={{opacity:1,y:0}} transition={{type:'spring',bounce:.1,duration:.7}} onPointerDown={e=>{if(reduce)return;drag.current=e.clientX;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag.current!==null)angle.set(Math.max(-25,Math.min(25,(e.clientX-drag.current)/5)))}} onPointerUp={()=>{drag.current=null;animate(angle,0,{type:'spring',stiffness:160,damping:20})}} onPointerCancel={()=>{drag.current=null;angle.set(0)}}><img src={imageUrl(state.imagePath??'site/logo',800)} alt={product.title} draggable={false}/></motion.div><div className={styles.pedestal} aria-hidden="true"/><small>Разгледай продукта отблизо</small></div>
  <div className={styles.detailText}><p className={styles.eyebrow}>{product.brand??'TIARRA COSMETICS'}</p><h2>{product.title}</h2><div className={styles.tags}>{product.categories.map(c=><Link key={c.id} href={`/store/category/${c.slug}`}>{c.name}</Link>)}</div><BuyBox product={product} variantId={variant} onVariantChange={id=>{setVariant(id);setMessage('')}} onAdd={({quantity})=>add(quantity)} showStickyDock={false}/><p role="status" className={styles.message}>{message}</p><div className={styles.detailActions}><Link href={`/store/${product.slug}`}>Пълно описание <ArrowUpRight size={15}/></Link><Link href="/cart"><ShoppingBag size={15}/> Към количката</Link></div>{product.descriptionHtml&&<details className={styles.description}><summary>За продукта</summary><div dangerouslySetInnerHTML={{__html:product.descriptionHtml}}/></details>}</div>
 </div>
}
function ShelfDialog({card,onClose}:{card:ProductCard;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId()
 const [product,setProduct]=useState<Product|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{const node=dialog.current;node?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{node?.close();document.body.style.overflow=overflow}},[])
 useEffect(()=>{const controller=new AbortController();setError('');setProduct(null);fetch(`/api/catalog/products/${encodeURIComponent(card.slug)}`,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);if(!controller.signal.aborted)setProduct(data.product)}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Продуктът не може да се зареди.')});return()=>controller.abort()},[card.slug,retry])
 return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={onClose} onClose={onClose}><div className={styles.dialogBar}><button type="button" onClick={onClose} autoFocus><ArrowLeft size={17}/> Към рафта</button><span id={titleId}>TIARRA · {card.brand??'Продуктова селекция'}</span><button type="button" onClick={onClose} aria-label="Затвори продукта"><X size={20}/></button></div>{product?<ShelfDetails product={product}/>:<div className={styles.loading} role="status">{error?<><p>{error}</p><button type="button" onClick={()=>setRetry(v=>v+1)}>Опитай отново</button><Link href={`/store/${card.slug}`}>Отвори страницата на продукта</Link></>:<><img src={imageUrl(card.imagePath??'site/logo',400)} alt=""/><p>Зареждане на продукта…</p></>}</div>}</dialog>
}
export function ProductShelf({cards}:{cards:ProductCard[]}){
 const [selected,setSelected]=useState<ProductCard|null>(null)
 const reduce=useReducedMotion()
 return <div className={styles.shelf}><div className={styles.shelfIntro}><span>THE TIARRA EDIT</span><p>Твоят следващ любим продукт.<br/><strong>Разгледай. Избери. Открий.</strong></p></div><ul className={styles.products}>{cards.map((card,i)=><li key={card.slug} className={styles.item}><div className={styles.display}><motion.button type="button" onClick={()=>setSelected(card)} whileHover={reduce?undefined:{y:-10}} whileTap={reduce?undefined:{scale:.97}} transition={{type:'spring',stiffness:240,damping:24}} aria-label={`Разгледай ${card.title}`}><img src={imageUrl(card.imagePath??'site/logo',400)} alt={card.title} loading={i<4?'eager':'lazy'} decoding="async" width="300" height="340" draggable={false}/>{!card.inStock&&<span className={styles.out}>Изчерпан</span>}</motion.button><span className={styles.plank} aria-hidden="true"/></div><div className={styles.caption}><small>{card.brand??'TIARRA'}</small><Link href={`/store/${card.slug}`}>{card.title}</Link><p>{card.hasVariants&&<span>от </span>}{formatPrice(card.price)}{card.compareAtPrice!==null&&card.compareAtPrice>card.price&&<s>{formatPrice(card.compareAtPrice)}</s>}</p></div></li>)}</ul>{selected&&<ShelfDialog key={selected.slug} card={selected} onClose={()=>setSelected(null)}/>}</div>
}
