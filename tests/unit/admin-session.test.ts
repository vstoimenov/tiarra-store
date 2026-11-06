import { afterEach,expect,it,vi } from 'vitest'
import { createAdminSession,validAdminSession,SESSION_SECONDS } from '@/lib/admin/session'
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers()})
it('validates signatures, rejects tampering, expires and invalidates on password rotation',async()=>{
 vi.stubEnv('ADMIN_USERNAME','admin-test');vi.stubEnv('ADMIN_PASSWORD','test-password-only');
 const token=await createAdminSession();expect(await validAdminSession(token)).toBe(true)
 expect(await validAdminSession(token.slice(0,-1)+(token.endsWith('a')?'b':'a'))).toBe(false)
 expect(await validAdminSession('bad')).toBe(false);expect(await validAdminSession(undefined)).toBe(false)
 vi.stubEnv('ADMIN_PASSWORD','different-password');expect(await validAdminSession(token)).toBe(false)
 vi.stubEnv('ADMIN_PASSWORD','test-password-only');vi.useFakeTimers();vi.setSystemTime(Date.now()+(SESSION_SECONDS+1)*1000);expect(await validAdminSession(token)).toBe(false)
})
