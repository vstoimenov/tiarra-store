import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({query:vi.fn(),tx:vi.fn(),begin:vi.fn(),available:vi.fn(),keys:vi.fn(),send:vi.fn()}))
vi.mock('@/lib/db',()=>({sql:Object.assign(mocks.query,{begin:mocks.begin})}))
vi.mock('@/lib/admin/push',()=>({pushAvailable:mocks.available,getPushKeys:mocks.keys,sendPush:mocks.send}))
import {scheduledPushTest,sendScheduledAdminPushTest} from '@/lib/admin/scheduled-push-test'
const due=Date.parse(scheduledPushTest.notBefore)
beforeEach(()=>{vi.clearAllMocks();mocks.query.mockReset();mocks.tx.mockReset();mocks.begin.mockImplementation(callback=>callback(mocks.tx));mocks.available.mockResolvedValue(true);mocks.keys.mockResolvedValue({public_key:'public',private_key:'private'});mocks.send.mockResolvedValue({statusCode:201})})
it('does nothing before the requested time or after expiry',async()=>{
 expect(await sendScheduledAdminPushTest(due-1)).toEqual({attempted:0,sent:0});expect(await sendScheduledAdminPushTest(Date.parse(scheduledPushTest.expiresAt))).toEqual({attempted:0,sent:0});expect(mocks.available).not.toHaveBeenCalled()
})
it('does not send when push is unavailable or no devices are registered',async()=>{
 mocks.available.mockResolvedValueOnce(false);expect(await sendScheduledAdminPushTest(due)).toEqual({attempted:0,sent:0})
 mocks.query.mockResolvedValueOnce([]);expect(await sendScheduledAdminPushTest(due)).toEqual({attempted:0,sent:0});expect(mocks.send).not.toHaveBeenCalled()
})
it('sends one clearly marked test per subscribed device without using an order',async()=>{
 mocks.query.mockResolvedValue([{id:'device'}]);mocks.tx.mockResolvedValueOnce([{endpoint:'https://web.push.apple.com/a',p256dh:'key',auth:'auth'}]).mockResolvedValueOnce([{allowed:true}])
 expect(await sendScheduledAdminPushTest(due)).toEqual({attempted:1,sent:1})
 expect(mocks.send.mock.calls[0][1]).toMatchObject({title:'Тестово известие · Tiarra',tag:scheduledPushTest.id});expect(mocks.send.mock.calls[0][1].orderNumber).toBeUndefined()
 expect(mocks.tx.mock.calls[1][0].join('')).toContain('check_checkout_rate_limit');expect(mocks.tx.mock.calls[1][1]).toMatch(/^[a-f0-9]{64}$/)
})
it('does not resend a claimed test on the next cron tick',async()=>{
 mocks.query.mockResolvedValue([{id:'device'}]);mocks.tx.mockResolvedValueOnce([{endpoint:'https://web.push.apple.com/a',p256dh:'key',auth:'auth'}]).mockResolvedValueOnce([{allowed:false}])
 expect(await sendScheduledAdminPushTest(due)).toEqual({attempted:0,sent:0});expect(mocks.send).not.toHaveBeenCalled()
})
it('rolls back a failed provider attempt so a subsequent tick can retry',async()=>{
 mocks.query.mockResolvedValue([{id:'device'}]);mocks.tx.mockResolvedValueOnce([{endpoint:'https://web.push.apple.com/a',p256dh:'key',auth:'auth'}]).mockResolvedValueOnce([{allowed:true}]);mocks.send.mockRejectedValueOnce(new Error('offline'))
 expect(await sendScheduledAdminPushTest(due)).toEqual({attempted:1,sent:0});await expect(mocks.begin.mock.results[0].value).rejects.toThrow('offline')
})
