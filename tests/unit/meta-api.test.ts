import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({test:vi.fn(),available:vi.fn(),send:vi.fn(),query:vi.fn()}))
vi.mock('@/lib/meta-conversions',()=>({sendMetaIntegrationTest:mocks.test,metaQueueAvailable:mocks.available,sendMetaPurchase:mocks.send}))
vi.mock('@/lib/db',()=>({sql:mocks.query}))
import {POST} from '@/app/api/admin/meta/test/route'
import {GET} from '@/app/api/cron/meta-conversions/route'
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('CRON_SECRET','test-only-cron');mocks.available.mockResolvedValue(true);mocks.send.mockResolvedValue(true)})
afterEach(()=>vi.unstubAllEnvs())
it('rejects a foreign-origin admin test before reading configuration or calling Meta',async()=>{
 const response=await POST(new Request('https://shop.example/api/admin/meta/test',{method:'POST',headers:{origin:'https://other.example'}}));expect(response.status).toBe(403);expect(mocks.test).not.toHaveBeenCalled()
})
it('returns only an acknowledgement from an accepted admin test',async()=>{
 mocks.test.mockResolvedValue({ok:true,privateValue:'must-not-be-serialized'});const response=await POST(new Request('https://shop.example/api/admin/meta/test',{method:'POST',headers:{origin:'https://shop.example'}}));expect(await response.json()).toEqual({ok:true})
})
it('does not echo a failing service exception into the admin response',async()=>{
 mocks.test.mockRejectedValue(new Error('private token or data'));const response=await POST(new Request('https://shop.example/api/admin/meta/test',{method:'POST',headers:{origin:'https://shop.example'}}));expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toMatch(/private|token/)
})
it('requires the cron secret before any cleanup or event processing',async()=>{
 const response=await GET(new Request('https://shop.example/api/cron/meta-conversions'));expect(response.status).toBe(401);expect(mocks.available).not.toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();expect(mocks.query).not.toHaveBeenCalled()
})
it('does not run a missing queue during rollout',async()=>{
 mocks.available.mockResolvedValue(false);const response=await GET(new Request('https://shop.example/api/cron/meta-conversions',{headers:{authorization:'Bearer test-only-cron'}}));expect(await response.json()).toEqual({enabled:false});expect(mocks.send).not.toHaveBeenCalled()
})
it('cleans up old matching data and caps each authorized retry run at five',async()=>{
 const response=await GET(new Request('https://shop.example/api/cron/meta-conversions',{headers:{authorization:'Bearer test-only-cron'}}));expect(await response.json()).toEqual({sent:5});expect(mocks.send).toHaveBeenCalledTimes(5);expect(mocks.query.mock.calls[0][0].join('')).toContain("interval '7 days'")
})
