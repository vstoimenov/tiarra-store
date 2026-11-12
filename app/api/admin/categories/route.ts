import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sql } from '@/lib/db'

const schema = z.object({ name: z.string().trim().min(2).max(100) })
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Невалиден произход.' }, { status: 403 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Въведи име от 2 до 100 знака.' }, { status: 400 })
  try {
    const slug = parsed.data.name.toLocaleLowerCase('bg').normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 80)
    if (!slug) return NextResponse.json({ error: 'Въведи име с букви или цифри.' }, { status: 400 })
    const [category] = await sql<{id:string;name:string}[]>`select id,name from store.admin_create_category(${parsed.data.name},${slug})`
    revalidatePath('/', 'layout')
    revalidatePath('/sitemap.xml')
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && (error.message.includes('CATEGORY_EXISTS') || error.message.includes('duplicate key'))) return NextResponse.json({ error: 'Категория с това име вече съществува.' }, { status: 409 })
    console.error('Category creation failed', error)
    return NextResponse.json({ error: 'Категорията не беше създадена.' }, { status: 500 })
  }
}
