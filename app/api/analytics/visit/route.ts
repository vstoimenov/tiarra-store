import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { checkoutRateLimit } from '@/lib/rate-limit'
const schema=z.object({sessionId:z.string().uuid(),visitorId:z.string().uuid(),path:z.string().max(300).startsWith('/')})
export async function POST(request:Request){
 const p=schema.safeParse(await request.json().catch(()=>null));if(!p.success)return NextResponse.json({error:'Invalid event'},{status:400})
 if(p.data.path.startsWith('/admin')||p.data.path.startsWith('/api'))return new NextResponse(null,{status:204})
 if(!(await checkoutRateLimit(request,'visit')))return new NextResponse(null,{status:429})
 await sql`insert into store.visit_sessions(id,visitor_id) values(${p.data.sessionId},${p.data.visitorId})
 on conflict(id) do update set page_views=store.visit_sessions.page_views+1,last_seen_at=now()
 where store.visit_sessions.visitor_id=excluded.visitor_id`
 return new NextResponse(null,{status:204,headers:{'Cache-Control':'no-store'}})
}
