import { unstable_cache } from 'next/cache'
import { sql } from '@/lib/db'
import { CommerceSettingsSchema,type CommerceSettings } from '@/lib/commerce-settings-schema'

export async function readCommerceSettings():Promise<CommerceSettings>{
 const [row]=await sql<CommerceSettings[]>`select google_analytics_id as "googleAnalyticsId",google_tag_manager_id as "googleTagManagerId",meta_pixel_id as "metaPixelId",
 free_shipping_threshold::float8 as "freeShippingThreshold",econt_enabled as "econtEnabled",econt_address_enabled as "econtAddressEnabled",econt_office_price::float8 as "econtOfficePrice",econt_address_price::float8 as "econtAddressPrice",
 boxnow_enabled as "boxnowEnabled",boxnow_price::float8 as "boxnowPrice",speedy_enabled as "speedyEnabled",speedy_address_enabled as "speedyAddressEnabled",speedy_office_price::float8 as "speedyOfficePrice",speedy_address_price::float8 as "speedyAddressPrice",delivery_estimate as "deliveryEstimate",dispatch_hours as "dispatchHours"
 from store.commerce_settings where singleton`
 if(!row)throw new Error('Commerce settings are missing')
 return CommerceSettingsSchema.parse(row)
}
const cached=unstable_cache(readCommerceSettings,['commerce-settings'],{tags:['commerce-settings']})
export function getCommerceSettings(){return cached()}
