'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState,type ReactNode } from 'react'
import styles from './AdminShell.module.css'
const links=[['/admin','Общ преглед','◫'],['/admin/orders','Поръчки','▤'],['/admin/products','Продукти','◇'],['/admin/inventory','Наличности','▦'],['/admin/promos','Промокодове','%'],['/admin/bumps','Допълващи предложения','＋'],['/admin/settings','Настройки','⚙']]
export function AdminShell({children}:{children:ReactNode}){
 const path=usePathname();const [open,setOpen]=useState(false);const [error,setError]=useState('')
 if(path==='/admin/login')return children
 async function logout(){try{const r=await fetch('/api/admin/logout',{method:'POST'});if(!r.ok)throw new Error();window.location.assign('/admin/login')}catch{setError('Изходът не успя. Опитай отново.')}}
 return <div className={styles.shell}><aside className={`${styles.sidebar} ${open?styles.open:''}`}><Link className={styles.brand} href="/admin">TIARRA<span>УПРАВЛЕНИЕ НА МАГАЗИНА</span></Link><nav aria-label="Администрация">{links.map(([href,label,icon])=><Link key={href} href={href} onClick={()=>setOpen(false)} aria-current={path===href?'page':undefined}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav><div className={styles.sidebarBottom}><Link href="/" target="_blank" rel="noopener noreferrer">Отвори магазина ↗</Link><button type="button" onClick={logout}>Изход</button>{error&&<p role="alert">{error}</p>}</div></aside><div className={styles.content}><header className={styles.top}><button type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>☰ Меню</button><span>ТИАРРА КОЗМЕТИКС</span><span className={styles.live}><i/> Администрация</span></header>{children}</div></div>
}
