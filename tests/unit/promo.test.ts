import { expect,it } from 'vitest'
import { promoCodeSchema,promoAdminSchema,promoError } from '@/lib/promo'
it('normalizes a code and rejects malformed input',()=>{
 expect(promoCodeSchema.parse(' tiarra10 ')).toBe('TIARRA10');expect(promoCodeSchema.parse(undefined)).toBe('')
 expect(promoCodeSchema.safeParse('x'.repeat(33)).success).toBe(false);expect(promoCodeSchema.safeParse('<script>').success).toBe(false)
})
it('validates discount bounds and optional constraints',()=>{
 const data={code:'SAVE10',kind:'percent',value:10,minSubtotal:20,expiresAt:null,maxUses:1,active:true}
 expect(promoAdminSchema.safeParse(data).success).toBe(true)
 for(const patch of [{value:101},{value:0},{maxUses:0},{minSubtotal:-1},{expiresAt:'tomorrow'}])expect(promoAdminSchema.safeParse({...data,...patch}).success).toBe(false)
 expect(promoAdminSchema.safeParse({...data,kind:'fixed',value:150}).success).toBe(true)
})
it('exposes only known business errors',()=>{expect(promoError(new Error('PROMO_INVALID'))).toMatch(/невалиден/);expect(promoError(new Error('database secret'))).toBeNull()})
