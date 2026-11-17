import {beforeEach,describe,expect,it,vi} from 'vitest'
import {CommerceSettingsSchema,courierPrices,deliveryPrice,freeShippingCouriers,freeShippingText} from '@/lib/commerce-settings-schema'
const settings=CommerceSettingsSchema.parse({googleAnalyticsId:null,googleTagManagerId:null,metaPixelId:null,freeShippingThreshold:39,econtEnabled:true,econtOfficePrice:4.5,econtAddressPrice:6.5,speedyEnabled:true,speedyOfficePrice:3.5,speedyAddressPrice:5.5,boxnowEnabled:true,boxnowPrice:2.49,deliveryEstimate:'1–2 работни дни',dispatchHours:24,econtFreeShipping:false,speedyFreeShipping:true,boxnowFreeShipping:true})
const mocks=vi.hoisted(()=>({query:Object.assign(vi.fn(),{json:(value:unknown)=>value}),read:vi.fn()}))
vi.mock('@/lib/db',()=>({sql:mocks.query}))
vi.mock('@/lib/commerce-settings',()=>({readCommerceSettings:mocks.read}))
vi.mock('@/lib/rate-limit',()=>({checkoutRateLimit:async()=>true}))
import {POST} from '@/app/api/orders/quote/route'
const productId='11111111-1111-4111-8111-111111111111'
beforeEach(()=>{vi.clearAllMocks();mocks.query.mockReset();mocks.read.mockResolvedValue(settings)})
describe('free shipping per courier',()=>{
 it('charges Econt above the threshold and only makes Speedy and BOX NOW free',()=>{
  expect(courierPrices(settings,100)).toEqual({econt_office:4.5,econt_address:6.5,speedy_office:0,speedy_address:0,boxnow_locker:0})
  expect(freeShippingCouriers(settings)).toEqual(['Спиди','BOX NOW'])
  expect(freeShippingText(settings)).toBe('Безплатна доставка над 39 € с Спиди и BOX NOW.')
 })
 it('keeps paid tariffs below the threshold and respects the exact cent boundary',()=>{
  expect(courierPrices(settings,38.99)).toEqual({econt_office:4.5,econt_address:6.5,speedy_office:3.5,speedy_address:5.5,boxnow_locker:2.49})
  expect(deliveryPrice(settings,'speedy','office',38.999999999)).toBe(0)
 })
 it('allows every courier independently and never makes Econt free when the threshold is zero',()=>{
  expect(deliveryPrice({...settings,freeShippingThreshold:0},'econt','address',10)).toBe(6.5)
  expect(deliveryPrice({...settings,econtFreeShipping:true},'econt','office',100)).toBe(0)
  expect(deliveryPrice({...settings,speedyFreeShipping:false},'speedy','address',100)).toBe(5.5)
  expect(deliveryPrice({...settings,boxnowFreeShipping:false},'boxnow','automat',100)).toBe(2.49)
 })
 it('hides disabled couriers from promotional copy and supports turning free delivery off entirely',()=>{
  expect(freeShippingCouriers({...settings,speedyEnabled:false})).toEqual(['BOX NOW'])
  expect(freeShippingText({...settings,speedyFreeShipping:false,boxnowFreeShipping:false})).not.toContain('Безплатна')
 })
 it.each([['econt','office',4.5],['econt','address',6.5],['speedy','office',0],['boxnow','automat',0]])('quotes %s %s consistently with the courier cards',async(courier,deliveryType,shipping)=>{
  mocks.query.mockResolvedValue([{product_id:productId,variant_id:null,quantity:1,unit_price:50,stock:null}])
  const request=new Request('https://shop.test/api/orders/quote',{method:'POST',body:JSON.stringify({courier,deliveryType,items:[{productId,variantId:null,quantity:1}],promoCode:''})})
  const response=await POST(request)
  expect(response.status).toBe(200);expect(await response.json()).toMatchObject({subtotal:50,shipping,total:50+Number(shipping)})
 })
})
