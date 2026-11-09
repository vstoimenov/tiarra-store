import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { promoAdminSchema } from '@/lib/promo'
import { getAdminPromos } from '@/lib/admin/promos'

export async function PUT(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Невалиден произход.' }, { status: 403 })
  const parsed = promoAdminSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Провери кода, сумите, срока и лимита.' }, { status: 400 })
  const p = parsed.data
  await sql`insert into store.promo_codes (code,kind,value,min_subtotal,expires_at,max_uses,active,brands)
    values (${p.code},${p.kind},${p.value},${p.minSubtotal},${p.expiresAt},${p.maxUses},${p.active},${p.brands})
    on conflict (code) do update set kind=excluded.kind,value=excluded.value,min_subtotal=excluded.min_subtotal,
    expires_at=excluded.expires_at,max_uses=excluded.max_uses,active=excluded.active,brands=excluded.brands`
  return NextResponse.json({ promos: await getAdminPromos() })
}
