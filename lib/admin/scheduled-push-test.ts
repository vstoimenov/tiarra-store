import {createHash} from 'node:crypto'
import {sql} from '@/lib/db'
import {getPushKeys,pushAvailable,sendPush} from './push'

// One test explicitly requested by the store owner. UTC timestamps; cron runs each minute.
// This expires automatically and never creates or modifies a customer order.
export const scheduledPushTest={id:'owner-test-20261117-1528',notBefore:'2026-11-17T15:28:00Z',expiresAt:'2026-11-17T15:33:00Z'} as const
export async function sendScheduledAdminPushTest(now=Date.now()):Promise<{attempted:number;sent:number}>{
 const result={attempted:0,sent:0}
 if(now<Date.parse(scheduledPushTest.notBefore)||now>=Date.parse(scheduledPushTest.expiresAt))return result
 if(!await pushAvailable())return result
 const devices=await sql<{id:string}[]>`select id from store.admin_push_subscriptions order by id limit 100`
 if(!devices.length)return result
 const keys=await getPushKeys()
 for(const device of devices){
  if(result.attempted>=2)break // Bound provider timeouts alongside normal order notifications.
  try{
   const sent=await sql.begin(async tx=>{
    const [subscription]=await tx<{endpoint:string;p256dh:string;auth:string}[]>`select endpoint,p256dh,auth from store.admin_push_subscriptions where id=${device.id} for share`
    if(!subscription)return false
    // Use the existing transactional rate limiter as a one-send-per-device guard.
    // Its advisory lock serializes cron retries; a failed send rolls back the claim.
    const key=createHash('sha256').update(`admin-push-test:${scheduledPushTest.id}:${device.id}`).digest('hex')
    const [claim]=await tx<{allowed:boolean}[]>`select store.check_checkout_rate_limit(${key},1,86400) as allowed`
    if(!claim.allowed)return false
    result.attempted++
    try{
     await sendPush(subscription,{title:'Тестово известие · Tiarra',body:'Тестът на известията е успешен. Това не е нова поръчка.',tag:scheduledPushTest.id,url:'/admin/orders'},keys)
     return true
    }catch(error){
     if(typeof error==='object'&&error!==null&&'statusCode' in error&&(error.statusCode===404||error.statusCode===410)){
      await tx`delete from store.admin_push_subscriptions where id=${device.id}`
      return false
     }
     throw error
    }
   })
   if(sent)result.sent++
  }catch{/* Roll back the claim and retry at the next cron tick, before expiry. */}
 }
 return result
}
