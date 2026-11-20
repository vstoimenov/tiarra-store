import {createHash} from 'node:crypto'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({query:vi.fn(),tx:vi.fn(),begin:vi.fn(),settings:vi.fn()}))
vi.mock('@/lib/db',()=>({sql:Object.assign(mocks.query,{begin:mocks.begin,json:(value:unknown)=>value})}))
vi.mock('@/lib/commerce-settings',()=>({getCommerceSettings:mocks.settings}))
import {buildMetaPurchase,getMetaCapiStatus,normalizedMetaPhone,queueMetaPurchase,sendMetaIntegrationTest,sendMetaPurchase} from '@/lib/meta-conversions'
import {normalizeMetaContext} from '@/lib/meta-context'
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
const order={id:'11111111-1111-4111-8111-111111111111',number:'16',email:' Customer@Example.com ',phone:'0888123456',total:31.41,createdAt:new Date(),items:[{id:'variant-1',quantity:2,price:15}]}
const request=()=>new Request('https://shop.example/api/orders',{headers:{'user-agent':'Test browser','x-forwarded-for':'203.0.113.1, 10.0.0.1'}})
const queued=(patch={})=>({id:order.id,pixelId:'123456789',payload:buildMetaPurchase({...order,createdAt:new Date()}, {consent:true},'https://shop.example/store/checkout','Test browser'),testCode:null,attempts:0,cancelled:false,...patch})
const values=()=>mocks.tx.mock.calls.at(-1)?.slice(1)??[]
beforeEach(()=>{
 vi.clearAllMocks();mocks.query.mockReset();mocks.tx.mockReset();mocks.settings.mockResolvedValue({metaPixelId:'123456789'});mocks.begin.mockImplementation(callback=>callback(mocks.tx))
 vi.stubEnv('SITE_ENV','production');vi.stubEnv('SITE_URL','https://shop.example');vi.stubEnv('META_CONVERSIONS_ACCESS_TOKEN','test-token-not-a-real-secret');vi.stubEnv('META_CONVERSIONS_TEST_EVENT_CODE','');vi.stubEnv('META_CONVERSIONS_API_VERSION','')
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({events_received:1}))))
})
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
it('requires explicit boolean consent and discards malformed cookie identifiers',()=>{
 expect(normalizeMetaContext({consent:'true',fbp:'abc'})).toEqual({consent:false})
 expect(normalizeMetaContext({consent:false,fbp:'fb.1.1730000000000.123'})).toEqual({consent:false})
 expect(normalizeMetaContext({consent:true,fbp:'bad',fbc:'bad'})).toEqual({consent:true})
 expect(normalizeMetaContext({consent:true,fbp:'fb.1.1730000000000.123',fbc:'fb.1.1730000000000.click_id'})).toEqual({consent:true,fbp:'fb.1.1730000000000.123',fbc:'fb.1.1730000000000.click_id'})
})
it.each(['0888123456','+359 888 123 456','00359888123456','888123456'])('normalizes Bulgarian numbers before hashing: %s',phone=>{expect(normalizedMetaPhone(phone)).toBe('359888123456')})
it('builds a deduplicated Purchase using hashed identity and real order totals',()=>{
 const payload=buildMetaPurchase(order,{consent:true,fbp:'fb.1.1730000000000.123'},'https://shop.example/store/checkout','Test browser','203.0.113.1')
 expect(payload.event_id).toBe('order-16');expect(payload.event_time).toBe(Math.floor(order.createdAt.getTime()/1000))
 expect(payload.user_data).toMatchObject({em:[hash('customer@example.com')],ph:[hash('359888123456')],client_user_agent:'Test browser',client_ip_address:'203.0.113.1',fbp:'fb.1.1730000000000.123'})
 expect(payload.custom_data).toMatchObject({value:31.41,currency:'EUR',num_items:2,contents:[{id:'variant-1',quantity:2,item_price:15}]})
 expect(JSON.stringify(payload)).not.toMatch(/Customer@Example|0888123456/)
})
it.each([undefined,{},null,{consent:false},{consent:'true'}])('does not query or send matching data without consent: %o',async context=>{
 expect(await queueMetaPurchase('16',context,request())).toBe(false);expect(mocks.query).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled()
})
it('does not capture production purchases from Preview or when the token is absent',async()=>{
 vi.stubEnv('SITE_ENV','preview');expect(await queueMetaPurchase('16',{consent:true},request())).toBe(false)
 vi.stubEnv('SITE_ENV','production');vi.stubEnv('META_CONVERSIONS_ACCESS_TOKEN','');expect(await queueMetaPurchase('16',{consent:true},request())).toBe(false);expect(mocks.query).not.toHaveBeenCalled()
})
it('queues only saved order data and never stores the access token',async()=>{
 mocks.query.mockResolvedValueOnce([{available:true}]).mockResolvedValueOnce([order]).mockResolvedValueOnce([])
 expect(await queueMetaPurchase('16',{consent:true,value:99999},request())).toBe(true)
 const payload=mocks.query.mock.calls.at(-1)!.find(value=>value?.event_name==='Purchase')
 expect(payload.custom_data.value).toBe(31.41);expect(payload.user_data.em).toEqual([hash('customer@example.com')]);expect(payload.event_source_url).toBe('https://shop.example/store/checkout')
 expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('test-token-not-a-real-secret');expect(fetch).not.toHaveBeenCalled()
})
it('fails closed before a migration has been run',async()=>{
 mocks.query.mockResolvedValue([{available:false}]);expect(await queueMetaPurchase('16',{consent:true},request())).toBe(false);expect(mocks.query).toHaveBeenCalledOnce()
})
it('sends exactly one event and clears matching data only when Meta accepts it',async()=>{
 mocks.query.mockResolvedValue([{available:true}]);mocks.tx.mockResolvedValueOnce([queued()]).mockResolvedValueOnce([])
 expect(await sendMetaPurchase('16')).toBe(true)
 const [url,options]=vi.mocked(fetch).mock.calls[0];expect(String(url)).toBe('https://graph.facebook.com/v25.0/123456789/events');expect(String(url)).not.toContain('test-token')
 const body=JSON.parse(String(options!.body));expect(body.data).toHaveLength(1);expect(body.data[0].event_id).toBe('order-16');expect(body.access_token).toBe('test-token-not-a-real-secret');expect(body.test_event_code).toBeUndefined()
 expect(mocks.tx.mock.calls.at(-1)![0].join('')).toContain("status='sent'");expect(mocks.tx.mock.calls.at(-1)![0].join('')).toContain('payload=null')
})
it('keeps the captured test code on retries after the environment test code changes',async()=>{
 vi.stubEnv('META_CONVERSIONS_TEST_EVENT_CODE','TEST_NEW');mocks.query.mockResolvedValue([{available:true}]);mocks.tx.mockResolvedValueOnce([queued({testCode:'TEST_ORIGINAL'})]).mockResolvedValueOnce([])
 await sendMetaPurchase();expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]!.body)).test_event_code).toBe('TEST_ORIGINAL')
})
it('retries provider outages with the same event_id and stores only safe numeric diagnostics',async()=>{
 mocks.query.mockResolvedValue([{available:true}]);mocks.tx.mockResolvedValueOnce([queued()]).mockResolvedValueOnce([])
 vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({error:{code:2,message:'secret test-token-not-a-real-secret customer@example.com'}}),{status:503}))
 expect(await sendMetaPurchase()).toBe(false);expect(values()).toContain('META_HTTP_503_CODE_2');expect(values()).toContain(true);expect(values()).toContain(60)
 expect(JSON.stringify(mocks.tx.mock.calls)).not.toMatch(/secret|customer@example/)
})
it('does not mark a 200 response without accepted events as delivered',async()=>{
 mocks.query.mockResolvedValue([{available:true}]);mocks.tx.mockResolvedValueOnce([queued()]).mockResolvedValueOnce([]);vi.mocked(fetch).mockResolvedValue(new Response('{"events_received":0}'))
 expect(await sendMetaPurchase()).toBe(false);expect(values()).toContain('META_HTTP_200');expect(values()).toContain(true)
})
it('stops automatic retries for invalid tokens and for exhausted transient failures',async()=>{
 mocks.query.mockResolvedValue([{available:true}]);mocks.tx.mockResolvedValueOnce([queued()]).mockResolvedValueOnce([]);vi.mocked(fetch).mockResolvedValue(new Response('{"error":{"code":190}}',{status:400}))
 await sendMetaPurchase();expect(values()).toContain('META_HTTP_400_CODE_190');expect(values()).toContain(false)
 mocks.tx.mockResolvedValueOnce([queued({attempts:9})]).mockResolvedValueOnce([]);vi.mocked(fetch).mockRejectedValue(new Error('Network'))
 await sendMetaPurchase();expect(values()).toContain(false)
})
it.each([{cancelled:true},{payload:{event_time:Math.floor(Date.now()/1000)-7*86400}},{payload:{event_time:Math.floor(Date.now()/1000)+1000}}])('skips cancelled or expired/future events without sending: %o',async patch=>{
 mocks.query.mockResolvedValue([{available:true}]);mocks.tx.mockResolvedValueOnce([queued(patch)]).mockResolvedValueOnce([]);expect(await sendMetaPurchase()).toBe(false);expect(fetch).not.toHaveBeenCalled();expect(mocks.tx.mock.calls.at(-1)![0].join('')).toContain("status='skipped'")
})
it('refuses an admin test without a test code, even in Production',async()=>{
 expect((await sendMetaIntegrationTest(request())).ok).toBe(false);expect(fetch).not.toHaveBeenCalled();expect(mocks.query).not.toHaveBeenCalled()
})
it('sends a forced Test Events sample without writing any store order or queue record',async()=>{
 vi.stubEnv('META_CONVERSIONS_TEST_EVENT_CODE','TEST12345');expect((await sendMetaIntegrationTest(request())).ok).toBe(true)
 const body=JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]!.body));expect(body.test_event_code).toBe('TEST12345');expect(body.data[0].event_id).toMatch(/^order-test-/);expect(body.data[0].custom_data.content_ids).toEqual(['tiarra-meta-test']);expect(mocks.query).not.toHaveBeenCalled();expect(mocks.begin).not.toHaveBeenCalled()
})
it('returns configuration and delivery state without a token or customer payload',async()=>{
 mocks.query.mockResolvedValueOnce([{available:true}]).mockResolvedValueOnce([{pending:1,failed:0,sent:2,lastSentAt:'2026-11-20 10:00:00+00',lastError:null}])
 const status=await getMetaCapiStatus();expect(status).toMatchObject({tokenConfigured:true,queueAvailable:true,sent:2,pending:1});expect(JSON.stringify(status)).not.toContain('test-token')
})
