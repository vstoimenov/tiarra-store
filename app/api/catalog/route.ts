import { NextResponse } from 'next/server'
import { getProductCards } from '@/lib/catalog/queries'

export const revalidate = 300
export async function GET() {
  return NextResponse.json(await getProductCards())
}
