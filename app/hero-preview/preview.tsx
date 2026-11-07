'use client'
import Link from 'next/link'
import { useEffect,useRef } from 'react'
import styles from './preview.module.css'
type Product={slug:string;title:string;image:string}
export function HeroPreview({products}:{products:Product[]}){
 const root=useRef<HTMLElement>(null)
 useEffect(()=>{const el=root.current;if(!el)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const box=el.getBoundingClientRect();const progress=Math.max(0,Math.min(1,-box.top/Math.max(1,box.height-innerHeight)));el.style.setProperty('--progress',String(progress))})};window.addEventListener('scroll',update,{passive:true});if(!reduced.matches)update();return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update)}},[])
 return <section ref={root} className={styles.story}><div className={styles.stage}><div className={styles.glow}/><div className={styles.ring}/><div className={styles.cards} aria-hidden="true">{products.map((product,index)=><div key={product.slug} className={`${styles.card} ${styles[`card${index}`]}`}><img src={product.image} alt="" loading={index<4?'eager':'lazy'} decoding="async"/></div>)}</div><div className={styles.copy}><p>СВЕТЪТ НА TIARRA COSMETICS</p><h1>Красотата има<br/><em>свое присъствие.</em></h1><span>Открий грижата, която те кара да се чувстваш добре в своята кожа.</span><Link href="/store">РАЗГЛЕДАЙ МАГАЗИНА <b>↗</b></Link></div><div className={styles.scroll}>ПРЕВЪРТИ, ЗА ДА ОТКРИЕШ <i/></div><div className={styles.badge}>ПРЕГЛЕД НА КОНЦЕПЦИЯ</div></div></section>
}
