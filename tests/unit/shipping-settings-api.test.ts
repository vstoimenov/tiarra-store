import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({query:vi.fn(),begin:vi.fn(),read:vi.fn(),available:vi.fn(),tag:vi.fn(),path:vi.fn()}))
vi.mock('@/lib/db',()=>({sql:Object.assign(mocks.query,{begin:mocks.begin})}))
vi.mock('@/lib/commerce-settings',()=>({readCommerceSettings:mocks.read,freeShippingSettingsAvailable:mocks.available}))
vi.mock('next/cache',()=>({revalidateTag:mocks.tag,revalidatePath:mocks.path}))
import {PUT} from '@/app/api/admin/settings/route'
import {CommerceSettingsSchema} from '@/lib/commerce-settings-schema'
const settings=CommerceSettingsSchema.parse({googleAnalyticsId:null,googleTagManagerId:null,metaPixelId:null,freeShippingThreshold:39,econtEnabled:true,econtOfficePrice:4.5,econtAddressPrice:6.5,speedyEnabled:true,speedyOfficePrice:3.5,speedyAddressPrice:5.5,boxnowEnabled:true,boxnowPrice:2.49,deliveryEstimate:'1–2 работни дни',dispatchHours:24,econtFreeShipping:false,speedyFreeShipping:true,boxnowFreeShipping:true})
const request=(body:unknown,origin='https://shop.test')=>new Request('https://shop.test/api/admin/settings',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
beforeEach(()=>{vi.clearAllMocks();mocks.query.mockResolvedValue([]);mocks.begin.mockImplementation(callback=>callback(mocks.query));mocks.available.mockResolvedValue(true);mocks.read.mockResolvedValue(settings)})
it('persists courier eligibility in the same transaction as all shipping prices and clears storefront caches',async()=>{
 const response=await PUT(request(settings));expect(response.status).toBe(200)
 expect(mocks.begin).toHaveBeenCalledOnce();expect(mocks.query.mock.calls[1][0].join('')).toContain('econt_free_shipping=case')
 expect(mocks.query.mock.calls[1][2]).toBe(false);expect(mocks.tag).toHaveBeenCalledWith('commerce-settings');expect(mocks.path).toHaveBeenCalledWith('/','layout')
})
it('does not partially save any settings if the migration is absent',async()=>{
 mocks.available.mockResolvedValue(false);expect((await PUT(request(settings))).status).toBe(503);expect(mocks.query).not.toHaveBeenCalled();expect(mocks.begin).not.toHaveBeenCalled()
})
it('rejects invalid configuration and foreign origin before writing',async()=>{
 expect((await PUT(request(settings,'https://other.test'))).status).toBe(403)
 expect((await PUT(request({...settings,econtFreeShipping:'no'}))).status).toBe(400)
 expect(mocks.query).not.toHaveBeenCalled()
})
it('keeps stored eligibility when an older client omits the new fields',async()=>{
 const old={...settings} as Record<string,unknown>;delete old.econtFreeShipping;delete old.speedyFreeShipping;delete old.boxnowFreeShipping
 expect((await PUT(request(old))).status).toBe(200)
 expect(mocks.query.mock.calls[1][1]).toBe(false) // CASE condition: preserve the saved database value.
})
