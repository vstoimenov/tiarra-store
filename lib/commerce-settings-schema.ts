import { z } from 'zod'

const optionalId=(pattern:RegExp)=>z.string().trim().max(40).nullable().transform(value=>value||null).pipe(z.string().regex(pattern).nullable())
export const CommerceSettingsSchema=z.object({
 googleAnalyticsId:optionalId(/^G-[A-Z0-9]+$/),googleTagManagerId:optionalId(/^GTM-[A-Z0-9]+$/),metaPixelId:optionalId(/^\d{5,25}$/),
 econtFreeShipping:z.boolean().default(true),speedyFreeShipping:z.boolean().default(true),boxnowFreeShipping:z.boolean().default(true),
 freeShippingThreshold:z.number().min(0).max(10000),econtEnabled:z.boolean(),econtAddressEnabled:z.boolean().default(true),econtOfficePrice:z.number().min(0).max(100),econtAddressPrice:z.number().min(0).max(100),
 boxnowEnabled:z.boolean().default(false),boxnowPrice:z.number().min(0).max(100).default(2.49),speedyEnabled:z.boolean(),speedyAddressEnabled:z.boolean().default(true),speedyOfficePrice:z.number().min(0).max(100),speedyAddressPrice:z.number().min(0).max(100),deliveryEstimate:z.string().trim().min(2).max(80),dispatchHours:z.number().int().min(1).max(168),
}).refine(value=>value.econtEnabled||value.speedyEnabled||value.boxnowEnabled,{message:'Поне един куриер трябва да е активен.'})
export type CommerceSettings=z.infer<typeof CommerceSettingsSchema>

export function courierPrice(settings:CommerceSettings,courier:'econt'|'speedy'|'boxnow',deliveryType:'office'|'automat'|'address'){
 if(courier==='boxnow')return settings.boxnowPrice
 if(courier==='econt')return deliveryType==='address'?settings.econtAddressPrice:settings.econtOfficePrice
 return deliveryType==='address'?settings.speedyAddressPrice:settings.speedyOfficePrice
}

export type Courier='econt'|'speedy'|'boxnow'
export const courierNames:Record<Courier,string>={econt:'Еконт',speedy:'Спиди',boxnow:'BOX NOW'}
export function hasFreeShipping(settings:CommerceSettings,courier:Courier,subtotal:number){
 return settings[`${courier}Enabled`]&&settings[`${courier}FreeShipping`]!==false&&Math.round(subtotal*100)>=Math.round(settings.freeShippingThreshold*100)
}
export function deliveryPrice(settings:CommerceSettings,courier:Courier,deliveryType:'office'|'automat'|'address',subtotal:number){
 return hasFreeShipping(settings,courier,subtotal)?0:courierPrice(settings,courier,deliveryType)
}
export function freeShippingCouriers(settings:CommerceSettings):string[]{
 return (['econt','speedy','boxnow'] as const).filter(courier=>settings[`${courier}Enabled`]&&settings[`${courier}FreeShipping`]!==false).map(courier=>courierNames[courier])
}
export function freeShippingText(settings:CommerceSettings):string{
 const names=freeShippingCouriers(settings)
 if(!names.length)return 'Цената за доставка се изчислява според избрания куриер.'
 const threshold=settings.freeShippingThreshold?` над ${settings.freeShippingThreshold.toLocaleString('bg-BG')} €`:''
 return `Безплатна доставка${threshold} с ${names.join(' и ')}.`
}
export function courierPrices(settings:CommerceSettings,subtotal:number){
 return {econt_office:deliveryPrice(settings,'econt','office',subtotal),econt_address:deliveryPrice(settings,'econt','address',subtotal),speedy_office:deliveryPrice(settings,'speedy','office',subtotal),speedy_address:deliveryPrice(settings,'speedy','address',subtotal),boxnow_locker:deliveryPrice(settings,'boxnow','automat',subtotal)}
}
