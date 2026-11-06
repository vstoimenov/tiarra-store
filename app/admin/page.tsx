import Link from 'next/link'
import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel'
import { sql } from '@/lib/db'
import { formatPrice } from '@/lib/format'
import styles from '@/components/admin/Dashboard.module.css'
export const dynamic='force-dynamic'
export const metadata={title:'Общ преглед | Tiarra Admin'}
export default async function AdminPage(){
 const [stats]=await sql<{today:number;value:number;new_orders:number;sync_errors:number;products:number;low_stock:number}[]>`select
 (select count(*)::int from store.orders where (created_at at time zone 'Europe/Sofia')::date=(now() at time zone 'Europe/Sofia')::date) as today,
 (select coalesce(sum(total),0)::float8 from store.orders where status<>'cancelled' and (created_at at time zone 'Europe/Sofia')::date=(now() at time zone 'Europe/Sofia')::date) as value,
 (select count(*)::int from store.orders where status='new') as new_orders,
 (select count(*)::int from store.orders where (status in ('new','confirmed') and ordyx_sync_status='failed') or (status='cancelled' and ordyx_cancel_status='failed')) as sync_errors,
 (select count(*)::int from store.products where not is_hidden) as products,
 (select count(*)::int from (select p.stock from store.products p where not p.is_hidden and not exists(select 1 from store.variants v where v.product_id=p.id) union all select v.stock from store.variants v join store.products p on p.id=v.product_id where not p.is_hidden) s where stock<=3) as low_stock`
 return <main className={styles.page}><header><span>ТВОЯТ МАГАЗИН, НА ЕДНО МЯСТО</span><h1>Общ преглед</h1><p>Какво се случва днес и къде е нужно вниманието ти.</p></header>
 <div className={styles.metrics}><Link href="/admin/orders"><span>Поръчки днес</span><strong>{stats.today}</strong><small>По българско време</small></Link><Link href="/admin/orders"><span>Стойност на поръчките днес</span><strong>{formatPrice(stats.value)}</strong><small>Без анулираните · не е получен приход</small></Link><Link href="/admin/products"><span>Продукти в магазина</span><strong>{stats.products}</strong><small>Видими продукти</small></Link></div>
 <section className={styles.attention}><h2>За твоя преглед</h2><Link href="/admin/orders"><span>Нови поръчки<strong>Прегледай и потвърди</strong></span><b>{stats.new_orders} →</b></Link><Link href="/admin/inventory"><span>Ниска наличност<strong>Позиции с 3 или по-малко броя</strong></span><b>{stats.low_stock} →</b></Link><Link href="/admin/orders"><span>Ordyx — неуспешна синхронизация<strong>Провери и повтори изпращането</strong></span><b>{stats.sync_errors} →</b></Link></section>
 <section className={styles.quick}><h2>Бързи действия</h2><div><Link href="/admin/products"><span>01</span><strong>Управление на продукти</strong><p>Цени, промоции и видимост.</p></Link><Link href="/admin/promos"><span>02</span><strong>Създай промокод</strong><p>Отстъпки с правила и лимити.</p></Link><Link href="/admin/home"><span>03</span><strong>Редактирай началната страница</strong><p>Секции, кампании и текстове.</p></Link></div></section><AnalyticsPanel /></main>
}
