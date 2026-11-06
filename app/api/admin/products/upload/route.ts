import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
export const runtime='nodejs'
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Невалиден произход.'},{status:403})
 const key=process.env.SUPABASE_SECRET_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!key||!url)return NextResponse.json({error:'Качването на снимки още не е настроено. Добави SUPABASE_SECRET_KEY в настройките на Vercel.'},{status:503})
 const form=await request.formData().catch(()=>null),file=form?.get('image')
 if(!(file instanceof File)||file.size<1||file.size>6*1024*1024||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))return NextResponse.json({error:'Избери JPG, PNG, WebP или AVIF до 6 MB.'},{status:400})
 try{
  const buffer=Buffer.from(await file.arrayBuffer());const image=sharp(buffer,{limitInputPixels:40000000});const meta=await image.metadata()
  if(!meta.width||!meta.height)return NextResponse.json({error:'Изображението е невалидно.'},{status:400})
  const path='admin/'+crypto.randomUUID(),bucket=createClient(url,key,{auth:{persistSession:false}}).storage.from('products')
  for(const width of [400,800,1200]){const resized=await sharp(buffer).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toBuffer();const {error}=await bucket.upload(`${path}-${width}.webp`,resized,{contentType:'image/webp',cacheControl:'31536000',upsert:false});if(error)throw error}
  const swap=[5,6,7,8].includes(meta.orientation??0),originalWidth=swap?meta.height:meta.width,originalHeight=swap?meta.width:meta.height
  const width=Math.min(1200,originalWidth),height=Math.round(originalHeight*width/originalWidth)
  return NextResponse.json({path,width,height,alt:file.name.replace(/\.[^.]+$/,'')})
 }catch(error){console.error('Admin image upload failed',error);return NextResponse.json({error:'Снимката не беше качена. Опитай отново.'},{status:500})}
}

export async function DELETE(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Невалиден произход.'},{status:403})
 const key=process.env.SUPABASE_SECRET_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!key||!url)return NextResponse.json({error:'Качването на снимки още не е настроено.'},{status:503})
 const data=await request.json().catch(()=>null),path=typeof data?.path==='string'?data.path:''
 if(!/^admin\/[a-f0-9-]{36}$/.test(path))return NextResponse.json({error:'Невалидна снимка.'},{status:400})
 const {error}=await createClient(url,key,{auth:{persistSession:false}}).storage.from('products').remove([400,800,1200].map(width=>`${path}-${width}.webp`))
 if(error){console.error('Admin image cleanup failed',error);return NextResponse.json({error:'Снимката не беше премахната.'},{status:500})}
 return new NextResponse(null,{status:204})
}
