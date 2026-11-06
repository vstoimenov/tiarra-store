import { NextResponse } from 'next/server'
import { getAnalyticsReport } from '@/lib/admin/analytics'
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;const from=params.get('from'),to=params.get('to')
 if(!from||!to||!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to))return NextResponse.json({error:'Невалиден период.'},{status:400})
 const fromTime=Date.parse(from+'T00:00:00Z'),toTime=Date.parse(to+'T00:00:00Z')
 if(!Number.isFinite(fromTime)||!Number.isFinite(toTime)||new Date(fromTime).toISOString().slice(0,10)!==from||new Date(toTime).toISOString().slice(0,10)!==to||toTime<fromTime||toTime-fromTime>366*864e5||toTime>Date.now()+864e5)return NextResponse.json({error:'Периодът трябва да е до една година.'},{status:400})
 return NextResponse.json(await getAnalyticsReport(from,to),{headers:{'Cache-Control':'no-store'}})
}
