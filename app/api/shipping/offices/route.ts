import { NextResponse } from 'next/server'
import { getCourierOffices } from '@/lib/ordyx-offices'
import { signOffice } from '@/lib/office-token'

export async function GET(request: Request) {
  const courier = new URL(request.url).searchParams.get('courier')
  if (courier !== 'econt' && courier !== 'speedy') return NextResponse.json({ error: 'Невалиден куриер.' }, { status: 400 })
  try {
    return NextResponse.json(
      { offices: (await getCourierOffices(courier)).map(office=>({...office,selectionToken:signOffice(courier,office)})) },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  }
  catch { return NextResponse.json({ error: 'Офисите временно не могат да се заредят.' }, { status: 503 }) }
}
