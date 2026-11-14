import Link from 'next/link'
import { customerFilter,filterCustomers,getCustomers } from '@/lib/admin/customers'
import { formatPrice } from '@/lib/format'
import styles from './page.module.css'
export const dynamic='force-dynamic'
export const metadata={title:'Клиенти | Tiarra Admin',robots:{index:false,follow:false}}
const date=(value:string|null)=>value?new Date(value).toLocaleDateString('bg-BG',{timeZone:'Europe/Sofia'}):'—'
export default async function CustomersPage({searchParams}:{searchParams:Promise<{q?:string;filter?:string;page?:string}>}){
 const params=await searchParams,q=(typeof params.q==='string'?params.q:'').slice(0,200),filter=customerFilter(params.filter)
 const all=await getCustomers(),rows=filterCustomers(all,q,filter),pages=Math.max(1,Math.ceil(rows.length/50)),page=Math.min(pages,Math.max(1,Number.parseInt(params.page??'1',10)||1)),visible=rows.slice((page-1)*50,page*50)
 const url=(next:number)=>'/admin/customers?'+new URLSearchParams({q,filter,page:String(next)})
 return <main className={styles.page}><header className={styles.header}><p>TIARRA ADMIN</p><h1>Клиенти</h1><span>Поръчки и доброволни записвания за оферти на едно място. Контактите с еднакъв имейл са обединени.</span></header>
 <div className={styles.stats}><div><strong>{all.length}</strong><span>Всички контакти</span></div><div><strong>{all.filter(r=>r.orderCount>0).length}</strong><span>С поръчки</span></div><div><strong>{all.filter(r=>r.subscribedAt).length}</strong><span>Съгласие за оферти</span></div></div>
 <form className={styles.toolbar} method="get"><label>Търсене<input name="q" defaultValue={q} maxLength={200} placeholder="Име, имейл или телефон" type="search"/></label><label>Покажи<select name="filter" defaultValue={filter}><option value="all">Всички контакти</option><option value="buyers">С поръчки</option><option value="subscribers">Съгласие за оферти</option><option value="leads">Само записани, без поръчка</option></select></label><button>Търси</button><Link href="/admin/customers">Изчисти</Link></form>
 <div className={styles.results}><p>{rows.length} контакта</p><a className={styles.export} href={'/api/admin/customers?'+new URLSearchParams({q,filter})}>Изтегли CSV</a></div>
 <p className={styles.hint}>Поръчката сама по себе си не означава съгласие за рекламни имейли. За кампании използвай филтъра „Съгласие за оферти“. Стойността изключва анулираните поръчки.</p>
 <div className={styles.list}>{visible.map(row=><article className={styles.card} key={row.key}><div className={styles.contact}><h2>{row.name??'Без въведено име'}</h2>{row.email?<a href={'mailto:'+row.email}>{row.email}</a>:<span>Без имейл</span>}{row.phone&&<a href={'tel:'+row.phone}>{row.phone}</a>}</div><div className={styles.orders}><strong>{row.orderCount} поръчки · {formatPrice(row.orderValue)}</strong><span>Последна: {date(row.lastOrder)}</span>{row.orderCount>0&&row.activeOrders===0&&<span>Всички поръчки са анулирани</span>}</div><div className={styles.consent}><span className={row.subscribedAt?styles.yes:styles.no}>{row.subscribedAt?'Съгласие за оферти':'Без съгласие за оферти'}</span><small>{row.subscribedAt?'Записан на '+date(row.subscribedAt):row.orderCount?'Контакт от поръчка':'—'}</small>{row.subscribedAt&&<Link href="/admin/quiz-signups">Управление на записването →</Link>}</div></article>)}</div>
 {!visible.length&&<p>Няма контакти за този избор.</p>}
 <nav className={styles.pagination} aria-label="Страници с клиенти">{page>1&&<Link href={url(page-1)}>← Предишна</Link>}<span>Страница {page} от {pages}</span>{page<pages&&<Link href={url(page+1)}>Следваща →</Link>}</nav>
 </main>
}
