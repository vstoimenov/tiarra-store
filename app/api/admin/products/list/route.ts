import { NextResponse } from 'next/server'
import { getAdminProducts } from '@/lib/admin/products'
export async function GET(){return NextResponse.json({products:await getAdminProducts()},{headers:{'Cache-Control':'no-store'}})}
