import { Truck, CircleCheck } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import styles from './FreeShippingProgress.module.css'

export function FreeShippingProgress({subtotal,threshold}:{subtotal:number;threshold:number}){
 const totalCents=Math.max(0,Math.round(subtotal*100))
 const thresholdCents=Math.max(0,Math.round(threshold*100))
 const remaining=Math.max(0,thresholdCents-totalCents)/100
 const complete=remaining===0
 const progress=thresholdCents===0?100:Math.min(100,totalCents/thresholdCents*100)
 return <section className={styles.card} data-complete={complete||undefined} aria-label="Безплатна доставка">
  <div className={styles.content} aria-live="polite" aria-atomic="true">
   <span className={styles.icon} aria-hidden="true">{complete?<CircleCheck size={25} strokeWidth={2}/>:<Truck size={25} strokeWidth={2}/>}</span>
   <div className={styles.copy}>{complete?<><strong className={styles.success}>Доставката е безплатна!</strong><span>За твоята поръчка</span></>:<><span className={styles.amount}>Още <strong>{formatPrice(remaining)}</strong></span><span>до безплатна доставка</span></>}</div>
  </div>
  <div className={styles.track} role="progressbar" aria-label="Напредък до безплатна доставка" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={complete?'Безплатната доставка е достигната':`Остават ${formatPrice(remaining)} до безплатна доставка`}><span style={{width:`${progress}%`}}/></div>
 </section>
}
