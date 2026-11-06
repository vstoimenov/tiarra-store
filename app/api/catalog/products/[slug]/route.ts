import { NextResponse } from 'next/server'
import { getProductBySlug } from '@/lib/catalog/queries'
export const dynamic='force-dynamic'
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params
 if(!slug||slug.length>220)return NextResponse.json({error:'Невалиден продукт.'},{status:400})
 try{
  const product=await getProductBySlug(slug)
  if(!product)return NextResponse.json({error:'Продуктът вече не е наличен.'},{status:404})
  return NextResponse.json({product},{headers:{'Cache-Control':'no-store'}})
 }catch{ return NextResponse.json({error:'Продуктът не може да се зареди. Опитай отново.'},{status:503}) }
}
