import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, validAdminSession } from '@/lib/admin/session'

export async function middleware(request: NextRequest) {
  const path=request.nextUrl.pathname
  if(path==='/admin/login' || path==='/api/admin/login')return NextResponse.next()
  if(await validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value))return NextResponse.next()
  if(path.startsWith('/api/'))return NextResponse.json({error:'Влез отново в администрацията.'},{status:401})
  const url=request.nextUrl.clone();url.pathname='/admin/login';url.search='';url.searchParams.set('next',path)
  return NextResponse.redirect(url)
}
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] }
