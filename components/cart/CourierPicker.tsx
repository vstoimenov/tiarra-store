'use client'

import { useEffect, useState } from 'react'
import type { CourierOffice } from '@/lib/ordyx-offices'
import { formatPrice } from '@/lib/format'
import styles from './CourierPicker.module.css'
import type { CommerceSettings } from '@/lib/commerce-settings-schema'

type Courier = 'econt' | 'speedy'
type PlaceType = 'office' | 'automat' | 'address'
const PLACES = [
  { value: 'office', label: 'До офис' },
  { value: 'automat', label: 'До автомат' },
  { value: 'address', label: 'До адрес' },
] as const

export function CourierPicker({settings, freeShipping = false, onDeliveryChange }: {
  settings:CommerceSettings
  freeShipping?: boolean
  onDeliveryChange?: (courier: Courier,place:PlaceType) => void
}) {
  const couriers=[...(settings.econtEnabled?[{value:'econt' as const,name:'Еконт',officePrice:settings.econtOfficePrice,addressPrice:settings.econtAddressPrice}]:[]),...(settings.speedyEnabled?[{value:'speedy' as const,name:'Спиди',officePrice:settings.speedyOfficePrice,addressPrice:settings.speedyAddressPrice}]:[])]
  const [courier, setCourier] = useState<Courier>(settings.econtEnabled?'econt':'speedy')
  const [offices, setOffices] = useState<CourierOffice[]>([])
  const [citySearch, setCitySearch] = useState('')
  const [officeSearch, setOfficeSearch] = useState('')
  const [city, setCity] = useState('')
  const [officeId, setOfficeId] = useState('')
  const [placeType, setPlaceType] = useState<PlaceType>('office')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setOffices([])
    setError('')
    fetch(`/api/shipping/offices?courier=${courier}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() })
      .then(data => { if (!controller.signal.aborted) setOffices(data.offices) })
      .catch(() => { if (!controller.signal.aborted) setError('Не успяхме да заредим офисите. Опитай отново.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [courier, retry])

  function changeCourier(value: Courier) {
    setCourier(value)
    onDeliveryChange?.(value,'office')
    setOfficeId('')
    setCity('')
    setCitySearch('')
    setOfficeSearch('')
    setOffices([])
    setPlaceType('office')
  }

  function changePlace(value: PlaceType) {
    if (value === placeType) return
    setPlaceType(value)
    setOfficeId('')
    setCity('')
    setCitySearch('')
    setOfficeSearch('')
    onDeliveryChange?.(courier,value)
  }

  const places = offices.filter(office => office.isAutomat === (placeType === 'automat'))
  const cities = [...new Set(places.map(office => office.city))].sort((a, b) => a.localeCompare(b, 'bg'))
  const cityOptions = cities.filter(value => value === city || value.toLocaleLowerCase('bg').includes(citySearch.toLocaleLowerCase('bg')))
  const officeOptions = places.filter(office => office.city === city && (office.id === officeId || `${office.name} ${office.address}`.toLocaleLowerCase('bg').includes(officeSearch.toLocaleLowerCase('bg'))))
  const selected = places.find(office => office.id === officeId)

  return <fieldset className={styles.picker}>
    <legend className="visually-hidden">Избери куриер</legend>
    <input type="hidden" name="deliveryType" value={placeType} />
    {couriers.map(option => {
      const active = courier === option.value
      return <div key={option.value} className={`${styles.option} ${active ? styles.selected : ''}`}>
        <label className={styles.optionHeader}>
          <input type="radio" name="courier" value={option.value} checked={active} onChange={() => changeCourier(option.value)} aria-label={option.name} aria-controls={active ? `delivery-${option.value}` : undefined} />
          <span className={styles.logo}><img src={`/site/${option.value}.png`} width="40" height="40" alt="" /></span>
          <span className={styles.optionText}>
            <strong>{active && placeType === 'address' ? 'До адрес с ' : 'До офис или автомат на '}<b>{option.name}</b></strong>
            <span>{settings.deliveryEstimate}</span>
          </span>
          <span className={`${styles.price} ${freeShipping ? styles.free : ''}`}>{freeShipping ? 'Безплатна' : formatPrice(placeType==='address'?option.addressPrice:option.officePrice)}</span>
        </label>
      </div>
    })}
    <div id={`delivery-${courier}`} className={styles.panel}>
          <fieldset className={styles.placeTypes}>
            <legend>Място за получаване</legend>
            <div>{PLACES.map(place => <button key={place.value} type="button" aria-pressed={placeType === place.value} onClick={() => changePlace(place.value)}>{place.label}</button>)}</div>
          </fieldset>
          {placeType === 'address' ? <div className={styles.addressFields}>
            <label>Град<input name="city" autoComplete="address-level2" required placeholder="Например София" /></label>
            <label>Пощенски код<input name="postCode" autoComplete="postal-code" required placeholder="1000" /></label>
            <label className={styles.full}>Улица, номер и вход<input name="deliveryAddress" autoComplete="street-address" required minLength={5} placeholder="Точният адрес за доставка" /></label>
          </div> : <>
            {loading && <p role="status" className={styles.message}>Зареждане на {placeType === 'office' ? 'офисите' : 'автоматите'}…</p>}
            {error && <p role="alert" className={styles.error}>{error} <button type="button" onClick={() => setRetry(retry + 1)}>Опитай отново</button></p>}
            <div className={styles.fields}>
              <div className={styles.field}><label htmlFor="delivery-city">Населено място</label>
                <input type="search" aria-label="Търси населено място" value={citySearch} onChange={e => setCitySearch(e.target.value)} placeholder="Търси град или село" disabled={loading || Boolean(error)} />
                <select id="delivery-city" required value={city} disabled={loading || Boolean(error)} onChange={event => { setCity(event.target.value); setOfficeId(''); setOfficeSearch('') }}>
                  <option value="">Избери населено място</option>
                  {cityOptions.map(value => <option key={value}>{value}</option>)}
                </select>
              </div>
              <div className={styles.field}><label htmlFor="delivery-office">{placeType === 'office' ? 'Офис на куриера' : 'Автомат за пратки'}</label>
                <input type="search" aria-label="Търси офис или автомат" value={officeSearch} onChange={e => setOfficeSearch(e.target.value)} placeholder="Търси по име или адрес" disabled={!city || loading || Boolean(error)} />
                <select id="delivery-office" name="officeId" required value={officeId} disabled={!city || loading || Boolean(error)} onChange={event => setOfficeId(event.target.value)}>
                  <option value="">Избери {placeType === 'office' ? 'офис' : 'автомат'}</option>
                  {officeOptions.map(office => <option key={office.id} value={office.id}>{office.name} — {office.address}</option>)}
                </select>
              </div>
            </div>
            {!loading && !error && cityOptions.length === 0 && <p className={styles.message}>Няма намерени населени места. Опитай друго име или начин на доставка.</p>}
            {!loading && !error && city && officeOptions.length === 0 && <p className={styles.message}>Няма съвпадения. Опитай друго име или адрес.</p>}
            {selected && <p className={styles.location}><span aria-hidden="true">✓</span><span><strong>{selected.name}</strong>{selected.city}, {selected.address}</span></p>}
            <input type="hidden" name="deliveryAddress" value={selected ? `${selected.city}, ${selected.name}, ${selected.address} [${selected.code}]` : ''} />
          </>}
    </div>
  </fieldset>
}
