'use client'
import { useId } from 'react'
import { ShoppingBag, ShoppingCart, CircleCheck } from 'lucide-react'
import styles from './TruckOrderButton.module.css'
export type TruckPhase='idle'|'packing'|'truck'|'driving'|'done'
export function TruckOrderButton({phase,disabled}:{phase:TruckPhase;disabled:boolean}){
 const gradient='truck-'+useId().replace(/[^a-zA-Z0-9_-]/g,'')
 const accepted=phase==='driving'||phase==='done'
 return <div className={styles.wrap}><button type="submit" className={styles.button} data-phase={phase} disabled={disabled} aria-label={accepted?'Поръчано':phase==='idle'?'Купи сега':'Изпращане на поръчката…'} aria-busy={phase!=='idle'&&!accepted}>
  <span className={styles.done} aria-hidden="true"><CircleCheck/><span>Поръчано</span></span>
  <span className={styles.bg}/>
  <span className={`${styles.center} ${styles.label}`} aria-hidden="true"><ShoppingBag/><span>Купи сега</span></span>
  <span className={`${styles.center} ${styles.cart}`} aria-hidden="true"><ShoppingCart/></span><span className={styles.box} aria-hidden="true"/>
  <span className={styles.truck} aria-hidden="true"><span className={styles.lines}><i/><i/><i/></span><svg viewBox="0 0 132 70"><defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7a35"/><stop offset=".6" stopColor="#ff5a1f"/><stop offset="1" stopColor="#e0430f"/></linearGradient></defs><ellipse cx="68" cy="64" rx="54" ry="4" fill="#0003"/><g className={styles.body}><rect x="8" y="8" width="78" height="44" rx="8" fill={`url(#${gradient})`}/><rect x="8" y="44" width="78" height="8" rx="3" fill="#0001"/><rect x="18" y="17" width="20" height="18" rx="3.5" fill="#fff"/><path d="M28 17v18M18 26h20" stroke="#ff5a1f" strokeWidth="2.4"/><path d="M84 20h18.5c3 0 5.6 1.5 7.2 4l8.7 12.5c1 1.5 1.6 3.3 1.6 5.1V49a3 3 0 0 1-3 3H84z" fill={`url(#${gradient})`}/><path d="M92 24.5h9.6c1.6 0 3 .8 3.9 2.1l5.5 8.2H92z" fill="#fff4ec"/><rect x="115" y="40" width="5" height="4" rx="1.5" fill="#fff6c9"/><rect x="112" y="48" width="10" height="4.5" rx="2.2" fill="#e8e3df"/></g>{[32,102].map(x=><g key={x} className={styles.wheel}><circle cx={x} cy="54" r="9" fill="#2a2522"/><circle cx={x} cy="54" r="3.8" fill="#d9d4cf"/><rect x={x-1} y="46.5" width="2" height="4" rx="1" fill="#6b6460"/></g>)}</svg></span>
 </button></div>
}
