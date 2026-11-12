'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { analyticsAllowed, trackCommerce } from '@/lib/analytics'
import { type CartItem, readCart, writeCart } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import styles from './CheckoutForm.module.css'
import controls from './CheckoutControls.module.css'
import { OrdyxDelivery, type DeliverySelection } from './OrdyxDelivery'
import { currentVisitSession } from '@/lib/visit-analytics'
import { imageUrl } from '@/lib/images'
import { courierPrice,type CommerceSettings } from '@/lib/commerce-settings-schema'
import { OrderThankYou,type Confirmation } from './OrderThankYou'

type Bump = { productId: string; slug: string; title: string; imagePath: string | null; unitPrice: number }
type Quote = {
  promoCode: string
  discount: number
  lines: { productId: string; variantId: string | null; quantity: number; unitPrice: number }[]
  subtotal: number
  shipping: number
  total: number
}
export function CheckoutForm({settings}:{settings:CommerceSettings}) {
  const [items, setItems] = useState<CartItem[]>([])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const contactSection = useRef<HTMLElement>(null)
  const [stepError, setStepError] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [confirmation,setConfirmation]=useState<Confirmation|null>(null)
  const [promoDraft, setPromoDraft] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [quotePending, setQuotePending] = useState(false)
  const [quoteRevision,setQuoteRevision]=useState(0)
  const [bumps, setBumps] = useState<Bump[]>([])
  const requestId = useRef('')
  const checkoutTracked = useRef(false)
  const [courier, setCourier] = useState<'econt' | 'speedy' | 'boxnow'>(settings.econtEnabled?'econt':settings.speedyEnabled?'speedy':'boxnow')
  const [delivery, setDelivery] = useState<DeliverySelection | null>(null)
  const [deliveryType,setDeliveryType]=useState<'office'|'automat'|'address'>(settings.econtEnabled || settings.speedyEnabled ? 'office' : 'automat')
  const localSubtotal = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items])
  const subtotal = quote?.subtotal ?? localSubtotal
  const shipping = quote?.shipping ?? (subtotal >= settings.freeShippingThreshold ? 0 : courierPrice(settings,courier,deliveryType))
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
      body: JSON.stringify({ courier, deliveryType, promoCode, items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) }),
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
  }, [courier,deliveryType, items, ready, promoCode,quoteRevision])

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

  function updateItems(next: CartItem[]) {
    setItems(next)
    writeCart(next)
    setQuote(null)
    setQuoteError('')
    requestId.current = ''
  }

  function removeItem(key: string) {
    updateItems(items.filter(item => item.key !== key))
  }

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
      : [...items, { ...bump, key, variantId: null, variantName: null, quantity: 1, source: 'bump' as const }]
    updateItems(next)
  }

  function applyPromo(code: string) {
    const normalized = code.trim().toUpperCase()
    setPromoDraft(normalized)
    if (normalized === promoCode) return
    setQuote(null)
    setQuotePending(true)
    setPromoCode(normalized)
  }

  function nextContact() {
    const inputs = contactSection.current?.querySelectorAll<HTMLInputElement>('input[required]') ?? []
    for (const input of inputs) {
      if (!input.value.trim() || !input.checkValidity()) { input.reportValidity(); input.focus(); setStepError('Попълни валидни име, имейл и телефон.'); return }
    }
    setStepError(''); setStep(2)
  }
  function nextDelivery() {
    if (!delivery || delivery.error || !delivery.type) { setStepError(delivery?.error || 'Избери начин на доставка.'); return }
    setStepError(''); setStep(3)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step !== 3) { if (step === 1) nextContact(); else nextDelivery(); return }
    if (pending || quotePending || !quote || quote.promoCode !== promoCode) return
    if (!delivery || delivery.error || !delivery.type) { setError(delivery?.error || 'Избери начин на доставка.'); return }
    setPending(true)
    setError('')
    const data = new FormData(event.currentTarget)
    if (!requestId.current) requestId.current = crypto.randomUUID()
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId.current, expectedTotal:quote.total, promoCode, visitSessionId: currentVisitSession(),
          customerName: data.get('customerName'), phone: data.get('phone'), email: data.get('email'),
          courier, officeId: delivery.officeId || null, deliveryType, city: delivery.city, postCode: delivery.postCode, deliveryAddress: deliveryType === 'address' ? delivery.addressText : delivery.officeText, notes: data.get('notes'),
          items: items.map(({ productId, variantId, quantity, source }) => ({ productId, variantId, quantity, source })),
        }),
      })
      const result = await response.json() as { error?: string; code?:string; orderNumber?: string; total?: number }
      if(result.code==='PRICE_CHANGED'){setQuote(null);setQuoteRevision(v=>v+1)}
      if (!response.ok || !result.orderNumber) throw new Error(result.error || 'Поръчката не беше записана.')
      const purchaseKey = `tiarra-purchase-${result.orderNumber}`
      // Optional browser storage and analytics must never turn a saved order into an error.
      try {
      if (!window.localStorage.getItem(purchaseKey)) {
        trackCommerce('purchase', { currency: 'EUR', value: result.total ?? quote?.total ?? subtotal + shipping, transaction_id: result.orderNumber, items: items.map((item) => ({ item_id: item.variantId ?? item.productId, item_name: item.title, item_variant: item.variantName ?? undefined, price: quotedPrices.get(`${item.productId}:${item.variantId ?? ''}`) ?? item.unitPrice, quantity: item.quantity })) })
        window.localStorage.setItem(purchaseKey, '1')
      }
      } catch { /* The order is already committed. */ }
      const deliveryText=deliveryType==='address'?[delivery.city,delivery.postCode,delivery.addressText].filter(Boolean).join(', '):delivery.officeText
      setConfirmation({number:result.orderNumber,total:result.total??quote.total,courier,delivery:deliveryText,items:[...items]})
      try { writeCart([]) } catch { /* Keep showing the successful order. */ }
      setItems([])
      setOrderNumber(result.orderNumber)
      requestId.current = ''
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Поръчката не беше записана.')
    } finally { setPending(false) }
  }

  if (!ready) return <p>Зареждане…</p>
  if (orderNumber && confirmation) return <OrderThankYou order={confirmation}/>
  if (items.length === 0) return <div className={styles.success}><p>Количката ти е празна.</p><Link href="/store">Разгледай продуктите</Link></div>

  return (
    <><div className={styles.intro}><span>TIARRA COSMETICS / CHECKOUT</span><h1>Завърши поръчката</h1><p>Избери удобна доставка. Плати при получаване.</p></div><form className={styles.form} onSubmit={submit}>
      <div className={styles.fields}>
        <nav className={controls.progress} aria-label="Стъпки на поръчката">{(['Контакт','Доставка','Плащане'] as const).map((label,index)=><span key={label} aria-current={step===index+1?'step':undefined}>{index+1}. {label}</span>)}</nav>
        <section ref={contactSection} hidden={step!==1} className={styles.step}><div className={styles.stepHead}><span className={styles.stepNumber}>01</span><div><h2>Контакт</h2><p>За да потвърдим поръчката ти</p></div></div><div className={styles.fieldGrid}>
          <label className={styles.full}>Имейл<input name="email" type="email" autoComplete="email" required maxLength={160} placeholder="Име@пример.бг" /></label>
          <label>Име и фамилия<input name="customerName" autoComplete="name" required minLength={2} placeholder="Твоето име" /></label>
          <label>Телефон<input name="phone" type="tel" autoComplete="tel" required minLength={7} placeholder="+359 ..." /></label>
        </div><button type="button" className={controls.stepButton} onClick={nextContact}>Продължи към доставка →</button></section>
        <section hidden={step!==2} className={styles.step}><div className={styles.stepHead}><span className={styles.stepNumber}>02</span><div><h2>Доставка</h2><p>Избери куриер и място за получаване</p></div></div><OrdyxDelivery settings={settings} freeShipping={subtotal >= settings.freeShippingThreshold} onDelivery={value=>{setDelivery(value);if(value.type){const next=value.type.split('_')[0];if(next==='econt'||next==='speedy'||next==='boxnow'){setCourier(next);setDeliveryType(value.type==='boxnow_locker'?'automat':value.type.endsWith('_address')?'address':'office')}}}} /><div className={controls.stepActions}><button type="button" onClick={()=>{setStepError('');setStep(1)}}>← Назад</button><button type="button" onClick={nextDelivery}>Продължи към плащане →</button></div></section>
        <section hidden={step!==3} className={styles.step}><div className={styles.stepHead}><span className={styles.stepNumber}>03</span><div><h2>Плащане</h2><p>Плащаш при получаване</p></div></div><div className={styles.payment}>◉ &nbsp; Наложен платеж <span>Сигурно и удобно</span></div><p className={controls.inspection}>Всяка доставка е с опция за преглед при получаване.</p><label className={styles.notes}>Бележка <span>(по желание)</span><textarea name="notes" rows={2} placeholder="Нещо, което трябва да знаем?" /></label><div className={controls.stepActions}><button type="button" onClick={()=>{setStepError('');setStep(2)}}>← Обратно към доставка</button></div></section>
        {stepError && <p className={controls.stepError} role="alert">{stepError}</p>}
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
              <button type="button" className={controls.removeLine} aria-label={`Премахни ${item.title} от поръчката`} onClick={() => removeItem(item.key)}>Премахни</button>
            </div>
          })}
        </div>
        <p className={styles.shippingStatus}>
          <span aria-hidden="true">{subtotal >= 39 ? '✓' : '↗'}</span>
          {subtotal >= settings.freeShippingThreshold ? 'Безплатна доставка за твоята поръчка' : `Още ${formatPrice(settings.freeShippingThreshold - subtotal)} до безплатна доставка`}
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
        <div className={styles.promo}>
          <label htmlFor="checkout-promo">Имаш промокод?</label>
          <div><input id="checkout-promo" value={promoDraft} maxLength={32} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Въведи кода" disabled={pending} onChange={event => setPromoDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if(!quotePending) applyPromo(promoDraft) } }} /><button type="button" disabled={pending || quotePending || !promoDraft.trim() || promoDraft.trim().toUpperCase() === promoCode} onClick={() => applyPromo(promoDraft)}>Приложи</button></div>
          {promoCode && <p><span>{quote?.promoCode ? `Приложен код: ${promoCode}` : `Код: ${promoCode}`}</span><button type="button" disabled={pending} onClick={() => applyPromo('')}>Премахни</button></p>}
        </div>
        <div className={styles.totals} aria-live="polite">
          <p><span>Междинна сума</span><b>{formatPrice(subtotal)}</b></p>
          {!!quote?.discount && <p><span>Отстъпка · {quote.promoCode}</span><b className={styles.freeShipping}>−{formatPrice(quote.discount)}</b></p>}
          <p><span>Доставка</span><b className={shipping === 0 ? styles.freeShipping : undefined}>{shipping === 0 ? 'Безплатна' : formatPrice(shipping)}</b></p>
          <div><span>Общо за плащане<small>Наложен платеж</small></span><strong>{formatPrice(quote?.total ?? subtotal + shipping)}</strong></div>
        </div>
        <p className={styles.quoteStatus} role="status">{quotePending ? 'Проверяваме цените и наличностите…' : quoteError ? 'Необходима е проверка на поръчката.' : !quote ? 'Изчакваме потвърждение на цените.' : priceChanged ? 'Цените са актуализирани спрямо текущата оферта.' : '✓ Цените и наличностите са потвърдени'}</p>
        {quoteError && <p role="alert" className={styles.error}>{quoteError}</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <p className={styles.orderNotice}>С натискането на „Потвърди поръчката“ приемаш <Link href="/obshti-usloviya" target="_blank" rel="noopener noreferrer">общите условия</Link>. Информация за обработката на личните данни ще намериш в <Link href="/poveritelnost" target="_blank" rel="noopener noreferrer">политиката за поверителност</Link>.</p>
        <button className={styles.submit} type="submit" hidden={step!==3} disabled={step!==3 || pending || quotePending || !quote}>
          <span>{pending ? 'Изпращане…' : 'Потвърди поръчката'}</span><span aria-hidden="true">→</span>
        </button>
        <div className={styles.safe}><span>Преглед при доставка</span><span>Плащаш при получаване</span></div>
      </aside>
    </form></>
  )
}
