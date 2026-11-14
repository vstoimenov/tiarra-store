'use client'

// Adapted from the supplied Adjustable Glass Dashboard for the Tiarra workspace.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowUpRight, Boxes, ChartNoAxesCombined, ChevronRight, House, Layers, LogOut, Menu, Package, Palette, Search, Settings2, ShoppingBag, TicketPercent, UsersRound, X } from 'lucide-react'
import styles from './adjustable-glass-dashboard.module.css'

const sections = [
  {href:'/admin',label:'Общ преглед',icon:ChartNoAxesCombined,group:'Магазин'},
  {href:'/admin/orders',label:'Поръчки',icon:ShoppingBag,group:'Магазин'},
  {href:'/admin/customers',label:'Клиенти',icon:UsersRound,group:'Магазин'},
  {href:'/admin/products',label:'Продукти',icon:Package,group:'Магазин'},
  {href:'/admin/inventory',label:'Наличности',icon:Boxes,group:'Магазин'},
  {href:'/admin/home',label:'Начална страница',icon:House,group:'Съдържание'},
  {href:'/admin/appearance',label:'Визия на магазина',icon:Palette,group:'Съдържание'},
  {href:'/admin/promos',label:'Промокодове',icon:TicketPercent,group:'Съдържание'},
  {href:'/admin/bumps',label:'Допълващи оферти',icon:Layers,group:'Съдържание'},
  {href:'/admin/settings',label:'Настройки',icon:Settings2,group:'Управление'},
]
export default function GlassDashboard({children}:{children:ReactNode}) {
  const path=usePathname()
  const [menu,setMenu]=useState(false),[search,setSearch]=useState(''),[opacity,setOpacity]=useState(82),[blur,setBlur]=useState(22),[error,setError]=useState(''),[leaving,setLeaving]=useState(false)
  useEffect(()=>{try{const value=JSON.parse(localStorage.getItem('tiarra-admin-glass')??'null');if(value){if(Number.isFinite(value.opacity))setOpacity(Math.min(96,Math.max(65,value.opacity)));if(Number.isFinite(value.blur))setBlur(Math.min(36,Math.max(0,value.blur)))}}catch{}},[])
  function appearance(nextOpacity:number,nextBlur:number){setOpacity(nextOpacity);setBlur(nextBlur);try{localStorage.setItem('tiarra-admin-glass',JSON.stringify({opacity:nextOpacity,blur:nextBlur}))}catch{}}
  async function logout(){setLeaving(true);try{const response=await fetch('/api/admin/logout',{method:'POST'});if(!response.ok)throw new Error();window.location.assign('/admin/login')}catch{setError('Изходът не успя. Опитай отново.');setLeaving(false)}}
  const current=sections.find(s=>s.href===path)
  return <div className={styles.root} style={{'--glass-alpha':opacity/100,'--glass-blur':`${blur}px`} as CSSProperties} onKeyDown={e=>{if(e.key==='Escape')setMenu(false)}}>
    <a className={styles.skip} href="#admin-content">Към съдържанието</a>
    <header className={styles.top}>
      <Link href="/admin" className={styles.brand}><span><Layers size={20}/></span><strong>TIARRA COSMETICS</strong><i/><small>Работно пространство</small></Link>
      <div className={styles.topActions}>
        <details className={styles.appearance}><summary><Settings2 size={17}/><span>Визия</span></summary><div className={styles.popover}><strong>Визия</strong><Link href="/admin/appearance" className={styles.themeLink}><Palette size={16}/> Теми на магазина <ChevronRight size={15}/></Link><hr/><small>Работно пространство</small><label>Плътност <output>{opacity}%</output><input aria-label="Плътност на панелите" type="range" min="65" max="96" value={opacity} onChange={e=>appearance(Number(e.target.value),blur)}/></label><label>Размиване <output>{blur}px</output><input aria-label="Размиване на фона" type="range" min="0" max="36" value={blur} onChange={e=>appearance(opacity,Number(e.target.value))}/></label><button type="button" onClick={()=>appearance(82,22)}>Възстанови панела</button></div></details>
        <Link href="/" target="_blank" rel="noreferrer" className={styles.visit}>Към магазина <ArrowUpRight size={17}/></Link>
        <button className={styles.menuButton} type="button" aria-label={menu?'Затвори менюто':'Отвори менюто'} aria-expanded={menu} aria-controls="admin-navigation" onClick={()=>setMenu(!menu)}>{menu?<X size={20}/>:<Menu size={20}/>}</button>
        <span className={styles.avatar} aria-label="Tiarra администратор">T</span>
      </div>
    </header>
    <div className={styles.workspace}>
      <aside id="admin-navigation" className={`${styles.sidebar} ${menu?styles.open:''}`}>
        <label className={styles.search}><Search size={16}/><input type="search" placeholder="Намери раздел…" aria-label="Търси в админ менюто" value={search} onChange={e=>setSearch(e.target.value)}/></label>
        <nav aria-label="Администрация">{['Магазин','Съдържание','Управление'].map(group=><div key={group}><p>{group}</p>{sections.filter(s=>s.group===group&&s.label.toLocaleLowerCase('bg').includes(search.toLocaleLowerCase('bg'))).map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={path===href?'page':undefined} onClick={()=>setMenu(false)}><Icon size={19}/><span>{label}</span>{path===href&&<ChevronRight size={14}/>}</Link>)}</div>)}</nav>
        <div className={styles.sidebarBottom}><span className={styles.storeIdentity}><i/> Tiarra Cosmetics</span><small>Всичко за твоя магазин.</small><button type="button" onClick={logout} disabled={leaving}><LogOut size={16}/>{leaving?'Излизане…':'Изход от профила'}</button>{error&&<p role="alert">{error}</p>}</div>
      </aside>
      <div className={styles.surface} id="admin-content" tabIndex={-1}><div className={styles.breadcrumb}>Работно пространство <ChevronRight size={13}/><strong>{current?.label??'Администрация'}</strong></div>{children}</div>
    </div>
    <nav className={styles.dock} aria-label="Бърза навигация">{sections.filter(s=>['/admin','/admin/products','/admin/orders','/admin/home'].includes(s.href)).map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={href===path?'page':undefined}><Icon size={18}/><span>{label}</span></Link>)}</nav>
  </div>
}
