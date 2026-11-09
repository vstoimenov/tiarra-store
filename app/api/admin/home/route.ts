import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { sql } from '@/lib/db'
import { parseHomeDocument } from '@/lib/admin/home-document'

export async function PUT(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({error:'Невалиден произход.'},{status:403})
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || !('revision' in body) || (body.revision !== null && typeof body.revision !== 'string') || typeof body.publish !== 'boolean') return NextResponse.json({error:'Презареди редактора и опитай отново.'},{status:400})
  let document
  try { document = parseHomeDocument(body?.document) } catch (e) { return NextResponse.json({error:e instanceof Error ? e.message : 'Невалидно съдържание.'},{status:400}) }
  const rows = body?.publish === true
    ? await sql`update store.site_documents set published=${sql.json(document)}, draft=${sql.json(document)}, updated_at=now() where key='home' and updated_at::text is not distinct from ${body.revision} returning updated_at::text as revision`
    : await sql`update store.site_documents set draft=${sql.json(document)}, updated_at=now() where key='home' and updated_at::text is not distinct from ${body.revision} returning updated_at::text as revision`
  if (!rows.length) return NextResponse.json({error:'Страницата е променена от друг таб. Копирай незапазените си текстове и презареди, преди да продължиш.'},{status:409})
  if (body?.publish === true) { revalidateTag('site'); revalidatePath('/', 'layout') }
  return NextResponse.json({document,revision:rows[0].revision})
}
