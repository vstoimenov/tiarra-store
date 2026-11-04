'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { type CartItem, readCart, writeCart } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import styles from './CheckoutForm.module.css'
import { CourierPicker } from './CourierPicker'
import { imageUrl } from '@/lib/images'

type Bump = { productId: string; slug: string; title: string; imagePath: string | null; unitPrice: number }
type Quote = {
  lines: { productId: string; variantId: string | null; quantity: number; unitPrice: number }[]
  subtotal: number
  shipping: number
  total: number
}
export function CheckoutForm({ bumps }: { bumps: Bump[] }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [quotePending, setQuotePending] = useState(false)
  const requestId = useRef('')
  const [courier, setCourier] = useState<'econt' | 'speedy'>('econt')
  const localSubtotal = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items])
  const subtotal = quote?.subtotal ?? localSubtotal
  const shipping = quote?.shipping ?? (subtotal >= 39 ? 0 : courier === 'econt' ? 4.5 : 3.5)
  const quotedPrices = useMemo(() => new Map(quote?.lines.map((line) => [`${line.productId}:${line.variantId ?? ''}`, line.unitPrice]) ?? []), [quote])
  const priceChanged = quote?.lines.some((line) => {
    const cartItem = items.find((item) => item.productId === line.productId && item.variantId === line.variantId)
    return cartItem !== undefined && cartItem.unitPrice !== line.unitPrice
  }) ?? false

  useEffect(() => { setItems(readCart()); setReady(true) }, [])

  useEffect(() => {
    if (!ready || items.length === 0) return
    const controller = new AbortController()
    setQuotePending(true)
    setQuoteError('')
    fetch('/api/orders/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ courier, items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) }),
      signal: controller.signal,
    }).then(async (response) => {
      const result = await response.json() as Quote & { error?: string }
      if (!response.ok) throw new Error(result.error || 'Цените не могат да бъдат проверени.')
      setQuote(result)
    }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return
      setQuote(null)
      setQuoteError(reason instanceof Error ? reason.message : 'Цените не могат да бъдат проверени.')
    }).finally(() => {
      if (!controller.signal.aborted) setQuotePending(false)
    })
    return () => controller.abort()
  }, [courier, items, ready])

  function toggleBump(bump: Bump) {
    const key = `${bump.productId}:default`
    const next = items.some(item => item.key === key)
      ? items.filter(item => item.key !== key)
      : [...items, { ...bump, key, variantId: null, variantName: null, quantity: 1 }]
    setItems(next)
    writeCart(next)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const data = new FormData(event.currentTarget)
    if (!requestId.current) requestId.current = crypto.randomUUID()
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId.current,
          customerName: data.get('customerName'), phone: data.get('phone'), email: data.get('email'),
          courier: data.get('courier'), officeId: data.get('officeId') || null, deliveryType: data.get('deliveryType'), city: data.get('city') || '', postCode: data.get('postCode') || '', deliveryAddress: data.get('deliveryAddress'), notes: data.get('notes'),
          items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
        }),
      })
      const result = await response.json() as { error?: string; orderNumber?: string }
      if (!response.ok || !result.orderNumber) throw new Error(result.error || 'Поръчката не беше записана.')
      writeCart([])
      setItems([])
      setOrderNumber(result.orderNumber)
      requestId.current = ''
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Поръчката не беше записана.')
    } finally { setPending(false) }
  }

  if (!ready) return <p>Зареждане…</p>
  if (orderNumber) return <div className={styles.success}><h2>Благодарим ти!</h2><p>Поръчка №{orderNumber} е приета. Ще се свържем с теб за потвърждение.</p><Link href="/store">Обратно към магазина</Link></div>
  if (items.length === 0) return <div className={styles.success}><p>Количката ти е празна.</p><Link href="/store">Разгледай продуктите</Link></div>

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.fields}>
        <section className={styles.step}><div className={styles.stepHead}><span className={styles.stepNumber}>01</span><div><h2>Контакт</h2><p>За да потвърдим поръчката ти</p></div></div><div className={styles.fieldGrid}>
          <label className={styles.full}>Имейл <span>(по желание)</span><input name="email" type="email" autoComplete="email" placeholder="Име@пример.бг" /></label>
          <label>Име и фамилия<input name="customerName" autoComplete="name" required minLength={2} placeholder="Твоето име" /></label>
          <label>Телефон<input name="phone" type="tel" autoComplete="tel" required minLength={7} placeholder="+359 ..." /></label>
        </div></section>
        <section className={styles.step}><div className={styles.stepHead}><span className={styles.stepNumber}>02</span><div><h2>Доставка</h2><p>Избери куриер и място за получаване</p></div></div><CourierPicker onCourierChange={setCourier} /></section>
        <section className={styles.step}><div className={styles.stepHead}><span className={styles.stepNumber}>03</span><div><h2>Плащане</h2><p>Плащаш при получаване</p></div></div><div className={styles.payment}>◉ &nbsp; Наложен платеж <span>Сигурно и удобно</span></div><label className={styles.notes}>Бележка <span>(по желание)</span><textarea name="notes" rows={2} placeholder="Нещо, което трябва да знаем?" /></label></section>
        <label className={styles.consent}><input type="checkbox" required /> Съгласен/на съм данните ми да бъдат използвани за изпълнение на поръчката.</label>
      </div>
      <aside className={styles.summary}><div className={styles.summaryTop}><span>ТВОЯТА СЕЛЕКЦИЯ</span><Link href="/store/cart">Редактирай количката ↗</Link></div><h2>Твоята поръчка</h2><div className={styles.lines}>{items.map(item=>{ const price = quotedPrices.get(`${item.productId}:${item.variantId ?? ''}`) ?? item.unitPrice; return <div key={item.key} className={styles.line}><div className={styles.thumb}>{item.imagePath && <img src={imageUrl(item.imagePath,400)} alt="" /> }<small>{item.quantity}</small></div><div><strong>{item.title}</strong>{item.variantName && <span>{item.variantName}</span>}</div><b>{formatPrice(price*item.quantity)}</b></div>})}</div>
        {bumps.some(bump => !items.some(item => item.productId === bump.productId)) && <div className={styles.bumps}><span className={styles.eyebrow}>ДОПЪЛНИ РИТУАЛА СИ</span><h3>Малък детайл. Голямо усещане.</h3>{bumps.filter(bump => !items.some(item => item.productId === bump.productId)).slice(0,2).map(bump => <div key={bump.productId} className={styles.bump}>{bump.imagePath && <img src={imageUrl(bump.imagePath,400)} alt="" />}<div><strong>{bump.title}</strong><span>{formatPrice(bump.unitPrice)}</span></div><button type="button" onClick={() => toggleBump(bump)} aria-label={`Добави ${bump.title}`}>+ Добави</button></div>)}</div>}
        <div className={styles.totals}><p><span>Продукти</span><b>{formatPrice(subtotal)}</b></p><p><span>Доставка</span><b>{shipping === 0 ? 'Безплатна' : formatPrice(shipping)}</b></p><div><span>Общо</span><strong>{formatPrice(quote?.total ?? subtotal+shipping)}</strong></div></div><small>{quotePending ? 'Проверяваме актуалните цени и наличности…' : priceChanged ? 'Цените в количката са актуализирани. Потвърди поръчката с показаната обща сума.' : 'Цените и наличностите са потвърдени от магазина.'}</small>{quoteError&&<p role="alert" className={styles.error}>{quoteError}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}<button className={styles.submit} type="submit" disabled={pending || quotePending || !quote}>{pending?'Изпращане…':'Потвърди поръчката →'}</button><p className={styles.safe}>Сигурна поръчка · Преглед при доставка · 14 дни връщане</p></aside>
    </form>
  )
}
