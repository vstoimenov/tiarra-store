'use client'

import { useMemo, useState, useTransition } from 'react'
import type { InventoryItem } from '@/lib/admin/inventory'
import styles from './InventoryAdmin.module.css'

export function InventoryAdmin({ initialItems }: { initialItems: InventoryItem[] }) {
  const [items, setItems] = useState(initialItems); const [query, setQuery] = useState(''); const [message, setMessage] = useState(''); const [pending, startTransition] = useTransition()
  const visible = useMemo(() => { const q=query.trim().toLocaleLowerCase('bg'); return items.filter((item) => !q || `${item.title} ${item.variantName ?? ''}`.toLocaleLowerCase('bg').includes(q)) }, [items, query])
  function save(item: InventoryItem, value: string) {
    const stock = value === '' ? null : Number(value); if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return
    startTransition(async () => { setMessage(''); const response=await fetch('/api/admin/inventory',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,kind:item.kind,stock})}); if(!response.ok){setMessage('Наличността не беше записана.');return} setItems((current)=>current.map((entry)=>entry.id===item.id?{...entry,stock}:entry));setMessage('Наличността е обновена.') })
  }
  return <section className={styles.panel}><div className={styles.toolbar}><label>Търсене<input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Продукт или разновидност…" /></label><span>{visible.length} позиции</span></div><p className={styles.message} role="status">{pending?'Записване…':message}</p><div className={styles.rows}>{visible.map((item)=><div className={styles.row} key={item.id}><div><strong>{item.title}</strong>{item.variantName?<span>{item.variantName}</span>:null}</div><label><span className="visually-hidden">Наличност за {item.title}</span><input key={`${item.id}-${item.stock}`} type="number" min="0" defaultValue={item.stock ?? ''} placeholder="∞" onBlur={(event)=>save(item,event.target.value)} /></label><a href={`/store/${item.slug}`} target="_blank" rel="noreferrer">Преглед ↗</a></div>)}</div></section>
}
