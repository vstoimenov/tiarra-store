import { NextResponse } from 'next/server'
import { getCourierOffices } from '@/lib/ordyx-offices'

export async function GET(request: Request) {
  const courier = new URL(request.url).searchParams.get('courier')
  if (courier !== 'econt' && courier !== 'speedy') return NextResponse.json({ error: 'Невалиден куриер.' }, { status: 400 })
  try { return NextResponse.json({ offices: await getCourierOffices(courier) }) }
  catch { return NextResponse.json({ error: 'Офисите временно не могат да се заредят.' }, { status: 503 }) }
}
