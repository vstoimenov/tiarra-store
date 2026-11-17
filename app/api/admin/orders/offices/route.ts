import { NextResponse } from 'next/server'
import { getCourierOffices } from '@/lib/ordyx-offices'
export async function GET(request: Request) {
  const courier = new URL(request.url).searchParams.get('courier')
  if (courier !== 'econt' && courier !== 'speedy' && courier !== 'boxnow') return NextResponse.json({ error: 'Невалиден куриер.' }, { status: 400 })
  try { return NextResponse.json({ offices: await getCourierOffices(courier) }, { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'Офисите не могат да се заредят. Опитай отново.' }, { status: 503 }) }
}
