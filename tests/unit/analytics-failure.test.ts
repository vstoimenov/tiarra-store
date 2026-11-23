import { afterEach, expect, it, vi } from 'vitest'
import { analyticsAllowed, flushMetaCommerceEvents, trackCommerce } from '@/lib/analytics'
afterEach(()=>{vi.stubGlobal('window',{localStorage:{getItem:()=> 'essential'}});flushMetaCommerceEvents();vi.unstubAllGlobals()})
it('denies analytics when browser storage is unavailable',()=>{vi.stubGlobal('window',{get localStorage(){throw new Error('blocked')}});expect(analyticsAllowed()).toBe(false)})
it('does not interrupt shopping when a tracker fails',()=>{vi.stubGlobal('window',{localStorage:{getItem:()=> 'accepted'},dataLayer:{push:()=>{throw new Error('tracker')}}});expect(()=>trackCommerce('purchase',{currency:'EUR',value:1,items:[],transaction_id:'1'})).not.toThrow()})
it('still sends Meta when a Google tracker throws',()=>{
 const fbq=vi.fn();vi.stubGlobal('window',{localStorage:{getItem:()=> 'accepted'},fbq,dataLayer:{push:()=>{throw new Error('Google blocked')}}})
 trackCommerce('purchase',{currency:'EUR',value:12,items:[],transaction_id:'16'})
 expect(fbq).toHaveBeenCalledWith('track','Purchase',expect.objectContaining({value:12}),{eventID:'order-16'})
})
it('delivers a consented product view once after the pixel becomes ready',()=>{
 const push=vi.fn(),fbq=vi.fn();vi.stubGlobal('window',{localStorage:{getItem:()=> 'accepted'},dataLayer:{push}})
 trackCommerce('view_item',{currency:'EUR',value:12,items:[{item_id:'p',item_name:'Парфюм',price:12,quantity:1}]})
 expect(push).toHaveBeenCalledTimes(1)
 window.fbq=fbq;flushMetaCommerceEvents();flushMetaCommerceEvents()
 expect(fbq).toHaveBeenCalledTimes(1);expect(fbq.mock.calls[0][1]).toBe('ViewContent')
})
it('discards queued marketing events when consent is withdrawn',()=>{
 const storage={getItem:()=> 'accepted'};vi.stubGlobal('window',{localStorage:storage})
 trackCommerce('view_item',{currency:'EUR',value:1,items:[]})
 storage.getItem=()=> 'essential';flushMetaCommerceEvents()
 storage.getItem=()=> 'accepted';window.fbq=vi.fn();flushMetaCommerceEvents()
 expect(window.fbq).not.toHaveBeenCalled()
})
