import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sql } from '@/lib/db'
const price=z.number().min(0.01).max(999999).multipleOf(0.01)
const schema=z.object({id:z.string().uuid(),title:z.string().trim().min(2).max(300),brand:z.string().trim().max(120).nullable(),price,compareAtPrice:price.nullable(),hidden:z.boolean(),updatedAt:z.string().min(1).max(60),variants:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(200),price,compareAtPrice:price.nullable()})).max(200)})
export async function PATCH(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Невалиден произход.'},{status:403})
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Провери името и цените.'},{status:400})
 const p=parsed.data
 if((p.compareAtPrice!==null&&p.compareAtPrice<=p.price)||p.variants.some(v=>v.compareAtPrice!==null&&v.compareAtPrice<=v.price))return NextResponse.json({error:'Старата цена трябва да е по-висока от текущата, или да е празна.'},{status:400})
 try{
 const saved=await sql.begin(async tx=>{
  const [current]=await tx<{updated_at:string;slug:string}[]>`select updated_at::text,slug from store.products where id=${p.id} for update`
  if(!current)throw new Error('NOT_FOUND')
  if(current.updated_at!==p.updatedAt)throw new Error('CONFLICT')
  const ids=await tx<{id:string}[]>`select id from store.variants where product_id=${p.id} for update`
  if(ids.length!==p.variants.length||new Set(p.variants.map(v=>v.id)).size!==ids.length||ids.some(v=>!p.variants.some(input=>input.id===v.id)))throw new Error('CONFLICT')
  const [row]=await tx<{updatedAt:string}[]>`update store.products set title=${p.title},brand=${p.brand||null},price=${p.price},compare_at_price=${p.compareAtPrice},is_hidden=${p.hidden},updated_at=now() where id=${p.id} returning updated_at::text as "updatedAt"`
  for(const v of p.variants)await tx`update store.variants set name=${v.name},price=${v.price},compare_at_price=${v.compareAtPrice} where id=${v.id} and product_id=${p.id}`
  return {updatedAt:row.updatedAt,slug:current.slug}
 })
 revalidatePath('/', 'layout')
 return NextResponse.json(saved)
 }catch(error){const message=error instanceof Error?error.message:'';if(message==='CONFLICT')return NextResponse.json({error:'Продуктът е променен от друг прозорец. Презареди страницата, преди да редактираш.'},{status:409});if(message==='NOT_FOUND')return NextResponse.json({error:'Продуктът не е намерен.'},{status:404});console.error('Product update failed');return NextResponse.json({error:'Промяната не беше записана.'},{status:500})}
}
