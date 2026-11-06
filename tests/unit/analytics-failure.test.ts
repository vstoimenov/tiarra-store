import { afterEach, expect, it, vi } from 'vitest'
import { analyticsAllowed, trackCommerce } from '@/lib/analytics'
afterEach(()=>vi.unstubAllGlobals())
it('denies analytics when browser storage is unavailable',()=>{vi.stubGlobal('window',{get localStorage(){throw new Error('blocked')}});expect(analyticsAllowed()).toBe(false)})
it('does not interrupt shopping when a tracker fails',()=>{vi.stubGlobal('window',{localStorage:{getItem:()=> 'accepted'},dataLayer:{push:()=>{throw new Error('tracker')}}});expect(()=>trackCommerce('purchase',{currency:'EUR',value:1,items:[],transaction_id:'1'})).not.toThrow()})
