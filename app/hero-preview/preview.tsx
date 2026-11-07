'use client'
import Link from 'next/link'
import { useEffect,useRef } from 'react'
import styles from './preview.module.css'
type Product={slug:string;title:string;image:string}
export function HeroPreview({products}:{products:Product[]}){
 const root=useRef<HTMLElement>(null)
 useEffect(()=>{
  const el=root.current;if(!el)return
  const reduced=matchMedia('(prefers-reduced-motion: reduce)')
  const cards=Array.from(el.querySelectorAll<HTMLElement>('[data-tunnel-card]'))
  let frame=0,current=0,target=0,last=0,pointerX=0,pointerY=0
  const scroll=()=>{const box=el.getBoundingClientRect();target=Math.max(0,Math.min(1,-box.top/Math.max(1,box.height-innerHeight)))}
  const pointer=(event:PointerEvent)=>{pointerX=(event.clientX/innerWidth-.5)*2;pointerY=(event.clientY/innerHeight-.5)*2}
  const tick=(now:number)=>{
   const dt=last?Math.min((now-last)/1000,.05):0;last=now;current+=(target-current)*(1-Math.exp(-dt*7))
   const mobile=innerWidth<768,width=innerWidth,height=innerHeight
   cards.forEach((card,index)=>{const start=index/cards.length*.45;const p=Math.max(0,Math.min(1,(current-start)/.55));const angle=index*137.5*Math.PI/180;const x=Math.cos(angle)*width*(.28+(index%3)*.08)-pointerX*(mobile?0:45);const y=Math.sin(angle)*height*(.26+(index%2)*.09)-pointerY*(mobile?0:45);const z=(mobile?-1200:-1700)+p*(mobile?1550:2200);const opacity=Math.min(1,p/.18,(1-p)/.18);card.style.transform=`translate3d(calc(-50% + ${x}px),calc(-50% + ${y}px),${z}px) rotateZ(${(index%2===0?1:-1)*(3+index%5*2)}deg)`;card.style.opacity=String(Math.max(0,opacity))})
   el.style.setProperty('--progress',String(current));frame=requestAnimationFrame(tick)
  }
  if(!reduced.matches){scroll();window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('pointermove',pointer,{passive:true});frame=requestAnimationFrame(tick)}else el.dataset.reduced='true'
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',scroll);window.removeEventListener('pointermove',pointer)}
 },[])
 return <section ref={root} className={styles.story}><div className={styles.stage}><div className={styles.grid}/><div className={styles.glow}/><div className={styles.ring}/><div className={styles.ringOuter}/><div className={styles.copy}><p>TIARRA COSMETICS</p><h1>КРАСОТАТА<br/><em>ОТБЛИЗО.</em></h1><span>Парфюми и козметика, подбрани за твоето ежедневие.</span><Link href="/store">РАЗГЛЕДАЙ МАГАЗИНА ↗</Link></div><div className={styles.cards} aria-hidden="true">{products.map((product,index)=><div key={product.slug} className={styles.card} data-tunnel-card style={{zIndex:index+1}}><img src={product.image} alt="" loading="eager" decoding="async"/><span>{product.title}</span></div>)}</div><div className={styles.scroll}>ПРЕВЪРТИ, ЗА ДА ОТКРИЕШ <i/></div><div className={styles.badge}>ПРЕГЛЕД НА КОНЦЕПЦИЯ</div></div></section>
}
