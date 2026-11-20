import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {captureMetaClick,metaCheckoutContext,trackCommerce} from '@/lib/analytics'
import {metaPurchaseEventId} from '@/lib/meta-context'
let consent='essential',cookies='',writes:string[]=[]
beforeEach(()=>{
 consent='essential';cookies='';writes=[]
 vi.stubGlobal('window',{localStorage:{getItem:()=>consent},location:{href:'https://shop.example/store?fbclid=click_123'},fbq:vi.fn()})
 vi.stubGlobal('document',{get cookie(){return cookies},set cookie(value:string){writes.push(value);cookies=[cookies,value.split(';')[0]].filter(Boolean).join('; ')}})
})
afterEach(()=>vi.unstubAllGlobals())
it('does not read attribution into checkout or create a click cookie before consent',()=>{
 cookies='_fbp=fb.1.1730000000000.123';captureMetaClick();expect(writes).toEqual([]);expect(metaCheckoutContext()).toEqual({consent:false})
})
it('captures an advertising click only after acceptance and keeps its original timestamp',()=>{
 consent='accepted';captureMetaClick();expect(writes).toHaveLength(1);expect(writes[0]).toMatch(/^_fbc=fb\.1\.\d{13}\.click_123;/);expect(writes[0]).toContain('Secure');captureMetaClick();expect(writes).toHaveLength(1)
})
it('passes validated browser IDs with explicit consent',()=>{
 consent='accepted';window.location.href='https://shop.example/store/checkout';cookies='_fbp=fb.1.1730000000000.123;_fbc=fb.1.1730000000000.click_123'
 expect(metaCheckoutContext()).toEqual({consent:true,fbp:'fb.1.1730000000000.123',fbc:'fb.1.1730000000000.click_123'})
})
it('uses the same Purchase identifier in the browser and on the server',()=>{
 consent='accepted';trackCommerce('purchase',{currency:'EUR',value:31.41,transaction_id:'16',items:[]})
 expect(window.fbq).toHaveBeenCalledWith('track','Purchase',expect.any(Object),{eventID:metaPurchaseEventId('16')})
})
it('rejects a malformed advertising click without interrupting checkout',()=>{
 consent='accepted';window.location.href='https://shop.example/?fbclid=%3Cscript%3E';expect(()=>captureMetaClick()).not.toThrow();expect(writes).toEqual([])
})
