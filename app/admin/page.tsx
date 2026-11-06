import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel'
import { sql } from '@/lib/db'
import { GlassOverview, type DailyOrders, type RecentOrder } from '@/components/admin/GlassOverview'
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
 const [daily,recent]=await Promise.all([
 sql<DailyOrders[]>`select d.day::date::text as day, coalesce(sum(o.total),0)::float8 as value,count(o.id)::int as count
 from generate_series((now() at time zone 'Europe/Sofia')::date-29,(now() at time zone 'Europe/Sofia')::date,'1 day') d(day)
 left join store.orders o on (o.created_at at time zone 'Europe/Sofia')::date=d.day::date and o.status<>'cancelled'
 group by d.day order by d.day`,
 sql<RecentOrder[]>`select order_number::text as number,customer_name as customer,total::float8 as total,status from store.orders order by created_at desc limit 6`
 ])
 return <main className={styles.page}><GlassOverview stats={stats} daily={daily} recent={recent}/><AnalyticsPanel/></main>
}
