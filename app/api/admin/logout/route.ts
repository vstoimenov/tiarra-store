import { NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/admin/session'
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Невалиден произход.'},{status:403})
 const response=NextResponse.json({ok:true});response.cookies.set(ADMIN_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});return response
}
