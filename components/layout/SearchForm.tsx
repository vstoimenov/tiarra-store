'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { ProductCard } from '@/lib/catalog/types'
import { filterProducts } from '@/lib/catalog/filter'
import { imageUrl } from '@/lib/images'
import { formatPrice } from '@/lib/format'
import { SearchIcon } from './icons'
import styles from './SearchForm.module.css'

let catalogRequest: Promise<ProductCard[]> | null = null
function catalog() {
  if (!catalogRequest) catalogRequest = fetch('/api/catalog').then(r => {if (!r.ok) throw new Error('Catalog unavailable');return r.json() as Promise<ProductCard[]>}).catch(error => {catalogRequest = null;throw error})
  return catalogRequest
}

export function SearchForm({ large = false }: { large?: boolean }) {
  const [query, setQuery] = useState('')
  const [cards, setCards] = useState<ProductCard[]>([])
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (query.trim().length < 2) return
    let active = true
    const timer = setTimeout(() => {
      setStatus('Зареждане…')
      catalog().then(data => {if(active){setCards(data);setStatus('')}}).catch(() => {if(active) setStatus('Натисни „Търси“, за да видиш резултатите.')})
    }, 200)
    return () => {active=false;clearTimeout(timer)}
  }, [query])
  const results = filterProducts(cards, { text: query }).slice(0, 5)
  return (
    <form ref={form} action="/store" method="get" role="search" className={large ? `${styles.form} ${styles.large}` : styles.form} onBlur={e => {if(!e.currentTarget.contains(e.relatedTarget)) setOpen(false)}} onKeyDown={e => {if(e.key === 'Escape') setOpen(false);if(e.key === 'ArrowDown'){e.preventDefault();form.current?.querySelector<HTMLAnchorElement>('a')?.focus()}}}>
      <input type="search" name="q" value={query} onChange={e => {setQuery(e.target.value);setOpen(true)}} onFocus={() => setOpen(true)} className={styles.input} placeholder="Търсене..." aria-label="Търсене" autoComplete="off" />
      <button type="submit" className={styles.submit} aria-label="Търси"><SearchIcon /></button>
      {open && query.trim().length >= 2 && <div className={styles.results}><p role="status">{status || (results.length ? 'Предложения' : 'Няма съвпадения. Опитай друга марка или име.')}</p>{!status && results.map(card => <Link onClick={() => setOpen(false)} key={card.slug} href={`/store/${card.slug}`}>{card.imagePath && <img src={imageUrl(card.imagePath,400)} alt="" width={40} height={40}/>}<span>{card.title}<strong>{formatPrice(card.price)}</strong></span></Link>)}<Link onClick={() => setOpen(false)} href={`/store?q=${encodeURIComponent(query)}`}>Всички резултати →</Link></div>}
    </form>
  )
}
