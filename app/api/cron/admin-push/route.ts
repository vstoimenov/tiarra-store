import { timingSafeEqual } from 'node:crypto'
import { sendAdminOrderPush } from '@/lib/admin/push'
import { sendScheduledAdminPushTest } from '@/lib/admin/scheduled-push-test'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET
 const expected=Buffer.from(`Bearer ${secret??''}`),supplied=Buffer.from(request.headers.get('authorization')??'')
 if(!secret||expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return Response.json({error:'Unauthorized'},{status:401})
 const [orders,test]=await Promise.all([sendAdminOrderPush(),sendScheduledAdminPushTest()])
 return Response.json({...orders,test},{headers:{'Cache-Control':'no-store'}})
}
