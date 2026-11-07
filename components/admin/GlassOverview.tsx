'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowUpRight, Package, Plus, ShoppingBag, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import styles from './GlassOverview.module.css'
export type OverviewStats={today:number;value:number;new_orders:number;sync_errors:number;products:number;low_stock:number}
export type DailyOrders={day:string;value:number;count:number}
export type RecentOrder={number:string;customer:string;total:number;status:string}
const statuses:Record<string,string>={new:'Нова',confirmed:'Потвърдена',shipped:'Изпратена',completed:'Завършена',delivered:'Доставена',cancelled:'Отказана'}
export function GlassOverview({stats,daily,recent}:{stats:OverviewStats;daily:DailyOrders[];recent:RecentOrder[]}){
 const [period,setPeriod]=useState(7)
 const shown=daily.slice(-period),max=Math.max(1,...shown.map(d=>d.value)),sum=shown.reduce((n,d)=>n+d.value,0)
 return <>
 <header className={styles.heading}><div><p>ТВОЯТ МАГАЗИН, НА ЕДНО МЯСТО</p><h1>Добре дошъл в Tiarra Cosmetics<span>Един поглед. Ясна картина.</span></h1></div><Link href="/admin/products?new=1"><Plus size={16}/> Нов продукт</Link></header>
 <div className={styles.metrics}>
  <Link href="/admin/orders" className={styles.balance}><div><span>Стойност на поръчките днес</span><ArrowUpRight size={18}/></div><strong>{formatPrice(stats.value)}</strong><small>Без анулираните · не е получен приход</small><div className={styles.balanceBottom}><span>TIARRA COSMETICS</span><ShoppingBag size={23}/></div></Link>
  <Link href="/admin/orders" className={styles.metric}><div><i><ShoppingBag size={18}/></i><ArrowUpRight size={17}/></div><span>Поръчки днес</span><strong>{stats.today}</strong><small>{stats.new_orders} очакват преглед</small></Link>
  <Link href="/admin/products" className={styles.metric}><div><i><Package size={18}/></i><ArrowUpRight size={17}/></div><span>Продукти в магазина</span><strong>{stats.products}</strong><small>{stats.low_stock} позиции с ниска наличност</small></Link>
 </div>
 <div className={styles.middle}><section className={styles.panel}><header><div><h2>Движение на поръчките</h2><p>Стойност на неанулираните поръчки</p></div><div className={styles.segments} aria-label="Период">{[7,30].map(n=><button key={n} type="button" aria-pressed={period===n} onClick={()=>setPeriod(n)}>{n} дни</button>)}</div></header><div className={styles.chartTotal}>{formatPrice(sum)} <small>за избрания период</small></div><div className={styles.chart} role="img" aria-label={`Поръчки за ${period} дни: ${formatPrice(sum)}`}>{shown.map(d=><div key={d.day} title={`${d.day}: ${formatPrice(d.value)}, ${d.count} поръчки`}><i style={{height:`${Math.max(2,d.value/max*100)}%`}}/><span>{period===7?d.day.slice(8):Number(d.day.slice(8))%5===0?d.day.slice(8):''}</span></div>)}</div><details className={styles.chartData}><summary>Покажи данните по дни</summary><table><thead><tr><th>Дата</th><th>Поръчки</th><th>Сума</th></tr></thead><tbody>{shown.map(d=><tr key={d.day}><td>{d.day}</td><td>{d.count}</td><td>{formatPrice(d.value)}</td></tr>)}</tbody></table></details></section>
 <section className={styles.panel}><header><h2>За твоя преглед</h2><span className={styles.badge}>{stats.new_orders+stats.low_stock+stats.sync_errors}</span></header><div className={styles.attention}><Link href="/admin/orders"><span>Нови поръчки<small>Прегледай и потвърди</small></span><b>{stats.new_orders}<ArrowUpRight size={14}/></b></Link><Link href="/admin/inventory"><span>Ниска наличност<small>3 или по-малко броя</small></span><b>{stats.low_stock}<ArrowUpRight size={14}/></b></Link><Link href="/admin/orders"><span>Синхронизация с Ordyx<small>Неуспешни изпращания / откази</small></span><b>{stats.sync_errors}<ArrowUpRight size={14}/></b></Link></div><Link className={styles.campaign} href="/admin/home"><Sparkles size={19}/><span>Подготви следващата кампания<small>Редактирай началната страница</small></span><ArrowUpRight size={17}/></Link></section></div>
 <section className={styles.panel}><header><div><h2>Последни поръчки</h2><p>Последните 6 поръчки в магазина</p></div><Link href="/admin/orders">Виж всички <ArrowUpRight size={14}/></Link></header>{recent.length?<div className={styles.table}><table><thead><tr><th>Поръчка</th><th>Клиент</th><th>Статус</th><th>Сума</th></tr></thead><tbody>{recent.map(o=><tr key={o.number}><td><Link href="/admin/orders">#{o.number}</Link></td><td>{o.customer}</td><td><span className={styles.status} data-status={o.status}>{statuses[o.status]??o.status}</span></td><td>{formatPrice(o.total)}</td></tr>)}</tbody></table></div>:<p className={styles.empty}>Новите поръчки ще се появят тук.</p>}</section>
 </>
}
