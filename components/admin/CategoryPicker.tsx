'use client'
import { useState } from 'react'
import { Check, Search, Tags } from 'lucide-react'
import type { AdminCategory } from '@/lib/admin/products'
import styles from './CategoryPicker.module.css'
export function CategoryPicker({categories,value,onChange}:{categories:AdminCategory[];value:string[];onChange:(ids:string[])=>void}){
 const [search,setSearch]=useState('')
 const shown=categories.filter(c=>c.name.toLocaleLowerCase('bg').includes(search.toLocaleLowerCase('bg')))
 return <fieldset className={styles.picker}><legend><Tags size={17}/> Категории на продукта <span>{value.length} избрани</span></legend><p>Избери къде да се показва продуктът в магазина. Можеш да избереш повече от една категория.</p>{!categories.length?<p role="alert">Няма налични категории. Провери настройките на каталога.</p>:<><label className={styles.search}><Search size={16}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Намери категория…" aria-label="Търси категория"/></label><div className={styles.choices}>{shown.map(c=><label key={c.id} className={value.includes(c.id)?styles.selected:''}><input type="checkbox" checked={value.includes(c.id)} onChange={e=>onChange(e.target.checked?[...value,c.id]:value.filter(id=>id!==c.id))}/><span>{c.name}</span>{value.includes(c.id)&&<Check size={15}/>}</label>)}</div>{!shown.length&&<p>Няма категории с това име.</p>}{value.length===0&&<small>За публикуване е нужна поне една категория.</small>}</>}</fieldset>
}
