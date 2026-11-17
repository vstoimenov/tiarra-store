import * as webpush from 'web-push'
import { sql } from '@/lib/db'
import { formatPrice } from '@/lib/format'
import { allowedPushEndpoint } from './push-schema'

type PushKeys={public_key:string;private_key:string}
export async function pushAvailable():Promise<boolean>{
 const [row]=await sql<{available:boolean}[]>`select to_regclass('store.admin_push_queue') is not null as available`
 return row.available
}
export async function getPushKeys():Promise<PushKeys>{
 const [existing]=await sql<PushKeys[]>`select public_key,private_key from store.admin_push_config where singleton`
 if(existing)return existing
 const keys=webpush.generateVAPIDKeys()
 await sql`insert into store.admin_push_config(singleton,public_key,private_key) values(true,${keys.publicKey},${keys.privateKey}) on conflict(singleton) do nothing`
 const [saved]=await sql<PushKeys[]>`select public_key,private_key from store.admin_push_config where singleton`
 return saved
}
export async function sendPush(subscription:{endpoint:string;p256dh:string;auth:string},payload:Record<string,unknown>,keys:PushKeys){
 if(!allowedPushEndpoint(subscription.endpoint))throw new Error('INVALID_PUSH_ENDPOINT')
 return webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify(payload),{
  TTL:3600,urgency:'high',timeout:8000,
  vapidDetails:{subject:'mailto:info@tiarracosmetics.com',publicKey:keys.public_key,privateKey:keys.private_key},
 })
}
function expired(error:unknown){return typeof error==='object'&&error!==null&&'statusCode' in error&&(error.statusCode===404||error.statusCode===410)}
export async function sendQueuedAdminPush(queueId:string):Promise<boolean>{
 return sql.begin(async tx=>{
  const [entry]=await tx<{id:string;subscription_id:string;order_number:string;order_status:string;total:number;endpoint:string;p256dh:string;auth:string;attempts:number}[]>`
   select q.id,q.subscription_id,q.attempts,o.order_number::text,o.status as order_status,o.total::float8,s.endpoint,s.p256dh,s.auth
   from store.admin_push_queue q join store.orders o on o.id=q.order_id join store.admin_push_subscriptions s on s.id=q.subscription_id
   where q.id=${queueId} and q.status in ('pending','failed') and q.next_attempt_at<=now() and q.attempts<12
    and q.created_at>now()-interval '24 hours' for update of q skip locked`
  if(!entry)return false
  if(!['new','confirmed'].includes(entry.order_status)){
   await tx`update store.admin_push_queue set status='skipped' where id=${entry.id}`;return false
  }
  // Use the transaction handle: a second connection could deadlock a one-connection pool.
  const [keys]=await tx<PushKeys[]>`select public_key,private_key from store.admin_push_config where singleton`
  if(!keys)return false
  try {
   await sendPush(entry,{title:'Нова поръчка · Tiarra',body:`Поръчка №${entry.order_number} · ${formatPrice(entry.total)}`,tag:`tiarra-order-${entry.order_number}`,url:`/admin/orders?order=${entry.order_number}`,orderNumber:entry.order_number},keys)
   await tx`update store.admin_push_queue set status='sent',sent_at=now(),attempts=attempts+1 where id=${entry.id}`
   return true
  }catch(error){
   if(expired(error))await tx`delete from store.admin_push_subscriptions where id=${entry.subscription_id}`
   else await tx`update store.admin_push_queue set status='failed',attempts=attempts+1,next_attempt_at=now()+${Math.min(3600,30*2**entry.attempts)}*interval '1 second' where id=${entry.id}`
   // Endpoints and encryption keys are bearer secrets; do not log the provider response.
   return false
  }
 })
}
export async function sendAdminOrderPush(orderNumber?:string):Promise<{attempted:number;sent:number}>{
 if(!await pushAvailable())return {attempted:0,sent:0}
 const rows=await sql<{id:string}[]>`select q.id from store.admin_push_queue q join store.orders o on o.id=q.order_id
  where q.status in ('pending','failed') and q.next_attempt_at<=now() and q.attempts<12 and q.created_at>now()-interval '24 hours'
   and (${orderNumber??null}::bigint is null or o.order_number=${orderNumber??null}::bigint)
  order by q.created_at limit 5`
 let sent=0
 for(const row of rows)if(await sendQueuedAdminPush(row.id))sent++
 return {attempted:rows.length,sent}
}
