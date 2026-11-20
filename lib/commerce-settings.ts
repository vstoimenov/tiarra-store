import { unstable_cache } from 'next/cache'
import { sql } from '@/lib/db'
import { resolveGoogleTagManagerId } from '@/lib/google-tags'
import { CommerceSettingsSchema,type CommerceSettings } from '@/lib/commerce-settings-schema'

export async function readCommerceSettings():Promise<CommerceSettings>{
 const [row]=await sql<CommerceSettings[]>`select coalesce((to_jsonb(s)->>'econt_free_shipping')::boolean,true) as "econtFreeShipping",coalesce((to_jsonb(s)->>'speedy_free_shipping')::boolean,true) as "speedyFreeShipping",coalesce((to_jsonb(s)->>'boxnow_free_shipping')::boolean,true) as "boxnowFreeShipping",google_analytics_id as "googleAnalyticsId",google_tag_manager_id as "googleTagManagerId",meta_pixel_id as "metaPixelId",
 free_shipping_threshold::float8 as "freeShippingThreshold",econt_enabled as "econtEnabled",econt_address_enabled as "econtAddressEnabled",econt_office_price::float8 as "econtOfficePrice",econt_address_price::float8 as "econtAddressPrice",
 boxnow_enabled as "boxnowEnabled",boxnow_price::float8 as "boxnowPrice",speedy_enabled as "speedyEnabled",speedy_address_enabled as "speedyAddressEnabled",speedy_office_price::float8 as "speedyOfficePrice",speedy_address_price::float8 as "speedyAddressPrice",delivery_estimate as "deliveryEstimate",dispatch_hours as "dispatchHours"
 from store.commerce_settings s where singleton`
 if(!row)throw new Error('Commerce settings are missing')
 const settings=CommerceSettingsSchema.parse(row)
 return {...settings,googleTagManagerId:resolveGoogleTagManagerId(settings.googleTagManagerId,process.env.NEXT_PUBLIC_GTM_ID)}
}
const cached=unstable_cache(readCommerceSettings,['commerce-settings-v3'],{tags:['commerce-settings'],revalidate:60})
export function getCommerceSettings(){return cached()}

export async function freeShippingSettingsAvailable():Promise<boolean>{
 const [row]=await sql<{available:boolean}[]>`select to_jsonb(s) ?& array['econt_free_shipping','speedy_free_shipping','boxnow_free_shipping'] as available from store.commerce_settings s where singleton`
 return row?.available??false
}
