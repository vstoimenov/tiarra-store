'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Flower2, Leaf, Sparkles, Gem, Wind, Orbit, Gift, UserRound, Wallet, Venus, Mars, Compass } from 'lucide-react'
import { QuizResultCard } from '@/components/quiz/QuizResultCard'
import { hasFragranceNotes, matchingFamilies, noteMatchPercent, recommendPerfumes, type Family, type QuizProduct } from '@/lib/quiz/perfume'
import type { Gender } from '@/lib/catalog/types'
import styles from './PerfumeQuiz.module.css'

type GenderChoice = Gender | 'any'
const families: { id: Family; title: string; detail: string; icon: typeof Leaf }[] = [
  { id: 'fruity', title: 'Плодови', detail: 'круша, праскова, плодове', icon: Gem },
  { id: 'floral', title: 'Флорални', detail: 'роза, жасмин, цветя', icon: Flower2 },
  { id: 'fresh', title: 'Свежи', detail: 'цитруси, морски и зелени нотки', icon: Wind },
  { id: 'sweet', title: 'Сладки', detail: 'ванилия, карамел, кокос', icon: Sparkles },
  { id: 'spicy', title: 'Пикантни и кожени', detail: 'подправки, кожа, тютюн', icon: Orbit },
  { id: 'woody', title: 'Дървесни', detail: 'кедър, сандал, пачули', icon: Leaf },
]
const genderOptions: { id: GenderChoice; title: string; detail: string; icon: typeof Leaf }[] = [
  { id: 'female', title: 'За нея', detail: 'Дамски и унисекс аромати', icon: Venus },
  { id: 'male', title: 'За него', detail: 'Мъжки и унисекс аромати', icon: Mars },
  { id: 'unisex', title: 'Унисекс', detail: 'Аромати за всеки', icon: Orbit },
  { id: 'any', title: 'Всички аромати', detail: 'Без предпочитание', icon: Compass },
]
const budgets = [ { id: 25, title: 'До 25 €' }, { id: 50, title: 'До 50 €' }, { id: 100, title: 'До 100 €' }, { id: null, title: 'Без ограничение' } ]

export function PerfumeQuiz({ products }: { products: QuizProduct[] }) {
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState<GenderChoice>('any')
  const [selected, setSelected] = useState<Family[]>([])
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [signedUp, setSignedUp] = useState(false)
  const [visibleResults, setVisibleResults] = useState(3)
  const results = step === 5 ? recommendPerfumes(products, { gender, families: selected, maxPrice }) : []
  const alternatives = step === 5 && selected.length > 0 && results.length < 3
    ? recommendPerfumes(products, { gender, families: [], maxPrice }).filter(product => !hasFragranceNotes(product.perfume)).slice(0, 3 - results.length)
    : []

  function toggleFamily(id: Family) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : current)
  }
  function reset() { setGender('any'); setSelected([]); setMaxPrice(null); setEmail(''); setConsent(false); setSignedUp(false); setSignupError(''); setVisibleResults(3); setStep(0) }
  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSignupError('')
    setSending(true)
    try {
      const response = await fetch('/api/quiz-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, consent }) })
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        setSignupError(data?.error || 'Не успяхме да запазим имейла. Опитай отново.')
        return
      }
      setSignedUp(true)
      setStep(5)
    } catch { setSignupError('Не успяхме да запазим имейла. Провери връзката и опитай отново.') }
    finally { setSending(false) }
  }

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
        <div className={styles.options}>{genderOptions.map((option) => <button type="button" className={styles.option} key={option.id} aria-pressed={gender === option.id} onClick={() => { setGender(option.id); setStep(2) }}><span className={styles.iconFrame}><option.icon size={25} /></span><strong>{option.title}</strong><span>{option.detail}</span></button>)}</div>
      </div>}
      {step === 2 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 2 ОТ 3</p><h1>Кои аромати те привличат?</h1><p>Избери до два или продължи, ако не си сигурен.</p>
        <div className={styles.options}>{families.map(({ id, title, detail, icon: Icon }) => <button type="button" className={styles.option} key={id} aria-pressed={selected.includes(id)} onClick={() => toggleFamily(id)}><span className={styles.iconFrame}><Icon size={25} /></span><strong>{title}</strong><span>{detail}</span>{selected.includes(id) && <Check className={styles.check} size={17} />}</button>)}</div>
        <button type="button" className={styles.primary} onClick={() => setStep(3)}>Напред <ArrowRight size={18} /></button>
      </div>}
      {step === 3 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 3 ОТ 3</p><h1>Какъв е твоят бюджет?</h1><p>Ще се съобразим с началната цена на парфюма.</p>
        <div className={styles.options}>{budgets.map((option) => <button type="button" className={styles.option} key={option.title} aria-pressed={maxPrice === option.id} onClick={() => { setMaxPrice(option.id); setStep(4) }}><span className={styles.iconFrame}><Wallet size={25} /></span><strong>{option.title}</strong></button>)}</div>
      </div>}
      {step === 4 && <div className={styles.emailCard}>
        <p className={styles.eyebrow}>ТВОИТЕ ПРЕДЛОЖЕНИЯ СА ГОТОВИ</p><h1>Остани в течение</h1>
        <p>Остави имейл, ако искаш да получаваш бъдещи оферти и новини от Tiarra.</p>
        <form onSubmit={signUp}>
          <label htmlFor="quiz-email">Имейл адрес</label>
          <input id="quiz-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="Твоят имейл" />
          <label className={styles.consent}><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>Съгласен/съгласна съм да получавам новини и оферти по имейл. Мога да се отпиша по всяко време, като пиша на info@tiarracosmetics.com.</span></label>
          <p className={styles.privacy}><Link href="/poveritelnost" target="_blank">Политика за поверителност</Link></p>
          {signupError && <p role="alert" className={styles.error}>{signupError}</p>}
          <button type="submit" className={styles.primary} disabled={sending}>{sending ? 'Запазване…' : 'Запиши ме и покажи резултатите'}</button>
        </form>
        <button type="button" className={styles.skip} onClick={() => { setSignupError(''); setStep(5) }}>Продължи без имейл</button>
      </div>}
      {step === 5 && <div className={styles.results} aria-live="polite">
        <p className={styles.eyebrow}>ТВОЯТ РЕЗУЛТАТ</p><h1>Аромати за теб</h1>
        {signedUp && <p>Благодарим! Записахме имейла ти за новини и оферти.</p>}
        {results.length ? <><p>{selected.length === 2 ? 'Подредени според избраните ароматни групи; някои съвпадат само с една от тях.' : selected.length === 1 ? 'Подбрани по въведените ароматни нотки, твоя избор и бюджет.' : 'Подбрани според избора и бюджета ти.'}</p><div className={styles.products}>{results.slice(0, visibleResults).map((product, index) => <QuizResultCard key={product.slug} product={product} leading={index === 0 && selected.length > 0} percent={noteMatchPercent(product.perfume, selected)} matchedLabels={families.filter(family => selected.includes(family.id) && matchingFamilies(product.perfume).includes(family.id)).map(family => family.title)} />)}</div>{results.length > visibleResults && <button type="button" className={styles.showMore} onClick={() => setVisibleResults(count => count + 3)}>Покажи още аромати</button>}</> : <p>Не открихме наличен парфюм с въведени нотки, които отговарят на избора и бюджета ти. Опитай с други предпочитания или разгледай всички парфюми.</p>}
        {alternatives.length > 0 && <div className={styles.alternatives}><h2>Още аромати за разглеждане</h2><p>Отговарят на избрания тип и бюджет, но нямат въведени нотки, затова не можем да изчислим съвпадение.</p><div className={styles.products}>{alternatives.map(product => <QuizResultCard key={product.slug} product={product} leading={false} matchedLabels={[]} />)}</div></div>}
        <div className={styles.resultActions}><button type="button" className={styles.primary} onClick={reset}>Направи теста отново</button><Link className={styles.textLink} href="/store/category/parfimes">Разгледай всички парфюми →</Link></div>
        {selected.length > 0 && <p className={styles.disclaimer}>Процентът е ориентировъчен: отчита избраните ароматни групи и въведените нотки, а не трайността или как ароматът се развива върху кожата.</p>}
      </div>}
    </section>}
  </main>
}
