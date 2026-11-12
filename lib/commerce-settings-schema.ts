import { z } from 'zod'

const optionalId=(pattern:RegExp)=>z.string().trim().max(40).nullable().transform(value=>value||null).pipe(z.string().regex(pattern).nullable())
export const CommerceSettingsSchema=z.object({
 googleAnalyticsId:optionalId(/^G-[A-Z0-9]+$/),googleTagManagerId:optionalId(/^GTM-[A-Z0-9]+$/),metaPixelId:optionalId(/^\d{5,25}$/),
 freeShippingThreshold:z.number().min(0).max(10000),econtEnabled:z.boolean(),econtAddressEnabled:z.boolean().default(true),econtOfficePrice:z.number().min(0).max(100),econtAddressPrice:z.number().min(0).max(100),
 boxnowEnabled:z.boolean().default(false),boxnowPrice:z.number().min(0).max(100).default(2.49),speedyEnabled:z.boolean(),speedyAddressEnabled:z.boolean().default(true),speedyOfficePrice:z.number().min(0).max(100),speedyAddressPrice:z.number().min(0).max(100),deliveryEstimate:z.string().trim().min(2).max(80),dispatchHours:z.number().int().min(1).max(168),
}).refine(value=>value.econtEnabled||value.speedyEnabled||value.boxnowEnabled,{message:'Поне един куриер трябва да е активен.'})
export type CommerceSettings=z.infer<typeof CommerceSettingsSchema>

export function courierPrice(settings:CommerceSettings,courier:'econt'|'speedy'|'boxnow',deliveryType:'office'|'automat'|'address'){
 if(courier==='boxnow')return settings.boxnowPrice
 if(courier==='econt')return deliveryType==='address'?settings.econtAddressPrice:settings.econtOfficePrice
 return deliveryType==='address'?settings.speedyAddressPrice:settings.speedyOfficePrice
}
