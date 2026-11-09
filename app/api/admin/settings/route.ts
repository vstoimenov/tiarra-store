import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { readCommerceSettings } from '@/lib/commerce-settings'
import { CommerceSettingsSchema } from '@/lib/commerce-settings-schema'
import { sql } from '@/lib/db'
export async function PUT(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Невалиден произход.'},{status:403})
 const parsed=CommerceSettingsSchema.safeParse(await request.json().catch(()=>null))
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Провери въведените настройки.'},{status:400})
 const p=parsed.data
 await sql`update store.commerce_settings set google_analytics_id=${p.googleAnalyticsId},google_tag_manager_id=${p.googleTagManagerId},meta_pixel_id=${p.metaPixelId},
 free_shipping_threshold=${p.freeShippingThreshold},econt_enabled=${p.econtEnabled},econt_office_price=${p.econtOfficePrice},econt_address_price=${p.econtAddressPrice},
 box_now_price=${p.boxNowPrice},speedy_enabled=${p.speedyEnabled},speedy_office_price=${p.speedyOfficePrice},speedy_address_price=${p.speedyAddressPrice},delivery_estimate=${p.deliveryEstimate},dispatch_hours=${p.dispatchHours},updated_at=now() where singleton`
 revalidateTag('commerce-settings')
 return NextResponse.json({settings:await readCommerceSettings()},{headers:{'Cache-Control':'no-store'}})
}
