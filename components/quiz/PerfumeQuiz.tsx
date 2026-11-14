'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Flower2, Leaf, Sparkles, Gem, Wind, Orbit, Gift, UserRound, Venus, Mars, Compass, Sun, MoonStar, Layers, Droplets, Flame, Cloud } from 'lucide-react'
import { QuizResultCard } from '@/components/quiz/QuizResultCard'
import { catalogNotesByFamily, matchingFamilies, noteMatchPercent, recommendFallbackPerfumes, recommendPerfumes, recommendRelatedPerfumes, type Family, type QuizProduct, type Occasion, type Intensity } from '@/lib/quiz/perfume'
import type { Gender } from '@/lib/catalog/types'
import styles from './PerfumeQuiz.module.css'

type GenderChoice = Gender | 'any'
const families: { id: Family; title: string; icon: typeof Leaf }[] = [
  { id: 'fruity', title: 'Плодови', icon: Gem },
  { id: 'floral', title: 'Флорални', icon: Flower2 },
  { id: 'fresh', title: 'Свежи', icon: Wind },
  { id: 'sweet', title: 'Сладки', icon: Sparkles },
  { id: 'spicy', title: 'Пикантни и кожени', icon: Orbit },
  { id: 'woody', title: 'Дървесни', icon: Leaf },
  { id: 'amber', title: 'Амброви', icon: Flame },
  { id: 'musky', title: 'Мускусни', icon: Cloud },
]
const genderOptions: { id: GenderChoice; title: string; detail: string; icon: typeof Leaf }[] = [
  { id: 'female', title: 'За нея', detail: 'Дамски и унисекс аромати', icon: Venus },
  { id: 'male', title: 'За него', detail: 'Мъжки и унисекс аромати', icon: Mars },
  { id: 'unisex', title: 'Унисекс', detail: 'Аромати за всеки', icon: Orbit },
  { id: 'any', title: 'Всички аромати', detail: 'Без предпочитание', icon: Compass },
]
export function PerfumeQuiz({ products }: { products: QuizProduct[] }) {
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState<GenderChoice>('any')
  const [recipient, setRecipient] = useState<'self' | 'gift'>('self')
  const [selected, setSelected] = useState<Family[]>([])
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [showAllNotes, setShowAllNotes] = useState(false)
  const [occasion, setOccasion] = useState<Occasion>('both')
  const [intensity, setIntensity] = useState<Intensity>('balanced')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [signedUp, setSignedUp] = useState(false)
  const [visibleResults, setVisibleResults] = useState(3)
  const notesByFamily = useMemo(() => catalogNotesByFamily(products, gender), [products, gender])
  const availableFamilies = families.filter(family => notesByFamily[family.id].length > 0)
  const noteOptions = [...new Set(selected.flatMap(family => notesByFamily[family].map(note => note.value)))]
  const visibleNotes = showAllNotes ? noteOptions : [...new Set([...noteOptions.slice(0, 12), ...selectedNotes])]
  const answers = { gender, families: selected, notes: selectedNotes, maxPrice: null, occasion, intensity }
  const results = step === 7 && selected.length > 0 ? recommendPerfumes(products, answers) : []
  const alternatives = step === 7 && selected.length > 0 && results.length < 3
    ? recommendRelatedPerfumes(products, answers).slice(0, 3 - results.length)
    : []
  const fallback = step === 7 && results.length + alternatives.length < 3
    ? recommendFallbackPerfumes(products, answers, [...results.map(product => product.id), ...alternatives.map(item => item.product.id)]).slice(0, 3 - results.length - alternatives.length)
    : []
  const displayed = [...results.slice(0, visibleResults), ...alternatives.map(item => item.product), ...fallback]
  const missingTraits = displayed.some(product => !product.perfume?.occasion || !product.perfume?.intensity)

  useEffect(() => {
    if (step > 0) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [step])

  function toggleFamily(id: Family) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : current)
    setSelectedNotes([])
    setShowAllNotes(false)
  }
  function reset() { setGender('any'); setRecipient('self'); setSelected([]); setSelectedNotes([]); setShowAllNotes(false); setOccasion('both'); setIntensity('balanced'); setEmail(''); setConsent(false); setSignedUp(false); setSignupError(''); setVisibleResults(3); setStep(0) }
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
      setStep(7)
    } catch { setSignupError('Не успяхме да запазим имейла. Провери връзката и опитай отново.') }
    finally { setSending(false) }
  }

  return <main className={styles.page}>
    {step === 0 ? <section className={styles.hero}>
      <p className={styles.eyebrow}>TIARRA · ТЕСТ ЗА АРОМАТ</p>
      <h1>Открий аромат, който ти подхожда</h1>
      <p className={styles.heroText}>Разкажи ни какво харесваш и открий предложения от нашите парфюми.</p>
      <button type="button" className={styles.primary} onClick={() => setStep(1)}>Започни теста <ArrowRight size={18} /></button>
      <div className={styles.heroDetails}><span><Sparkles size={16} /> 5 кратки въпроса</span><span><Gift size={16} /> За теб или за подарък</span><span><UserRound size={16} /> Без регистрация</span></div>
    </section> : <section className={styles.quiz}>
      <div className={styles.progressRow}>
        <button type="button" className={styles.back} onClick={() => setStep(step - 1)}><ArrowLeft size={17} /> Назад</button>
        <div className={styles.progress} role="progressbar" aria-label="Напредък на теста" aria-valuemin={0} aria-valuemax={5} aria-valuenow={Math.min(step, 5)}><span style={{ width: `${Math.min(step, 5) / 5 * 100}%` }} /></div>
        <span className={styles.progressLabel}>{Math.min(step, 5)} / 5</span>
      </div>
      {step === 1 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 1 ОТ 5</p><h1>За кого търсиш аромат?</h1><p>Избери за теб или за подарък.</p>
        <div className={styles.options}>{([{ id:'self', title:'За мен', detail:'Търся своя аромат', icon:UserRound }, { id:'gift', title:'За подарък', detail:'Търся аромат за друг човек', icon:Gift }] as const).map(option => <button type="button" className={styles.option} key={option.id} aria-pressed={recipient === option.id} onClick={() => { setRecipient(option.id); setStep(2) }}><span className={styles.iconFrame}><option.icon size={25}/></span><strong>{option.title}</strong><span>{option.detail}</span></button>)}</div>
      </div>}
      {step === 2 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 2 ОТ 5</p><h1>Какъв аромат търсиш?</h1><p>Избери за кого е парфюмът.</p>
        <div className={styles.options}>{genderOptions.map((option) => <button type="button" className={styles.option} key={option.id} aria-pressed={gender === option.id} onClick={() => { if (gender !== option.id) { setSelected([]); setSelectedNotes([]); setShowAllNotes(false) }; setGender(option.id); setStep(3) }}><span className={styles.iconFrame}><option.icon size={25} /></span><strong>{option.title}</strong><span>{option.detail}</span></button>)}</div>
      </div>}
      {step === 3 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 3 ОТ 5</p><h1>Кои аромати те привличат?</h1><p>Избери един или два, за да изчислим съвпаденията.</p>
        {availableFamilies.length === 0 && <p>За този избор няма налични парфюми с разпознаваеми нотки. Продължи, за да видиш предложения според останалите си отговори.</p>}
        <div className={styles.options}>{availableFamilies.map(({ id, title, icon: Icon }) => <button type="button" className={styles.option} key={id} aria-pressed={selected.includes(id)} disabled={!selected.includes(id) && selected.length >= 2} onClick={() => toggleFamily(id)}><span className={styles.iconFrame}><Icon size={25} /></span><strong>{title}</strong><span>{notesByFamily[id].slice(0, 3).map(note => note.value).join(', ')}</span>{selected.includes(id) && <Check className={styles.check} size={17} />}</button>)}</div>
        {noteOptions.length > 0 && <div className={styles.notePicker}><h2>Има ли конкретни нотки, които харесваш?</h2><p>По желание избери до две от наличните в нашите парфюми.</p><div className={styles.noteChips} role="group" aria-label="Конкретни ароматни нотки">{visibleNotes.map(note => <button key={note} type="button" aria-pressed={selectedNotes.includes(note)} disabled={!selectedNotes.includes(note) && selectedNotes.length >= 2} onClick={() => setSelectedNotes(current => current.includes(note) ? current.filter(value => value !== note) : [...current, note])}>{note}</button>)}</div>{noteOptions.length > 12 && <button type="button" className={styles.showNotes} onClick={() => setShowAllNotes(value => !value)}>{showAllNotes ? 'Покажи по-малко' : `Покажи всички ${noteOptions.length} нотки`}</button>}</div>}
        <button type="button" className={styles.primary} disabled={availableFamilies.length > 0 && selected.length === 0} onClick={() => setStep(4)}>Напред <ArrowRight size={18} /></button>
      </div>}
      {step === 4 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 4 ОТ 5</p><h1>Кога ще се носи най-често?</h1><p>Избери предпочитания повод.</p>
        <div className={styles.options}>{([{id:'daily',title:'Всекидневно',detail:'За работа и всеки ден',icon:Sun},{id:'special',title:'Специални поводи',detail:'За срещи и излизания',icon:MoonStar},{id:'both',title:'И за двете',detail:'Универсален избор',icon:Layers}] as const).map(option => <button type="button" key={option.id} className={styles.option} aria-pressed={occasion === option.id} onClick={() => { setOccasion(option.id); setStep(5) }}><span className={styles.iconFrame}><option.icon size={25}/></span><strong>{option.title}</strong><span>{option.detail}</span></button>)}</div>
      </div>}
      {step === 5 && <div className={styles.question}>
        <p className={styles.eyebrow}>ВЪПРОС 5 ОТ 5</p><h1>Колко силен да бъде ароматът?</h1><p>Избери предпочитана сила.</p>
        <div className={styles.options}>{([{id:'light',title:'Фин и деликатен',detail:'По-нежен аромат',icon:Droplets},{id:'balanced',title:'Балансиран',detail:'Между нежно и наситено',icon:Sparkles},{id:'strong',title:'Силен и наситен',detail:'По-изразен аромат',icon:Gem}] as const).map(option => <button type="button" key={option.id} className={styles.option} aria-pressed={intensity === option.id} onClick={() => { setIntensity(option.id); setStep(6) }}><span className={styles.iconFrame}><option.icon size={25}/></span><strong>{option.title}</strong><span>{option.detail}</span></button>)}</div>
      </div>}
      {step === 6 && <div className={styles.emailCard}>
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
        <button type="button" className={styles.skip} onClick={() => { setSignupError(''); setStep(7) }}>Продължи без имейл</button>
      </div>}
      {step === 7 && <div className={styles.results} aria-live="polite">
        <p className={styles.eyebrow}>ТВОЯТ РЕЗУЛТАТ</p><h1>{recipient === 'gift' ? 'Идеи за подарък' : 'Аромати за теб'}</h1>
        {signedUp && <p>Благодарим! Записахме имейла ти за новини и оферти.</p>}
        {results.length ? <><p>{selected.length === 2 ? 'Подредени според избраните ароматни групи; някои съвпадат само с една от тях.' : 'Подбрани по въведените ароматни нотки и твоя избор.'}{selectedNotes.length > 0 && ' Когато няма достатъчно точни съвпадения, включваме и близки аромати от избраните групи.'}</p><div className={styles.products}>{results.slice(0, visibleResults).map((product, index) => <QuizResultCard key={product.slug} product={product} leading={index === 0} percent={noteMatchPercent(product.perfume, selected, answers, product.descriptionNotes)} matchedLabels={families.filter(family => selected.includes(family.id) && matchingFamilies(product.perfume, product.descriptionNotes).includes(family.id)).map(family => family.title)} />)}</div>{results.length > visibleResults && <button type="button" className={styles.showMore} onClick={() => setVisibleResults(count => count + 3)}>Покажи още аромати</button>}</> : <p>Няма достатъчно данни за пряко съвпадение по нотки сред наличните парфюми.</p>}
        {alternatives.length > 0 && <div className={styles.alternatives}><h2>Близки аромати за разглеждане</h2><p>Тези предложения съдържат нотки от близки ароматни групи, затова съвпадението им е по-ниско.</p><div className={styles.products}>{alternatives.map(({ product, percent }) => <QuizResultCard key={product.slug} product={product} leading={false} related percent={percent} matchedLabels={families.filter(family => matchingFamilies(product.perfume, product.descriptionNotes).includes(family.id)).map(family => family.title)} />)}</div></div>}
        {fallback.length > 0 && <div className={styles.alternatives}><h2>Още предложения за теб</h2><p>Тези налични парфюми са подбрани според типа и останалите налични характеристики. Няма достатъчно данни, за да изчислим сходство по ароматни нотки.</p><div className={styles.products}>{fallback.map(product => <QuizResultCard key={product.slug} product={product} leading={false} limited matchedLabels={[]} />)}</div></div>}
        <div className={styles.resultActions}><button type="button" className={styles.primary} onClick={reset}>Направи теста отново</button><Link className={styles.textLink} href="/store/category/parfimes">Разгледай всички парфюми →</Link></div>
        <p className={styles.disclaimer}>Ориентировъчна скала от 76% до 100% за сравнение на предложенията; не представлява вероятност. Отчита нотките от характеристиките и описанията и, когато са въведени, повода и силата на аромата. {missingTraits && 'За някои от показаните парфюми няма данни за повод или сила; при тях подборът се основава на нотките.'}</p>
      </div>}
    </section>}
  </main>
}
