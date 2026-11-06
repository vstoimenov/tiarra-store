import { z } from 'zod'

const optionalId=(pattern:RegExp)=>z.string().trim().max(40).nullable().transform(value=>value||null).pipe(z.string().regex(pattern).nullable())
export const CommerceSettingsSchema=z.object({
 googleAnalyticsId:optionalId(/^G-[A-Z0-9]+$/),googleTagManagerId:optionalId(/^GTM-[A-Z0-9]+$/),metaPixelId:optionalId(/^\d{5,25}$/),
 freeShippingThreshold:z.number().min(0).max(10000),econtEnabled:z.boolean(),econtOfficePrice:z.number().min(0).max(100),econtAddressPrice:z.number().min(0).max(100),
 speedyEnabled:z.boolean(),speedyOfficePrice:z.number().min(0).max(100),speedyAddressPrice:z.number().min(0).max(100),deliveryEstimate:z.string().trim().min(2).max(80),dispatchHours:z.number().int().min(1).max(168),
}).refine(value=>value.econtEnabled||value.speedyEnabled,{message:'Поне един куриер трябва да е активен.'})
export type CommerceSettings=z.infer<typeof CommerceSettingsSchema>

export function courierPrice(settings:CommerceSettings,courier:'econt'|'speedy',deliveryType:'office'|'automat'|'address'){
 if(courier==='econt')return deliveryType==='address'?settings.econtAddressPrice:settings.econtOfficePrice
 return deliveryType==='address'?settings.speedyAddressPrice:settings.speedyOfficePrice
}
