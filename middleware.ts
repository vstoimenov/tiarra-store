import { NextRequest, NextResponse } from 'next/server'

function unauthorized(message = 'Въведете администраторските данни.') {
  return new NextResponse(message, {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Tiarra Admin", charset="UTF-8"' },
  })
}

export function middleware(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  if (!username || !password) return new NextResponse('Административният достъп не е конфигуриран.', { status: 503 })

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Basic ')) return unauthorized()

  try {
    const decoded = atob(authorization.slice(6))
    const separator = decoded.indexOf(':')
    const suppliedUser = decoded.slice(0, separator)
    const suppliedPassword = decoded.slice(separator + 1)
    if (separator < 0 || suppliedUser !== username || suppliedPassword !== password) return unauthorized('Невалидни данни.')
  } catch {
    return unauthorized('Невалидни данни.')
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] }

