import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { checkoutRateLimit } from '@/lib/rate-limit'

const signup = z.object({ email: z.string().trim().email().max(254), consent: z.literal(true) }).strict()
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Невалидна заявка.' }, { status: 403 })
  const data = signup.safeParse(await request.json().catch(() => null))
  if (!data.success) return NextResponse.json({ error: 'Въведи валиден имейл и отбележи съгласието си.' }, { status: 400 })
  try {
    if (!(await checkoutRateLimit(request, 'quiz-signup'))) return NextResponse.json({ error: 'Опитай отново след малко.' }, { status: 429 })
    await sql`insert into store.quiz_email_signups (email, consent_version) values (${data.data.email.toLowerCase()}, 'quiz-marketing-v1') on conflict (email) do nothing`
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Не успяхме да запазим имейла. Можеш да продължиш към резултатите.' }, { status: 503 })
  }
}
