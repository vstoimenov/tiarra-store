import { afterEach, expect, it, vi } from 'vitest'
const query=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/db',()=>({sql:query}))
import { checkoutRateLimit } from '@/lib/rate-limit'
afterEach(()=>vi.unstubAllEnvs())
it('still enforces limits when no custom salt is configured',async()=>{vi.stubEnv('CHECKOUT_RATE_LIMIT_SALT','');query.mockResolvedValue([{allowed:false}]);expect(await checkoutRateLimit(new Request('https://shop.test/api/orders',{headers:{'x-forwarded-for':'192.0.2.1'}}),'order')).toBe(false);expect(query).toHaveBeenCalled()})
