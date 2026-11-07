import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ query:vi.fn(), revalidate:vi.fn() }))
vi.mock('@/lib/db',()=>({sql:Object.assign(mocks.query,{json:(v:unknown)=>v})}))
vi.mock('next/cache',()=>({revalidateTag:mocks.revalidate}))
import { PUT } from '@/app/api/admin/home/route'
const request=(body:unknown,origin='https://shop.test')=>new Request('https://shop.test/api/admin/home',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
describe('homepage write API',()=>{
 beforeEach(()=>vi.clearAllMocks())
 it('rejects cross-origin writes before querying',async()=>{expect((await PUT(request({},'https://other.test'))).status).toBe(403);expect(mocks.query).not.toHaveBeenCalled()})
 it('handles scalar JSON without throwing',async()=>{expect((await PUT(request('bad'))).status).toBe(400)})
 it('rejects a stale edit without publishing',async()=>{mocks.query.mockResolvedValue([]);expect((await PUT(request({document:{sections:[]},publish:true,revision:'old'}))).status).toBe(409);expect(mocks.revalidate).not.toHaveBeenCalled()})
 it('returns the next revision and invalidates published content',async()=>{mocks.query.mockResolvedValue([{revision:'new'}]);const response=await PUT(request({document:{sections:[]},publish:true,revision:'old'}));expect(await response.json()).toEqual({document:{theme:'classic',sections:[]},revision:'new'});expect(mocks.revalidate).toHaveBeenCalledWith('site')})
 it('does not invalidate the storefront for draft writes',async()=>{mocks.query.mockResolvedValue([{revision:'new'}]);await PUT(request({document:{sections:[]},publish:false,revision:'old'}));expect(mocks.revalidate).not.toHaveBeenCalled()})
})
