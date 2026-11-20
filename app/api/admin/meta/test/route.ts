import { sendMetaIntegrationTest } from '@/lib/meta-conversions'
export const runtime='nodejs'
export const maxDuration=15
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403})
 try{
  const result=await sendMetaIntegrationTest(request)
  return Response.json(result.ok?{ok:true}:{error:result.error},{status:result.ok?200:422,headers:{'Cache-Control':'no-store'}})
 }catch{return Response.json({error:'Проверката не е достъпна. Опитай отново.'},{status:503})}
}
