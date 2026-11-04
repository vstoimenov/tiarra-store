'use client'

import { useEffect, useState } from 'react'
import type { CourierOffice } from '@/lib/ordyx-offices'
import styles from './CheckoutForm.module.css'

export function CourierPicker({ onCourierChange }: { onCourierChange?: (courier: 'econt' | 'speedy') => void }) {
  const [courier, setCourier] = useState<'econt' | 'speedy'>('econt')
  const [offices, setOffices] = useState<CourierOffice[]>([])
  const [city, setCity] = useState('')
  const [officeId, setOfficeId] = useState('')
  const [placeType, setPlaceType] = useState<'office' | 'automat' | 'address'>('office')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (placeType === 'address') {
      setLoading(false); setError(''); setOffices([]); setCity(''); setOfficeId('')
      return
    }
    const controller = new AbortController()
    setLoading(true); setOffices([]); setCity(''); setOfficeId(''); setError('')
    fetch(`/api/shipping/offices?courier=${courier}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() })
      .then(data => { if (!controller.signal.aborted) setOffices(data.offices) })
      .catch(() => { if (!controller.signal.aborted) setError('Не успяхме да заредим офисите. Опитай отново.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [courier, placeType, retry])
  const cities = [...new Set(offices.map(office => office.city))].sort((a,b) => a.localeCompare(b, 'bg'))
  const selected = offices.find(office => office.id === officeId)
  return <div className={styles.picker}>
    <div className={styles.couriers}>{(['econt','speedy'] as const).map(value => <label key={value} className={courier === value ? styles.selected : ''}><input type="radio" name="courier" value={value} checked={courier === value} onChange={() => { setCourier(value); onCourierChange?.(value); setOfficeId(''); setCity(''); setOffices([]) }} /><strong>{value === 'econt' ? 'Еконт' : 'Спиди'}</strong><span>1–2 работни дни</span></label>)}</div>
    <div className={styles.placeTypes}><button type="button" className={placeType === 'address' ? styles.active : ''} onClick={() => { setPlaceType('address'); setOfficeId('') }}>⌂ &nbsp; До адрес</button><button type="button" className={placeType === 'office' ? styles.active : ''} onClick={() => { setPlaceType('office'); setOfficeId('') }}>▣ &nbsp; До офис</button><button type="button" className={placeType === 'automat' ? styles.active : ''} onClick={() => { setPlaceType('automat'); setOfficeId('') }}>▤ &nbsp; До автомат</button></div>
    {loading && <p role="status">Зареждане на офисите…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(retry + 1)}>Опитай отново</button></p>}
    <input type="hidden" name="deliveryType" value={placeType} />
    {placeType === 'address' ? <div className={styles.pickerFields}><label>Град<input name="city" required placeholder="Например София" /></label><label>Пощенски код<input name="postCode" required placeholder="1000" /></label><label>Улица, номер и вход<input name="deliveryAddress" required minLength={5} placeholder="Точният адрес за доставка" /></label></div> : <><div className={styles.pickerFields}><label>Населено място<select required value={city} onChange={event => { setCity(event.target.value); setOfficeId('') }}><option value="">Избери населено място</option>{cities.map(value => <option key={value}>{value}</option>)}</select></label>
    <label>Избери {placeType === 'office' ? 'офис' : 'автомат'}<select name="officeId" required value={officeId} onChange={event => setOfficeId(event.target.value)}><option value="">Избери {placeType === 'office' ? 'офис' : 'автомат'}</option>{offices.filter(office => office.city === city && office.isAutomat === (placeType === 'automat')).map(office => <option key={office.id} value={office.id}>{office.name} — {office.address}</option>)}</select></label></div>
    <input type="hidden" name="deliveryAddress" value={selected ? `${selected.city}, ${selected.name}, ${selected.address} [${selected.code}]` : ''} /></>}
  </div>
}
