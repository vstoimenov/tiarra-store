'use client'

import { useState } from 'react'
import { Check, Eye, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react'
import styles from './ThemeStudio.module.css'

type Preview = 'current' | 'boost'

export function ThemeStudio() {
  const [preview, setPreview] = useState<Preview>('boost')

  return <main className={styles.page}>
    <header className={styles.heading}>
      <div><small>ВИЗИЯ НА МАГАЗИНА</small><h1>Теми</h1><p>Сравни дизайните тук. Публичният магазин остава с настоящата тема, докато не одобриш друга.</p></div>
      <a href="/" target="_blank" rel="noreferrer">Отвори магазина ↗</a>
    </header>

    <section className={styles.choices} aria-label="Теми">
      <article className={preview === 'current' ? styles.selected : ''}>
        <div className={`${styles.swatch} ${styles.classicSwatch}`}><span>TIARRA</span><i/><i/><i/></div>
        <div><span className={styles.active}><Check size={13}/> АКТИВНА</span><h2>Tiarra Classic</h2><p>Сегашната изчистена черно-златна визия.</p></div>
        <button type="button" onClick={() => setPreview('current')}><Eye size={16}/> Преглед</button>
      </article>
      <article className={preview === 'boost' ? styles.selected : ''}>
        <div className={`${styles.swatch} ${styles.boostSwatch}`}><span>TIARRA</span><b>BEAUTY, ELEVATED.</b><i/><i/><i/></div>
        <div><span className={styles.ready}><Sparkles size={13}/> НОВА КОНЦЕПЦИЯ</span><h2>Tiarra Boost</h2><p>Оригинална conversion тема с усещане, близко до Shrine.</p></div>
        <button type="button" onClick={() => setPreview('boost')}><Eye size={16}/> Преглед</button>
      </article>
    </section>

    <section className={styles.preview} aria-live="polite">
      <div className={styles.browser}><i/><i/><i/><span>tiarra-store.vercel.app</span></div>
      {preview === 'current' ? <ClassicPreview/> : <BoostPreview/>}
    </section>

    <aside className={styles.note}><strong>{preview === 'current' ? 'Активната тема' : 'Концепцията е готова за преглед'}</strong><p>{preview === 'current' ? 'Това е посоката на магазина в момента.' : 'Провери посоката и разположението. Активиране ще направим само след твоето изрично одобрение.'}</p></aside>
  </main>
}

function ClassicPreview() {
  return <div className={`${styles.store} ${styles.classic}`}><nav><strong>TIARRA</strong><span>ЗА НЕЯ　 ЗА НЕГО　 ПАРФЮМИ　 КОМПЛЕКТИ</span><b>КОЛИЧКА</b></nav><div className={styles.classicHero}><small>BEAUTY IS A STATEMENT</small><h3>Грижа, която се усеща</h3><button>РАЗГЛЕДАЙ</button></div><div className={styles.miniProducts}>{['01','02','03'].map(x=><i key={x}>{x}</i>)}</div></div>
}

function BoostPreview() {
  return <div className={`${styles.store} ${styles.boost}`}><div className={styles.announce}>БЕЗПЛАТНА ДОСТАВКА НАД 39 €</div><nav><strong>TIARRA</strong><span>Магазин　 Ново　 Бестселъри</span><b>0</b></nav><div className={styles.boostHero}><div><small>ПРОФЕСИОНАЛНА КОЗМЕТИКА</small><h3>Beauty,<br/><em>elevated.</em></h3><p>Подбрани формули за ежедневен ритуал с видим резултат.</p><button>ПАЗАРУВАЙ СЕГА　→</button><ul><li><ShieldCheck size={14}/> Оригинални продукти</li><li><Truck size={14}/> Бърза доставка</li><li><Star size={14}/> 290+ клиента</li></ul></div><div className={styles.productMock}><span>BESTSELLER</span><i>TIARRA</i><strong>Signature care</strong><small>Професионална серия</small></div></div><div className={styles.proof}><b>4.9/5 ОЦЕНКА</b><span>ПРЕГЛЕД ПРЕДИ ПЛАЩАНЕ</span><span>14 ДНИ ВРЪЩАНЕ</span></div></div>
}
