import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { StoreThemeSchema } from '@/lib/sections/schema'

export async function PUT(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Невалиден произход.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const parsed = StoreThemeSchema.safeParse(body?.theme)
  if (!parsed.success) return NextResponse.json({ error: 'Невалидна тема.' }, { status: 400 })
  const theme = parsed.data
  const rows = await sql`
    update store.site_documents
    set published = jsonb_set(published, '{theme}', to_jsonb(${theme}::text), true),
        draft = jsonb_set(coalesce(draft, published), '{theme}', to_jsonb(${theme}::text), true),
        updated_at = now()
    where key = 'home'
    returning published->>'theme' as theme`
  if (!rows.length) return NextResponse.json({ error: 'Настройките на началната страница липсват.' }, { status: 404 })
  revalidateTag('site')
  return NextResponse.json({ theme: rows[0].theme }, { headers: { 'Cache-Control': 'no-store' } })
}
