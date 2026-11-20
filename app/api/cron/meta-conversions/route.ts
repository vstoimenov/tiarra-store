import { timingSafeEqual } from 'node:crypto'
import { sql } from '@/lib/db'
import { metaQueueAvailable, sendMetaPurchase } from '@/lib/meta-conversions'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET
 const expected=Buffer.from(`Bearer ${secret??''}`), supplied=Buffer.from(request.headers.get('authorization')??'')
 if(!secret||expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return Response.json({error:'Unauthorized'},{status:401})
 if(!(await metaQueueAvailable()))return Response.json({enabled:false},{headers:{'Cache-Control':'no-store'}})
 // Matching data is cleared on delivery; remaining failures expire after seven days.
 await sql`delete from store.meta_conversion_queue where created_at<now()-interval '7 days'`
 let sent=0
 for(let attempt=0;attempt<5;attempt++)if(await sendMetaPurchase())sent++
 return Response.json({sent},{headers:{'Cache-Control':'no-store'}})
}
