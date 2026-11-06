import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { sql } from '@/lib/db'
import { parseHomeDocument } from '@/lib/admin/home-document'

export async function PUT(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({error:'Невалиден произход.'},{status:403})
  const body = await request.json().catch(() => null)
  let document
  try { document = parseHomeDocument(body?.document) } catch (e) { return NextResponse.json({error:e instanceof Error ? e.message : 'Невалидно съдържание.'},{status:400}) }
  const rows = body?.publish === true
    ? await sql`update store.site_documents set published=${sql.json(document)}, draft=${sql.json(document)}, updated_at=now() where key='home' returning key`
    : await sql`update store.site_documents set draft=${sql.json(document)}, updated_at=now() where key='home' returning key`
  if (!rows.length) return NextResponse.json({error:'Началната страница липсва.'},{status:404})
  if (body?.publish === true) revalidateTag('site')
  return NextResponse.json({document})
}
