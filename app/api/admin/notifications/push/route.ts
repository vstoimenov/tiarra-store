import { sql } from '@/lib/db'
import { getPushKeys, pushAvailable } from '@/lib/admin/push'
import { pushEndpointSchema, pushSubscriptionSchema } from '@/lib/admin/push-schema'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'no-store'}
export async function GET(){
 if(!await pushAvailable())return Response.json({available:false},{headers})
 const keys=await getPushKeys()
 return Response.json({available:true,publicKey:keys.public_key},{headers})
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Невалидна заявка.'},{status:403})
 const parsed=pushSubscriptionSchema.safeParse(await request.json().catch(()=>null))
 if(!parsed.success)return Response.json({error:'Абонаментът за известия е невалиден. Опитай отново.'},{status:400})
 if(!await pushAvailable())return Response.json({error:'Първо активирай известията в Supabase.'},{status:503})
 await getPushKeys()
 const {endpoint,keys}=parsed.data
 await sql`insert into store.admin_push_subscriptions(endpoint,p256dh,auth) values(${endpoint},${keys.p256dh},${keys.auth})
  on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,updated_at=now()`
 return Response.json({ok:true},{headers})
}
export async function DELETE(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Невалидна заявка.'},{status:403})
 const body=await request.json().catch(()=>null)
 const parsed=pushEndpointSchema.safeParse(body?.endpoint)
 if(!parsed.success)return Response.json({error:'Невалиден абонамент.'},{status:400})
 if(await pushAvailable())await sql`delete from store.admin_push_subscriptions where endpoint=${parsed.data}`
 return Response.json({ok:true},{headers})
}
