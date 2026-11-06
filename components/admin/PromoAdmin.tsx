'use client'

import { useState, type FormEvent } from 'react'
import type { AdminPromo } from '@/lib/admin/promos'
import { formatPrice } from '@/lib/format'
import styles from './PromoAdmin.module.css'

const empty = { code: '', kind: 'percent' as const, value: '10', minSubtotal: '0', expiresAt: '', maxUses: '', active: true }
type Draft = Omit<typeof empty, 'kind'> & { kind: 'percent' | 'fixed' }
function localDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16)
}
export function PromoAdmin({ initialPromos }: { initialPromos: AdminPromo[] }) {
  const [promos, setPromos] = useState(initialPromos)
  const [draft, setDraft] = useState<Draft>(empty)
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  function edit(p: AdminPromo) {
    setDraft({ code:p.code, kind:p.kind, value:String(p.value), minSubtotal:String(p.minSubtotal), expiresAt:localDate(p.expiresAt), maxUses:p.maxUses === null ? '' : String(p.maxUses), active:p.active })
    setEditing(true); setMessage(''); document.getElementById('promo-editor')?.scrollIntoView({ block:'start', behavior:'smooth' })
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage('')
    try {
      const response = await fetch('/api/admin/promos', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ...draft, value:Number(draft.value), minSubtotal:Number(draft.minSubtotal), maxUses:draft.maxUses ? Number(draft.maxUses) : null, expiresAt:draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Кодът не беше записан.')
      setPromos(data.promos); setMessage('Промокодът е записан.'); setDraft(empty); setEditing(false)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Няма връзка. Опитай отново.') }
    finally { setPending(false) }
  }
  return <section className={styles.wrap}>
    <form id="promo-editor" className={styles.editor} onSubmit={save}>
      <h2>{editing ? `Редакция на ${draft.code}` : 'Нов промокод'}</h2>
      <div className={styles.fields}>
        <label>Код<input required disabled={editing || pending} minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]{3,32}" value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value.toUpperCase()})} placeholder="Например TIARRA10" autoComplete="off" /><small>3–32 латински букви, цифри, тире или долна черта.</small></label>
        <label>Тип отстъпка<select disabled={pending} value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value as Draft['kind']})}><option value="percent">Процент (%)</option><option value="fixed">Сума в евро (€)</option></select></label>
        <label>Размер на отстъпката<input required disabled={pending} type="number" min="0.01" step="0.01" max={draft.kind==='percent' ? 100 : 999999} value={draft.value} onChange={e=>setDraft({...draft,value:e.target.value})} /></label>
        <label>Минимална поръчка (€)<input required disabled={pending} type="number" min="0" max="999999" step="0.01" value={draft.minSubtotal} onChange={e=>setDraft({...draft,minSubtotal:e.target.value})} /></label>
        <label>Валиден до (местно време)<input disabled={pending} type="datetime-local" value={draft.expiresAt} onChange={e=>setDraft({...draft,expiresAt:e.target.value})} /><small>Остави празно за код без срок.</small></label>
        <label>Максимален брой използвания<input disabled={pending} type="number" min="1" max="1000000" value={draft.maxUses} onChange={e=>setDraft({...draft,maxUses:e.target.value})} placeholder="Без ограничение" /></label>
      </div>
      <label className={styles.toggle}><input type="checkbox" disabled={pending} checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})} />Активен код</label>
      <p className={styles.help}>Един код на поръчка. Отстъпката се прилага върху продуктите, включително намалените, без доставката. Прагът за безплатна доставка се изчислява преди промокода. Анулирането на поръчка не възстановява използването на кода.</p>
      <div className={styles.actions}><button disabled={pending} type="submit">{pending ? 'Записване…' : 'Запази промокода'}</button>{editing && <button type="button" disabled={pending} onClick={()=>{setDraft(empty);setEditing(false);setMessage('')}}>Откажи редакцията</button>}</div>
      <p role="status">{message}</p>
    </form>
    <div className={styles.list}><h2>Създадени кодове</h2>{!promos.length && <p>Все още няма промокодове. Създай първия от формата по-горе.</p>}
      {promos.map(p=><article key={p.code}><div><strong>{p.code}</strong><span>{p.kind==='percent' ? `${p.value}%` : formatPrice(p.value)} отстъпка · Минимум {formatPrice(p.minSubtotal)}</span><small>{p.active ? 'Включен' : 'Спрян'} · Използван {p.uses}{p.maxUses === null ? ' пъти' : ` / ${p.maxUses}`} · {p.expiresAt ? `Валиден до ${new Date(p.expiresAt).toLocaleString('bg-BG')}` : 'Без срок'}</small></div><button type="button" disabled={pending} onClick={()=>edit(p)}>Редактирай</button></article>)}
    </div>
  </section>
}
