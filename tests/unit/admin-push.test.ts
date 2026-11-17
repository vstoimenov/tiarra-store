import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createECDH } from 'node:crypto'
import { allowedPushEndpoint, pushSubscriptionSchema } from '@/lib/admin/push-schema'
import { newOrderNotices } from '@/lib/admin/new-orders'

const mocks=vi.hoisted(()=>({query:vi.fn(),tx:vi.fn(),begin:vi.fn(),send:vi.fn(),generate:vi.fn()}))
vi.mock('@/lib/db',()=>({sql:Object.assign(mocks.query,{begin:mocks.begin})}))
vi.mock('web-push',()=>({generateVAPIDKeys:mocks.generate,sendNotification:mocks.send}))
import { getPushKeys, sendPush, sendQueuedAdminPush } from '@/lib/admin/push'
import { GET, POST, DELETE } from '@/app/api/admin/notifications/push/route'
const ecdh=createECDH('prime256v1');ecdh.generateKeys()
const subscription={endpoint:'https://web.push.apple.com/QABC',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:Buffer.alloc(16,3).toString('base64url')}}
const keys={public_key:'public-key',private_key:'private-key-never-returned'}
const entry={id:'queue',subscription_id:'device',order_number:'42',order_status:'new',total:24.3,attempts:0,endpoint:subscription.endpoint,...subscription.keys}
function request(body:unknown,origin='https://shop.test'){return new Request('https://shop.test/api/admin/notifications/push',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})}
beforeEach(()=>{vi.clearAllMocks();mocks.query.mockReset();mocks.tx.mockReset();mocks.begin.mockImplementation(callback=>callback(mocks.tx));mocks.send.mockResolvedValue({statusCode:201})})
describe('push subscription validation',()=>{
 it('accepts real push endpoints and encryption keys',()=>{expect(pushSubscriptionSchema.safeParse(subscription).success).toBe(true);expect(allowedPushEndpoint('https://fcm.googleapis.com/fcm/send/device')).toBe(true);expect(allowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/device')).toBe(true)})
 it.each(['http://web.push.apple.com/a','https://127.0.0.1/a','https://web.push.apple.com.evil.test/a','https://evil.test/a','https://user:password@web.push.apple.com/a','https://web.push.apple.com:8443/a'])('rejects SSRF target %s',endpoint=>{expect(allowedPushEndpoint(endpoint)).toBe(false)})
 it('rejects malformed keys',()=>{expect(pushSubscriptionSchema.safeParse({...subscription,keys:{...subscription.keys,auth:'bad'}}).success).toBe(false)})
 it('does not send to an arbitrary destination even from internal callers',async()=>{await expect(sendPush({endpoint:'https://127.0.0.1/secret',...subscription.keys},{title:'test'},keys)).rejects.toThrow('INVALID_PUSH_ENDPOINT');expect(mocks.send).not.toHaveBeenCalled()})
})
describe('device configuration API',()=>{
 it('requires same-origin subscription mutations',async()=>{expect((await POST(request(subscription,'https://evil.test'))).status).toBe(403);expect((await DELETE(request(subscription,'https://evil.test'))).status).toBe(403);expect(mocks.query).not.toHaveBeenCalled()})
 it('reports activation missing without generating or returning keys',async()=>{mocks.query.mockResolvedValueOnce([{available:false}]);expect(await(await GET()).json()).toEqual({available:false});expect(mocks.generate).not.toHaveBeenCalled()})
 it('only exposes the public key',async()=>{mocks.query.mockResolvedValueOnce([{available:true}]).mockResolvedValueOnce([keys]);const response=await GET();expect(await response.json()).toEqual({available:true,publicKey:'public-key'});expect(response.headers.get('Cache-Control')).toBe('no-store')})
 it('registers or refreshes an existing device without creating duplicate subscriptions',async()=>{mocks.query.mockResolvedValueOnce([{available:true}]).mockResolvedValueOnce([keys]).mockResolvedValueOnce([]);expect((await POST(request(subscription))).status).toBe(200);expect(mocks.query.mock.calls[2][0].join('')).toContain('on conflict(endpoint) do update')})
 it('removes only the requested device',async()=>{mocks.query.mockResolvedValueOnce([{available:true}]).mockResolvedValueOnce([]);expect((await DELETE(request({endpoint:subscription.endpoint}))).status).toBe(200);expect(mocks.query.mock.calls[1][1]).toBe(subscription.endpoint)})
 it('generates keys on the server and keeps the winning immutable pair',async()=>{mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([keys]);mocks.generate.mockReturnValue({publicKey:'proposed-public',privateKey:'proposed-private'});expect(await getPushKeys()).toEqual(keys);expect(mocks.query.mock.calls[1][0].join('')).toContain('on conflict(singleton) do nothing')})
})
describe('queued push delivery',()=>{
 it('sends a private notification without customer details and marks it sent',async()=>{
  mocks.tx.mockResolvedValueOnce([entry]).mockResolvedValueOnce([keys]).mockResolvedValueOnce([])
  expect(await sendQueuedAdminPush('queue')).toBe(true)
  const payload=JSON.parse(mocks.send.mock.calls[0][1]);expect(payload).toMatchObject({orderNumber:'42',tag:'tiarra-order-42',body:'Поръчка №42 · 24,30 €'})
  expect(mocks.send.mock.calls[0][2]).toMatchObject({TTL:3600,timeout:8000,vapidDetails:{privateKey:keys.private_key}})
  expect(mocks.tx.mock.calls[0][0].join('')).toContain('for update of q skip locked');expect(mocks.tx.mock.calls[2][0].join('')).toContain("status='sent'")
 })
 it('does not resend a locked or previously sent entry',async()=>{mocks.tx.mockResolvedValueOnce([]);expect(await sendQueuedAdminPush('queue')).toBe(false);expect(mocks.send).not.toHaveBeenCalled()})
 it('removes expired devices on HTTP 410',async()=>{mocks.tx.mockResolvedValueOnce([entry]).mockResolvedValueOnce([keys]).mockResolvedValueOnce([]);mocks.send.mockRejectedValueOnce({statusCode:410});expect(await sendQueuedAdminPush('queue')).toBe(false);expect(mocks.tx.mock.calls[2][0].join('')).toContain('delete from store.admin_push_subscriptions')})
 it('retains network failures for a later retry',async()=>{mocks.tx.mockResolvedValueOnce([{...entry,attempts:2}]).mockResolvedValueOnce([keys]).mockResolvedValueOnce([]);mocks.send.mockRejectedValueOnce(new Error('offline'));expect(await sendQueuedAdminPush('queue')).toBe(false);expect(mocks.tx.mock.calls[2][0].join('')).toContain("status='failed'");expect(mocks.tx.mock.calls[2][1]).toBe(120)})
 it('skips a cancelled order',async()=>{mocks.tx.mockResolvedValueOnce([{...entry,order_status:'cancelled'}]).mockResolvedValueOnce([]);expect(await sendQueuedAdminPush('queue')).toBe(false);expect(mocks.send).not.toHaveBeenCalled();expect(mocks.tx.mock.calls[1][0].join('')).toContain("status='skipped'")})
})
it('foreground notices establish a baseline, detect new orders once and ignore cancelled orders',()=>{
 const orders=[{orderNumber:'42',status:'new'},{orderNumber:'41',status:'cancelled'}]
 expect(newOrderNotices(orders,null).fresh).toEqual([])
 const notices=newOrderNotices(orders,['40']);expect(notices.fresh).toEqual([orders[0]])
 expect(newOrderNotices(orders,notices.seen).fresh).toEqual([])
 // A transaction can commit after a higher order number: do not rely on a maximum ID.
 expect(newOrderNotices([{orderNumber:'39',status:'new'}],['40']).fresh).toHaveLength(1)
})
it('builds a standards-compliant encrypted Web Push request with real VAPID keys',async()=>{
 const actual=await vi.importActual<typeof import('web-push')>('web-push')
 const generated=actual.generateVAPIDKeys()
 const request=actual.generateRequestDetails(subscription,JSON.stringify({title:'Тест'}),{vapidDetails:{subject:'mailto:info@tiarracosmetics.com',publicKey:generated.publicKey,privateKey:generated.privateKey}})
 expect(request.headers['Content-Encoding']).toBe('aes128gcm')
 expect(request.headers.Authorization).toMatch(/^vapid /)
 expect(request.body?.length).toBeGreaterThan(0)
})
