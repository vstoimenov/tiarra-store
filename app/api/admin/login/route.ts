import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { ADMIN_COOKIE, createAdminSession, SESSION_SECONDS } from '@/lib/admin/session'

export async function POST(request: Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Невалиден произход.'},{status:403})
  const username=process.env.ADMIN_USERNAME, password=process.env.ADMIN_PASSWORD
  if(!username || !password)return NextResponse.json({error:'Достъпът още не е настроен.'},{status:503})
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const key=createHash('sha256').update(`admin:${password}:${ip}`).digest('hex')
  const [rate]=await sql<{allowed:boolean}[]>`select store.check_checkout_rate_limit(${key},10,600) as allowed`
  if(!rate.allowed)return NextResponse.json({error:'Твърде много опити. Опитай след 10 минути.'},{status:429})
  const data=await request.json().catch(()=>null)
  if(typeof data?.username!=='string' || typeof data?.password!=='string' || data.username.length>120 || data.password.length>256)return NextResponse.json({error:'Невалидни данни за вход.'},{status:400})
  const hash=(value:string)=>createHash('sha256').update(value).digest()
  const userMatches=timingSafeEqual(hash(data.username),hash(username))
  const passMatches=timingSafeEqual(hash(data.password),hash(password))
  if(!userMatches || !passMatches)return NextResponse.json({error:'Невалидно име или парола.'},{status:401})
  const response=NextResponse.json({ok:true})
  response.headers.set('Cache-Control','no-store')
  response.cookies.set(ADMIN_COOKIE,await createAdminSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:SESSION_SECONDS})
  return response
}
