'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react'
import type { StoreTheme } from '@/lib/sections/schema'
import styles from './ThemeStudio.module.css'
import controls from './ThemeStudioControls.module.css'

export function ThemeStudio({ initialTheme }: { initialTheme: StoreTheme }) {
  const router = useRouter()
  const [preview, setPreview] = useState<StoreTheme>(initialTheme)
  const [active, setActive] = useState<StoreTheme>(initialTheme)
  const [pending, setPending] = useState<StoreTheme | null>(null)
  const [message, setMessage] = useState('')
  async function activate(theme: StoreTheme) {
    setPending(theme); setMessage('')
    try {
      const response = await fetch('/api/admin/appearance', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Темата не беше сменена.')
      setActive(body.theme); setPreview(body.theme)
      setMessage(body.theme === 'classic' ? 'Tiarra Classic е възстановена.' : 'Tiarra Boost е активирана.')
      router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Няма връзка.') }
    finally { setPending(null) }
  }

  return <main className={styles.page}>
    <header className={styles.heading}>
      <div><small>ВИЗИЯ НА МАГАЗИНА</small><h1>Теми</h1><p>Прегледай тема и я активирай. Изборът се записва за всички посетители.</p></div>
      <a href="/" target="_blank" rel="noreferrer">Отвори магазина ↗</a>
    </header>

    <section className={styles.choices} aria-label="Теми">
      <article className={preview === 'classic' ? styles.selected : ''}>
        <div className={`${styles.swatch} ${styles.classicSwatch}`}><span>TIARRA</span><i/><i/><i/></div>
        <div><span className={active === 'classic' ? styles.active : styles.ready}>{active === 'classic' ? <><Check size={13}/> АКТИВНА</> : 'НАЛИЧНА'}</span><h2>Tiarra Classic</h2><p>Оригиналната изчистена черно-златна визия.</p></div>
        <div className={controls.actions}><button type="button" onClick={() => setPreview('classic')}><Eye size={16}/> Преглед</button><button className={controls.apply} type="button" disabled={active === 'classic' || pending !== null} onClick={() => activate('classic')}>{pending === 'classic' ? 'Връщане…' : active === 'classic' ? 'Активна' : 'Върни темата'}</button></div>
      </article>
      <article className={preview === 'boost' ? styles.selected : ''}>
        <div className={`${styles.swatch} ${styles.boostSwatch}`}><span>TIARRA</span><b>BEAUTY, ELEVATED.</b><i/><i/><i/></div>
        <div><span className={active === 'boost' ? styles.active : styles.ready}>{active === 'boost' ? <><Check size={13}/> АКТИВНА</> : <><Sparkles size={13}/> НОВА ТЕМА</>}</span><h2>Tiarra Boost</h2><p>Оригинална conversion тема с усещане, близко до Shrine.</p></div>
        <div className={controls.actions}><button type="button" onClick={() => setPreview('boost')}><Eye size={16}/> Преглед</button><button className={controls.apply} type="button" disabled={active === 'boost' || pending !== null} onClick={() => activate('boost')}>{pending === 'boost' ? 'Активиране…' : active === 'boost' ? 'Активна' : 'Активирай'}</button></div>
      </article>
    </section>

    <section className={styles.preview} aria-live="polite">
      <div className={styles.browser}><i/><i/><i/><span>tiarra-store.vercel.app</span></div>
      {preview === 'classic' ? <ClassicPreview/> : <BoostPreview/>}
    </section>

    {message && <p className={controls.message} role="status">{message}</p>}
    <aside className={styles.note}><strong>{preview === active ? 'Активната тема' : 'Само преглед'}</strong><p>{preview === active ? 'Тази тема се използва в публичния магазин.' : 'Натисни „Активирай“, за да приложиш този дизайн за всички посетители.'}</p></aside>
  </main>
}

function ClassicPreview() {
  return <div className={`${styles.store} ${styles.classic}`}><nav><strong>TIARRA</strong><span>ЗА НЕЯ　 ЗА НЕГО　 ПАРФЮМИ　 КОМПЛЕКТИ</span><b>КОЛИЧКА</b></nav><div className={styles.classicHero}><small>BEAUTY IS A STATEMENT</small><h3>Грижа, която се усеща</h3><button>РАЗГЛЕДАЙ</button></div><div className={styles.miniProducts}>{['01','02','03'].map(x=><i key={x}>{x}</i>)}</div></div>
}

function BoostPreview() {
  return <div className={`${styles.store} ${styles.boost}`}><div className={styles.announce}>БЕЗПЛАТНА ДОСТАВКА НАД 39 €</div><nav><strong>TIARRA</strong><span>Магазин　 Ново　 Бестселъри</span><b>0</b></nav><div className={styles.boostHero}><div><small>ПРОФЕСИОНАЛНА КОЗМЕТИКА</small><h3>Beauty,<br/><em>elevated.</em></h3><p>Подбрани формули за ежедневен ритуал с видим резултат.</p><button>ПАЗАРУВАЙ СЕГА　→</button><ul><li><ShieldCheck size={14}/> Оригинални продукти</li><li><Truck size={14}/> Бърза доставка</li><li><Star size={14}/> 290+ клиента</li></ul></div><div className={styles.productMock}><span>BESTSELLER</span><i>TIARRA</i><strong>Signature care</strong><small>Професионална серия</small></div></div><div className={styles.proof}><b>4.9/5 ОЦЕНКА</b><span>ПРЕГЛЕД ПРЕДИ ПЛАЩАНЕ</span><span>14 ДНИ ВРЪЩАНЕ</span></div></div>
}
