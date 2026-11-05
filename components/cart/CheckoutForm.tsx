'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { analyticsAllowed, trackCommerce } from '@/lib/analytics'
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
export function CheckoutForm() {
  const [items, setItems] = useState<CartItem[]>([])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [quotePending, setQuotePending] = useState(false)
  const [bumps, setBumps] = useState<Bump[]>([])
  const requestId = useRef('')
  const checkoutTracked = useRef(false)
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

  useEffect(() => {
    if (!ready || items.length === 0) return
    const controller = new AbortController()
    fetch('/api/orders/bumps', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productIds: items.map((item) => item.productId) }), signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error('Bumps unavailable')
      const result = await response.json() as { bumps: Bump[] }
      setBumps(result.bumps)
    }).catch((reason: unknown) => {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setBumps([])
    })
    return () => controller.abort()
  }, [items, ready])

  useEffect(() => {
    function trackCheckout() {
      if (checkoutTracked.current || !quote || !analyticsAllowed()) return
      trackCommerce('begin_checkout', { currency: 'EUR', value: quote.total, items: items.map((item) => ({ item_id: item.variantId ?? item.productId, item_name: item.title, item_variant: item.variantName ?? undefined, price: quotedPrices.get(`${item.productId}:${item.variantId ?? ''}`) ?? item.unitPrice, quantity: item.quantity })) })
      checkoutTracked.current = true
    }
    trackCheckout(); window.addEventListener('tiarra-consent-updated', trackCheckout)
    return () => window.removeEventListener('tiarra-consent-updated', trackCheckout)
  }, [items, quote, quotedPrices])

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
      const result = await response.json() as { error?: string; orderNumber?: string; total?: number }
      if (!response.ok || !result.orderNumber) throw new Error(result.error || 'Поръчката не беше записана.')
      const purchaseKey = `tiarra-purchase-${result.orderNumber}`
      if (!window.localStorage.getItem(purchaseKey)) {
        trackCommerce('purchase', { currency: 'EUR', value: result.total ?? quote?.total ?? subtotal + shipping, transaction_id: result.orderNumber, items: items.map((item) => ({ item_id: item.variantId ?? item.productId, item_name: item.title, item_variant: item.variantName ?? undefined, price: quotedPrices.get(`${item.productId}:${item.variantId ?? ''}`) ?? item.unitPrice, quantity: item.quantity })) })
        window.localStorage.setItem(purchaseKey, '1')
      }
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
        <label className={styles.consent}><input type="checkbox" required /> <span>Съгласен/на съм с <Link href="/obshti-usloviya" target="_blank">общите условия</Link> и данните ми да бъдат използвани според <Link href="/poveritelnost" target="_blank">политиката за поверителност</Link>.</span></label>
      </div>
      <aside className={styles.summary} aria-labelledby="order-summary-title">
        <div className={styles.summaryTop}>
          <span>TIARRA COSMETICS</span>
          <Link href="/store/cart">Редактирай ↗</Link>
        </div>
        <div className={styles.summaryHeading}>
          <h2 id="order-summary-title">Твоята поръчка</h2>
          <span>{items.reduce((sum, item) => sum + item.quantity, 0)} бр.</span>
        </div>
        <button type="button" className={styles.summaryToggle} aria-expanded={summaryOpen} aria-controls="checkout-lines" onClick={() => setSummaryOpen(!summaryOpen)}>
          {summaryOpen ? 'Скрий продуктите −' : `Виж продуктите (${items.length}) +`}
        </button>
        <div id="checkout-lines" className={`${styles.lines} ${summaryOpen ? styles.expanded : styles.collapsed}`}>
          {items.map(item => {
            const price = quotedPrices.get(`${item.productId}:${item.variantId ?? ''}`) ?? item.unitPrice
            return <div key={item.key} className={styles.line}>
              <div className={styles.thumb}>
                {item.imagePath && <img src={imageUrl(item.imagePath, 400)} alt="" width={64} height={64} />}
                <small aria-label={`Количество: ${item.quantity}`}>{item.quantity}</small>
              </div>
              <div className={styles.lineInfo}>
                <Link href={`/store/${encodeURIComponent(item.slug)}`} title={item.title}>{item.title}</Link>
                {item.variantName && <span>{item.variantName}</span>}
                <b>{formatPrice(price * item.quantity)}</b>
              </div>
            </div>
          })}
        </div>
        <p className={styles.shippingStatus}>
          <span aria-hidden="true">{subtotal >= 39 ? '✓' : '↗'}</span>
          {subtotal >= 39 ? 'Безплатна доставка за твоята поръчка' : `Още ${formatPrice(39 - subtotal)} до безплатна доставка`}
        </p>
        {bumps.some(bump => !items.some(item => item.productId === bump.productId)) && <section className={styles.bumps} aria-labelledby="checkout-bumps-title">
          <span className={styles.eyebrow}>ПОДБРАНО ЗА ТЕБ</span>
          <h3 id="checkout-bumps-title">Добави финалния щрих</h3>
          {bumps.filter(bump => !items.some(item => item.productId === bump.productId)).slice(0, 2).map(bump => <div key={bump.productId} className={styles.bump}>
            <div className={styles.bumpThumb}>{bump.imagePath && <img src={imageUrl(bump.imagePath, 400)} alt="" width={48} height={48} loading="lazy" />}</div>
            <div><Link href={`/store/${encodeURIComponent(bump.slug)}`} title={bump.title}><strong>{bump.title}</strong></Link><span>{formatPrice(bump.unitPrice)}</span></div>
            <button type="button" onClick={() => toggleBump(bump)} aria-label={`Добави ${bump.title}`}><span aria-hidden="true">+</span> Добави</button>
          </div>)}
        </section>}
        <div className={styles.totals} aria-live="polite">
          <p><span>Междинна сума</span><b>{formatPrice(subtotal)}</b></p>
          <p><span>Доставка</span><b className={shipping === 0 ? styles.freeShipping : undefined}>{shipping === 0 ? 'Безплатна' : formatPrice(shipping)}</b></p>
          <div><span>Общо за плащане<small>Наложен платеж</small></span><strong>{formatPrice(quote?.total ?? subtotal + shipping)}</strong></div>
        </div>
        <p className={styles.quoteStatus} role="status">{quotePending ? 'Проверяваме цените и наличностите…' : quoteError ? 'Необходима е проверка на поръчката.' : !quote ? 'Изчакваме потвърждение на цените.' : priceChanged ? 'Цените са актуализирани спрямо текущата оферта.' : '✓ Цените и наличностите са потвърдени'}</p>
        {quoteError && <p role="alert" className={styles.error}>{quoteError}</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <button className={styles.submit} type="submit" disabled={pending || quotePending || !quote}>
          <span>{pending ? 'Изпращане…' : 'Потвърди поръчката'}</span><span aria-hidden="true">→</span>
        </button>
        <div className={styles.safe}><span>Преглед при доставка</span><span>Плащаш при получаване</span></div>
      </aside>
    </form>
  )
}
