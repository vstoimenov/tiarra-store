import { sql } from '@/lib/db'

export type Customer = { key:string; name:string|null; email:string|null; phone:string|null; orderCount:number; activeOrders:number; orderValue:number; lastOrder:string|null; subscribedAt:string|null }
export type CustomerFilter = 'all'|'buyers'|'subscribers'|'leads'
export function customerFilter(value:string|undefined):CustomerFilter { return value==='buyers'||value==='subscribers'||value==='leads'?value:'all' }
export function filterCustomers(rows:Customer[], query:string, filter:CustomerFilter):Customer[] {
 const term=query.trim().toLocaleLowerCase('bg')
 return rows.filter(row=>(!term||[row.name,row.email,row.phone].some(value=>value?.toLocaleLowerCase('bg').includes(term))) &&
  (filter==='all'||filter==='buyers'&&row.orderCount>0||filter==='subscribers'&&!!row.subscribedAt||filter==='leads'&&row.orderCount===0&&!!row.subscribedAt))
}
/** Existing order and consent records remain the sources; no customer data is copied. */
export async function getCustomers():Promise<Customer[]> {
 return sql<Customer[]>`
 with order_contacts as (
  select coalesce('email:'||nullif(lower(btrim(email)),''),'phone:'||nullif(regexp_replace(phone,'[^0-9]','','g'),''),'order:'||order_number) as contact_key,
   nullif(lower(btrim(email)),'') as email, nullif(btrim(customer_name),'') as name, nullif(btrim(phone),'') as phone,
   status,total,created_at,order_number
  from store.orders
 ), buyers as (
  select contact_key, max(email) as email,
   (array_agg(name order by created_at desc,order_number desc) filter(where name is not null))[1] as name,
   (array_agg(phone order by created_at desc,order_number desc) filter(where phone is not null))[1] as phone,
   count(*)::int as order_count,count(*) filter(where status<>'cancelled')::int as active_orders,
   coalesce(sum(total) filter(where status<>'cancelled'),0)::float8 as order_value,max(created_at) as last_order
  from order_contacts group by contact_key
 ), signups as (
  select lower(btrim(email)) as email,min(created_at) as subscribed_at
  from store.quiz_email_signups group by lower(btrim(email))
 )
 select coalesce(b.contact_key,'email:'||s.email) as key,b.name,coalesce(b.email,s.email) as email,b.phone,
  coalesce(b.order_count,0) as "orderCount",coalesce(b.active_orders,0) as "activeOrders",
  coalesce(b.order_value,0)::float8 as "orderValue",b.last_order::text as "lastOrder",s.subscribed_at::text as "subscribedAt"
 from buyers b full outer join signups s on b.contact_key='email:'||s.email
 order by greatest(b.last_order,s.subscribed_at) desc,coalesce(b.contact_key,'email:'||s.email)`
}
export function customersCsv(rows:Customer[]):string {
 const cell=(value:unknown)=>{const text=value===null||value===undefined?'':String(value);return '"'+(/^[=+@\-\t\r]/.test(text)?"'":'')+text.replaceAll('"','""')+'"'}
 return '\ufeffИме,Имейл,Телефон,Поръчки,Неанулирани поръчки,Стойност EUR,Последна поръчка,Съгласие за оферти,Дата на съгласие\r\n'+rows.map(r=>[r.name,r.email,r.phone,r.orderCount,r.activeOrders,r.orderValue,r.lastOrder,r.subscribedAt?'Да':'Не',r.subscribedAt].map(cell).join(',')).join('\r\n')
}
