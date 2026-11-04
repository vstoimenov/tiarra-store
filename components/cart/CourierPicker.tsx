'use client'

import { useEffect, useState } from 'react'
import type { CourierOffice } from '@/lib/ordyx-offices'

export function CourierPicker() {
  const [courier, setCourier] = useState('econt')
  const [offices, setOffices] = useState<CourierOffice[]>([])
  const [city, setCity] = useState('')
  const [officeId, setOfficeId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setOffices([]); setCity(''); setOfficeId(''); setError('')
    fetch(`/api/shipping/offices?courier=${courier}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() })
      .then(data => { if (!controller.signal.aborted) setOffices(data.offices) })
      .catch(() => { if (!controller.signal.aborted) setError('Не успяхме да заредим офисите. Опитай отново.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [courier, retry])
  const cities = [...new Set(offices.map(office => office.city))].sort((a,b) => a.localeCompare(b, 'bg'))
  const selected = offices.find(office => office.id === officeId)
  return <>
    <fieldset><legend>Доставка до офис или автомат</legend>{[['econt','Еконт'],['speedy','Спиди']].map(([value,label]) => <label key={value}><input type="radio" name="courier" value={value} checked={courier === value} onChange={() => { setCourier(value); setOfficeId(''); setCity(''); setOffices([]) }} /> {label}</label>)}</fieldset>
    {loading && <p role="status">Зареждане на офисите…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(retry + 1)}>Опитай отново</button></p>}
    <label>Населено място<select required value={city} onChange={event => { setCity(event.target.value); setOfficeId('') }}><option value="">Избери населено място</option>{cities.map(value => <option key={value}>{value}</option>)}</select></label>
    <label>Офис или автомат<select name="officeId" required value={officeId} onChange={event => setOfficeId(event.target.value)}><option value="">Избери офис</option>{offices.filter(office => office.city === city).map(office => <option key={office.id} value={office.id}>{office.name}{office.isAutomat ? ' (автомат)' : ''} — {office.address}</option>)}</select></label>
    <input type="hidden" name="deliveryAddress" value={selected ? `${selected.city}, ${selected.name}, ${selected.address} [${selected.code}]` : ''} />
  </>
}
