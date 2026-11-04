import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

const schema = z.object({ id: z.string().uuid(), kind: z.enum(['product', 'variant']), stock: z.number().int().min(0).max(99999).nullable() })

export async function PATCH(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const rows = await sql<{ slug: string }[]>`select * from store.update_inventory(${parsed.data.id}, ${parsed.data.kind}, ${parsed.data.stock})`
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePath(`/store/${rows[0].slug}`)
  revalidatePath('/store')
  return NextResponse.json({ ok: true })
}
