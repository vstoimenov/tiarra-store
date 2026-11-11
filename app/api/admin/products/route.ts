import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import sanitizeHtml from 'sanitize-html'
import { sql } from '@/lib/db'
const price=z.number().min(0.01).max(999999).multipleOf(0.01)
const image=z.object({id:z.string().uuid().optional(),path:z.string().min(1).max(600),alt:z.string().max(300),width:z.number().int().positive().max(10000),height:z.number().int().positive().max(10000)})
const variant=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(200),price,compareAtPrice:price.nullable()})
const perfume=z.object({top:z.string().trim().max(500).optional(),heart:z.string().trim().max(500).optional(),base:z.string().trim().max(500).optional(),aroma:z.string().trim().max(500).optional(),volume:z.string().trim().max(100).optional()}).nullable().optional()
const base=z.object({perfume,title:z.string().trim().min(2).max(300),brand:z.string().trim().max(120).nullable(),gender:z.enum(['female','male','unisex']),price,compareAtPrice:price.nullable(),stock:z.number().int().min(0).max(99999).nullable(),descriptionHtml:z.string().max(20000),hidden:z.boolean(),categoryIds:z.array(z.string().uuid()).max(20),images:z.array(image).max(12)})
const patch=base.extend({id:z.string().uuid(),updatedAt:z.string().min(1).max(60),variants:z.array(variant).max(200)})
function validImagePath(path:string){if(path.startsWith('admin/'))return /^admin\/[a-f0-9-]+$/.test(path);try{const url=new URL(path);return url.protocol==='https:'}catch{return false}}
function valid(data:z.infer<typeof base>){return (!data.compareAtPrice||data.compareAtPrice>data.price)&&data.images.every(i=>i.id!==undefined||validImagePath(i.path))&&(!data.hidden?data.images.length>0&&data.categoryIds.length>0:true)&&new Set(data.categoryIds).size===data.categoryIds.length}
function clean(html:string){return sanitizeHtml(html,{allowedTags:['p','br','strong','em','ul','ol','li','h2','h3'],allowedAttributes:{}})}
function origin(request:Request){return request.headers.get('origin')===new URL(request.url).origin}
export async function POST(request:Request){
 if(!origin(request))return NextResponse.json({error:'Невалиден произход.'},{status:403})
 const p=base.safeParse(await request.json().catch(()=>null));if(!p.success||!valid(p.data))return NextResponse.json({error:'Провери данните. Видимият продукт трябва да има снимка и поне една категория.'},{status:400})
 const data=p.data,slug=data.title.toLocaleLowerCase('bg').normalize('NFC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,85)+'-'+crypto.randomUUID().slice(0,8)
 try{const created=await sql.begin(async tx=>{const [row]=await tx<{id:string;slug:string}[]>`select id,slug from store.admin_save_product(${tx.json({...data,slug,descriptionHtml:clean(data.descriptionHtml)})})`;if(data.perfume !== undefined){const [check]=await tx<{matches:boolean}[]>`select perfume is not distinct from ${tx.json(data.perfume)}::jsonb as matches from store.products where id=${row.id}`;if(!check?.matches)throw new Error('PERFUME_NOT_SAVED')}return row});revalidatePath('/', 'layout');return NextResponse.json(created,{status:201})}catch(e){console.error('Product creation failed',e);return NextResponse.json({error:e instanceof Error && e.message==='PERFUME_NOT_SAVED'?'Нотките не бяха записани. Необходима е актуализация на базата; промените са запазени във формата.':'Продуктът не беше създаден.'},{status:500})}
}
export async function PATCH(request:Request){
 if(!origin(request))return NextResponse.json({error:'Невалиден произход.'},{status:403})
 const parsed=patch.safeParse(await request.json().catch(()=>null));if(!parsed.success||!valid(parsed.data))return NextResponse.json({error:'Провери данните. Видимият продукт трябва да има снимка и поне една категория.'},{status:400})
 const p=parsed.data
 if(p.variants.some(v=>v.compareAtPrice!==null&&v.compareAtPrice<=v.price))return NextResponse.json({error:'Старата цена трябва да е по-висока от текущата.'},{status:400})
 try{const saved=await sql.begin(async tx=>{
  const [current]=await tx<{updated_at:string;slug:string}[]>`select updated_at::text,slug from store.products where id=${p.id} for update`
  if(!current)throw new Error('NOT_FOUND');if(current.updated_at!==p.updatedAt)throw new Error('CONFLICT')
  const variants=await tx<{id:string}[]>`select id from store.variants where product_id=${p.id} for update`
  if(variants.length!==p.variants.length||new Set(p.variants.map(v=>v.id)).size!==variants.length||variants.some(v=>!p.variants.some(i=>i.id===v.id)))throw new Error('CONFLICT')
  const [row]=await tx<{updatedAt:string;slug:string}[]>`select updated_at::text as "updatedAt",slug from store.admin_save_product(${tx.json({...p,descriptionHtml:clean(p.descriptionHtml)})})`
  if(p.perfume !== undefined){const [check]=await tx<{matches:boolean}[]>`select perfume is not distinct from ${tx.json(p.perfume)}::jsonb as matches from store.products where id=${p.id}`;if(!check?.matches)throw new Error('PERFUME_NOT_SAVED')}
  for(const v of p.variants)await tx`update store.variants set name=${v.name},price=${v.price},compare_at_price=${v.compareAtPrice} where id=${v.id} and product_id=${p.id}`
  return {updatedAt:row.updatedAt,slug:current.slug}
 });revalidatePath('/', 'layout');return NextResponse.json(saved)}catch(e){const message=e instanceof Error?e.message:'';if(message==='CONFLICT')return NextResponse.json({error:'Продуктът е променен от друг прозорец. Презареди страницата.'},{status:409});if(message==='PERFUME_NOT_SAVED')return NextResponse.json({error:'Нотките не бяха записани. Необходима е актуализация на базата; промените са запазени във формата.'},{status:500});if(message==='NOT_FOUND')return NextResponse.json({error:'Продуктът не е намерен.'},{status:404});console.error('Product update failed',e);return NextResponse.json({error:'Промяната не беше записана.'},{status:500})}
}
