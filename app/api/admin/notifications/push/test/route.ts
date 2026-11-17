import { sql } from '@/lib/db'
import { getPushKeys, sendPush } from '@/lib/admin/push'
import { pushEndpointSchema } from '@/lib/admin/push-schema'
export const runtime='nodejs'
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Невалидна заявка.'},{status:403})
 const parsed=pushEndpointSchema.safeParse((await request.json().catch(()=>null))?.endpoint)
 if(!parsed.success)return Response.json({error:'Невалиден абонамент.'},{status:400})
 const [subscription]=await sql<{endpoint:string;p256dh:string;auth:string}[]>`select endpoint,p256dh,auth from store.admin_push_subscriptions where endpoint=${parsed.data}`
 if(!subscription)return Response.json({error:'Първо включи известията на този телефон.'},{status:404})
 try{
  await sendPush(subscription,{title:'Известията са включени · Tiarra',body:'На този телефон ще получаваш известие при нова поръчка.',tag:'tiarra-push-test',url:'/admin/orders'},await getPushKeys())
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}})
 }catch{return Response.json({error:'Тестовото известие не беше изпратено. Опитай отново.'},{status:502})}
}
