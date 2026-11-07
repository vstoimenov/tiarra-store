import { afterEach, describe, expect, it, vi } from 'vitest'
import { signOffice, verifyOffice } from '@/lib/office-token'

describe('signed office selection',()=>{
 afterEach(()=>vi.unstubAllEnvs())
 it('accepts an authentic office without contacting the courier and rejects changes or expiry',()=>{
  vi.stubEnv('CRON_SECRET','test-only-secret')
  const office={id:'econt:1',code:'1',name:'Център',city:'София',address:'ул. Пример 1',postCode:'1000',isAutomat:false}
  const token=signOffice('econt',office,1000)
  expect(verifyOffice(token,'econt','econt:1','office',2000)?.name).toBe('Център')
  expect(verifyOffice(token,'speedy','econt:1','office',2000)).toBeNull()
  expect(verifyOffice(token,'econt','econt:2','office',2000)).toBeNull()
  expect(verifyOffice(token,'econt','econt:1','automat',2000)).toBeNull()
  expect(verifyOffice(`${token}x`,'econt','econt:1','office',2000)).toBeNull()
  expect(verifyOffice(token,'econt','econt:1','office',1000+72*60*60*1000)).toBeNull()
 })
})
