'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Flower2, Leaf, Sparkles, Sun, Trees, Flame, Gift, UserRound, Droplets, Wallet } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import { recommendPerfumes, type Family, type QuizProduct } from '@/lib/quiz/perfume'
import type { Gender } from '@/lib/catalog/types'
import styles from './PerfumeQuiz.module.css'

type GenderChoice = Gender | 'any'
const families: { id: Family; title: string; detail: string; icon: typeof Leaf }[] = [
  { id: 'fruity', title: 'Плодови', detail: 'круша, праскова, плодове', icon: Sun },
  { id: 'floral', title: 'Флорални', detail: 'роза, жасмин, цветя', icon: Flower2 },
  { id: 'fresh', title: 'Свежи', detail: 'цитруси, морски и зелени нотки', icon: Droplets },
  { id: 'sweet', title: 'Сладки', detail: 'ванилия, карамел, кокос', icon: Sparkles },
  { id: 'spicy', title: 'Пикантни и кожени', detail: 'подправки, кожа, тютюн', icon: Flame },
  { id: 'woody', title: 'Дървесни', detail: 'кедър, сандал, пачули', icon: Trees },
]
const genderOptions: { id: GenderChoice; title: string; detail: string }[] = [
  { id: 'female', title: 'За нея', detail: 'Дамски и унисекс аромати' },
  { id: 'male', title: 'За него', detail: 'Мъжки и унисекс аромати' },
  { id: 'unisex', title: 'Унисекс', detail: 'Аромати за всеки' },
  { id: 'any', title: 'Всички аромати', detail: 'Без предпочитание' },
]
const budgets = [ { id: 25, title: 'До 25 €' }, { id: 50, title: 'До 50 €' }, { id: 100, title: 'До 100 €' }, { id: null, title: 'Без ограничение' } ]

export function PerfumeQuiz({ products }: { products: QuizProduct[] }) {
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState<GenderChoice>('any')
  const [selected, setSelected] = useState<Family[]>([])
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const results = step === 4 ? recommendPerfumes(products, { gender, families: selected, maxPrice }) : []

  function toggleFamily(id: Family) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : current)
  }
  function reset() { setGender('any'); setSelected([]); setMaxPrice(null); setStep(0) }

  return <main className={styles.page}>
    {step === 0 ? <section className={styles.hero}>
      <p className={styles.eyebrow}>TIARRA · ТЕСТ ЗА АРОМАТ</p>
      <h1>Открий аромат, който ти подхожда</h1>
      <p className={styles.heroText}>Разкажи ни какво харесваш и открий предложения от нашите парфюми.</p>
      <button type="button" className={styles.primary} onClick={() => setStep(1)}>Започни теста <ArrowRight size={18} /></button>
      <div className={styles.heroDetails}><span><Sparkles size={16} /> 3 кратки въпроса</span><span><Gift size={16} /> За теб или за подарък</span><span><UserRound size={16} /> Без регистрация</span></div>
    </section> : <section className={styles.quiz}>
      <div className={styles.progressRow}>
        <button type="button" className={styles.back} onClick={() => setStep(step - 1)}><ArrowLeft size={17} /> Назад</button>
        <div className={styles.progress} role="progressbar" aria-label="Напредък на теста" aria-valuemin={0} aria-valuemax={3} aria-valuenow={Math.min(step, 3)}><span style={{ width: `${Math.min(step, 3) / 3 * 100}%` }} /></div>
        <span className={styles.progressLabel}>{Math.min(step, 3)} / 3</span>
      </div>
      {step === 1 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 1 ОТ 3</p><h1>Какъв аромат търсиш?</h1><p>Избери за кого е парфюмът.</p>
        <div className={styles.options}>{genderOptions.map((option) => <button type="button" className={styles.option} key={option.id} aria-pressed={gender === option.id} onClick={() => { setGender(option.id); setStep(2) }}><UserRound size={25} /><strong>{option.title}</strong><span>{option.detail}</span></button>)}</div>
      </div>}
      {step === 2 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 2 ОТ 3</p><h1>Кои аромати те привличат?</h1><p>Избери до два или продължи, ако не си сигурен.</p>
        <div className={styles.options}>{families.map(({ id, title, detail, icon: Icon }) => <button type="button" className={styles.option} key={id} aria-pressed={selected.includes(id)} onClick={() => toggleFamily(id)}><Icon size={25} /><strong>{title}</strong><span>{detail}</span>{selected.includes(id) && <Check className={styles.check} size={17} />}</button>)}</div>
        <button type="button" className={styles.primary} onClick={() => setStep(3)}>Напред <ArrowRight size={18} /></button>
      </div>}
      {step === 3 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 3 ОТ 3</p><h1>Какъв е твоят бюджет?</h1><p>Ще се съобразим с началната цена на парфюма.</p>
        <div className={styles.options}>{budgets.map((option) => <button type="button" className={styles.option} key={option.title} aria-pressed={maxPrice === option.id} onClick={() => { setMaxPrice(option.id); setStep(4) }}><Wallet size={25} /><strong>{option.title}</strong></button>)}</div>
      </div>}
      {step === 4 && <div className={styles.results} aria-live="polite">
        <p className={styles.eyebrow}>ТВОЯТ РЕЗУЛТАТ</p><h1>Аромати за теб</h1>
        {results.length ? <><p>{selected.length ? 'Подбрани по наличните ароматни нотки, твоите предпочитания и бюджет.' : 'Подбрани според избора и бюджета ти.'}</p><div className={styles.products}>{results.map((card) => <ProductCard key={card.slug} card={card} sizes="(max-width: 640px) 45vw, 300px" />)}</div></> : <p>В момента нямаме налични парфюми с такова съчетание. Опитай с други нотки или бюджет.</p>}
        <div className={styles.resultActions}><button type="button" className={styles.primary} onClick={reset}>Направи теста отново</button><Link className={styles.textLink} href="/store/category/parfimes">Разгледай всички парфюми →</Link></div>
        {selected.length > 0 && <p className={styles.disclaimer}>Резултатите използват въведените нотки; парфюми без информация за нотките не се включват.</p>}
      </div>}
    </section>}
  </main>
}
