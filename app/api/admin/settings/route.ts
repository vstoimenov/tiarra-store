import { revalidateTag, revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { readCommerceSettings, freeShippingSettingsAvailable } from '@/lib/commerce-settings'
import { CommerceSettingsSchema } from '@/lib/commerce-settings-schema'
import { sql } from '@/lib/db'
export async function PUT(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Невалиден произход.'},{status:403})
 const body=await request.json().catch(()=>null)
 const parsed=CommerceSettingsSchema.safeParse(body)
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Провери въведените настройки.'},{status:400})
 const p=parsed.data
 const configurable=await freeShippingSettingsAvailable()
 if(!configurable&&(!p.econtFreeShipping||!p.speedyFreeShipping||!p.boxnowFreeShipping))return NextResponse.json({error:'Изпълни SQL файла за избор на куриери с безплатна доставка. Промените не са записани.'},{status:503})
 await sql.begin(async tx=>{
 await tx`update store.commerce_settings set google_analytics_id=${p.googleAnalyticsId},google_tag_manager_id=${p.googleTagManagerId},meta_pixel_id=${p.metaPixelId},
 free_shipping_threshold=${p.freeShippingThreshold},econt_enabled=${p.econtEnabled},econt_address_enabled=${p.econtAddressEnabled},econt_office_price=${p.econtOfficePrice},econt_address_price=${p.econtAddressPrice},
 boxnow_enabled=${p.boxnowEnabled},boxnow_price=${p.boxnowPrice},speedy_enabled=${p.speedyEnabled},speedy_address_enabled=${p.speedyAddressEnabled},speedy_office_price=${p.speedyOfficePrice},speedy_address_price=${p.speedyAddressPrice},delivery_estimate=${p.deliveryEstimate},dispatch_hours=${p.dispatchHours},updated_at=now() where singleton`
 if(configurable)await tx`update store.commerce_settings set econt_free_shipping=case when ${Object.hasOwn(body,'econtFreeShipping')} then ${p.econtFreeShipping} else econt_free_shipping end,speedy_free_shipping=case when ${Object.hasOwn(body,'speedyFreeShipping')} then ${p.speedyFreeShipping} else speedy_free_shipping end,boxnow_free_shipping=case when ${Object.hasOwn(body,'boxnowFreeShipping')} then ${p.boxnowFreeShipping} else boxnow_free_shipping end where singleton`
 })
 revalidateTag('commerce-settings');revalidatePath('/', 'layout')
 return NextResponse.json({settings:await readCommerceSettings()},{headers:{'Cache-Control':'no-store'}})
}
