'use client'

import Script from 'next/script'
import { useEffect, useMemo, useRef, useState } from 'react'
import { courierPrices,type CommerceSettings } from '@/lib/commerce-settings-schema'
import { formatPrice } from '@/lib/format'

export type DeliverySelection = { type: string; officeId: string; officeText: string; city: string; postCode: string; addressText: string; error: string }
type PickerHandle = { setPrices: (prices: Record<string, string>) => void; destroy: () => void }
type Picker = { mount: (target: HTMLElement, options: { api: string; host: string; cards: boolean; types: string[]; prices: Record<string, string>; onChange: (value: DeliverySelection) => void }) => PickerHandle }
declare global { interface Window { OrdyxPicker?: Picker } }

export function OrdyxDelivery({ settings, subtotal, onDelivery }: { settings: CommerceSettings; subtotal: number; onDelivery: (value: DeliverySelection) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const picker = useRef<PickerHandle | null>(null)
  const callback = useRef(onDelivery)
  callback.current = onDelivery
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const types = useMemo(() => [...(settings.econtEnabled ? ['econt_office', ...(settings.econtAddressEnabled ? ['econt_address'] : [])] : []), ...(settings.speedyEnabled ? ['speedy_office', ...(settings.speedyAddressEnabled ? ['speedy_address'] : [])] : []), ...(settings.boxnowEnabled ? ['boxnow_locker'] : [])], [settings.econtEnabled, settings.speedyEnabled, settings.boxnowEnabled, settings.econtAddressEnabled, settings.speedyAddressEnabled])
  const prices = useMemo(() => {
    return Object.fromEntries(Object.entries(courierPrices(settings,subtotal)).map(([method,price])=>[method,price===0?'Безплатна':formatPrice(price)]))
  }, [subtotal, settings])
  const currentPrices = useRef(prices)
  currentPrices.current = prices
  useEffect(() => {
    if (!ready || !container.current) return
    if (!window.OrdyxPicker) { setFailed(true); return }
    picker.current = window.OrdyxPicker.mount(container.current, { api: 'https://app.ordyx.eu', host: 'tiarracosmetics.com', cards: true, types, prices: currentPrices.current, onChange: value => callback.current(value) })
    return () => { picker.current?.destroy(); picker.current = null }
  }, [ready, types])
  useEffect(() => { picker.current?.setPrices(prices) }, [prices])
  return <><Script src="https://app.ordyx.eu/checkout.js" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setFailed(true)} /><div ref={container}/>{failed && <p role="alert">Изборът на доставка не се зареди. Презареди страницата и опитай отново.</p>}</>
}
