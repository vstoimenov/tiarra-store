import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0,100) ?? ''
  if (query.length < 2) return NextResponse.json({ products: [] })
  const products = await sql<{ id:string;title:string;price:number;variants:{id:string;name:string;price:number}[] }[]>`
    select p.id,p.title,p.price::float8,coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'price',v.price::float8) order by v.position,v.id) from store.variants v where v.product_id=p.id),'[]') as variants
    from store.products p where not p.is_hidden and strpos(lower(p.title),lower(${query}))>0 order by p.title limit 20`
  return NextResponse.json({ products }, { headers: { 'Cache-Control': 'no-store' } })
}
