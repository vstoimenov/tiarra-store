import { createHash } from 'node:crypto'
import { sql } from '@/lib/db'

export async function checkoutRateLimit(request: Request, scope: 'order' | 'quote' | 'visit'): Promise<boolean> {
  const salt = process.env.CHECKOUT_RATE_LIMIT_SALT || 'tiarra-checkout-rate-v1'
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown'
  const key = createHash('sha256').update(`${salt}:${scope}:${ip}`).digest('hex')
  const limit = scope === 'order' ? 8 : scope === 'quote' ? 60 : 120
  const [row] = await sql<{ allowed: boolean }[]>`select store.check_checkout_rate_limit(${key}, ${limit}, 600) as allowed`
  return row.allowed
}
