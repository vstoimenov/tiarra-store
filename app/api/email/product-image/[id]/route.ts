import sharp from 'sharp'
import { sql } from '@/lib/db'
import { imageUrl } from '@/lib/images'

export const runtime='nodejs'

/** Email clients need an absolute JPEG URL; only catalog images from known origins are fetched. */
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return new Response(null,{status:404})
  const [row]=await sql<{path:string}[]>`select path from store.product_images where product_id=${id}::uuid order by position,id limit 1`
  if(!row)return new Response(null,{status:404})
  try{
    const source=new URL(imageUrl(row.path,400),'https://tiarracosmetics.com')
    const storage=process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : ''
    if(source.protocol!=='https:'||![storage,'content.app-sources.com','tiarracosmetics.com'].includes(source.hostname))return new Response(null,{status:404})
    const response=await fetch(source,{redirect:'error',signal:AbortSignal.timeout(8000)})
    if(!response.ok||Number(response.headers.get('content-length')||0)>8_000_000)return new Response(null,{status:404})
    const bytes=await response.arrayBuffer()
    if(bytes.byteLength>8_000_000)return new Response(null,{status:404})
    const jpeg=await sharp(Buffer.from(bytes),{limitInputPixels:40000000}).rotate().resize(160,160,{fit:'contain',background:'#ffffff',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:82}).toBuffer()
    return new Response(new Uint8Array(jpeg),{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=3600, s-maxage=86400','X-Content-Type-Options':'nosniff'}})
  }catch{return new Response(null,{status:404})}
}
