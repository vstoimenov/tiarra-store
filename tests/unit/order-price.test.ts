import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({query:vi.fn(),begin:vi.fn(),sync:vi.fn(),emails:vi.fn(),push:vi.fn(),metaQueue:vi.fn(),metaSend:vi.fn(),after:vi.fn(),offices:vi.fn()}))
vi.mock('next/server',async importOriginal=>({...await importOriginal<typeof import('next/server')>(),after:mocks.after}))
vi.mock('@/lib/db',()=>({sql:Object.assign(mocks.query,{json:(v:unknown)=>v,begin:mocks.begin})}))
vi.mock('@/lib/rate-limit',()=>({checkoutRateLimit:async()=>true}))
vi.mock('@/lib/ordyx-sync',()=>({syncOrder:mocks.sync}))
vi.mock('@/lib/order-email-queue',()=>({sendOrderEmails:mocks.emails}))
vi.mock('@/lib/meta-conversions',()=>({queueMetaPurchase:mocks.metaQueue,sendMetaPurchase:mocks.metaSend}))
vi.mock('@/lib/admin/push',()=>({sendAdminOrderPush:mocks.push}))
vi.mock('@/lib/ordyx-offices',()=>({getCourierOffices:mocks.offices}))
import { POST } from '@/app/api/orders/route'
const body={requestId:'11111111-1111-4111-8111-111111111111',expectedTotal:20,customerName:'Test Customer',phone:'0888123456',email:'customer@example.com',courier:'econt',officeId:null,deliveryType:'address',city:'Sofia',postCode:'1000',deliveryAddress:'Test street 1',notes:'',promoCode:'',items:[{productId:'22222222-2222-4222-8222-222222222222',variantId:null,quantity:1}]}
const request=(data:unknown=body)=>new Request('https://shop.test/api/orders',{method:'POST',body:JSON.stringify(data)})
beforeEach(()=>{vi.clearAllMocks();mocks.metaQueue.mockResolvedValue(false);mocks.begin.mockImplementation(async callback=>callback(mocks.query))})
it('rejects a changed total inside the transaction before courier synchronization',async()=>{mocks.query.mockResolvedValue([{order_number:'1',total:25,is_new:true}]);const result=await POST(request());expect(result.status).toBe(409);expect((await result.json()).code).toBe('PRICE_CHANGED');expect(mocks.sync).not.toHaveBeenCalled();await expect(mocks.begin.mock.results[0].value).rejects.toThrow('PRICE_CHANGED')})
it('returns the existing order for an idempotent retry even if the quote changed',async()=>{mocks.query.mockResolvedValue([{order_number:'1',total:25,is_new:false}]);const result=await POST(request());expect(result.status).toBe(200);expect((await result.json()).total).toBe(25)})
it('returns a saved order before sending emails or synchronizing the courier',async()=>{mocks.query.mockResolvedValue([{order_number:'7',total:20,is_new:true}]);mocks.sync.mockResolvedValue(true);mocks.emails.mockResolvedValue(undefined);mocks.push.mockResolvedValue({attempted:1,sent:1});const result=await POST(request());expect(result.status).toBe(201);expect(mocks.sync).not.toHaveBeenCalled();expect(mocks.emails).not.toHaveBeenCalled();expect(mocks.after).toHaveBeenCalledOnce();await mocks.after.mock.calls[0][0]();expect(mocks.sync).toHaveBeenCalledWith('7');expect(mocks.emails).toHaveBeenCalledWith('7');expect(mocks.push).toHaveBeenCalledWith('7')})

it.each([{email:''},{email:'invalid'},{customerName:' '},{phone:''}])('rejects missing or invalid contact details: %o',async changes=>{const result=await POST(request({...body,...changes}));expect(result.status).toBe(400);expect(mocks.begin).not.toHaveBeenCalled()})

it('rejects a BOX NOW locker that Ordyx does not recognize',async()=>{mocks.offices.mockResolvedValue([]);const result=await POST(request({...body,courier:'boxnow',deliveryType:'automat',officeId:'boxnow:invalid',deliveryAddress:'BOX NOW автомат'}));expect(result.status).toBe(400);expect(mocks.begin).not.toHaveBeenCalled()})

it('does not enqueue a second push for an idempotent checkout retry',async()=>{mocks.query.mockResolvedValue([{order_number:'8',total:20,is_new:false}]);mocks.emails.mockResolvedValue(undefined);await POST(request());await mocks.after.mock.calls[0][0]();expect(mocks.push).not.toHaveBeenCalled()})

it('keeps a committed purchase successful if the Meta queue fails',async()=>{
 mocks.query.mockResolvedValue([{order_number:'9',total:20,is_new:true}]);mocks.metaQueue.mockRejectedValue(new Error('tracking unavailable'));mocks.emails.mockResolvedValue(undefined)
 const log=vi.spyOn(console,'error').mockImplementation(()=>{})
 try{const result=await POST(request({...body,meta:{consent:true}}));expect(result.status).toBe(201);await expect(mocks.after.mock.calls[0][0]()).resolves.toBeUndefined();expect(mocks.metaQueue).toHaveBeenCalledWith('9',{consent:true},expect.any(Request));expect(mocks.metaSend).not.toHaveBeenCalled()}finally{log.mockRestore()}
})
it('does not enqueue a second Meta purchase on an idempotent retry',async()=>{
 mocks.query.mockResolvedValue([{order_number:'9',total:20,is_new:false}]);mocks.emails.mockResolvedValue(undefined)
 await POST(request({...body,meta:{consent:true}}));await mocks.after.mock.calls[0][0]();expect(mocks.metaQueue).not.toHaveBeenCalled()
})
