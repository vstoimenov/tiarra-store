import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'
const source=readFileSync(new URL('../../public/admin-sw.js',import.meta.url),'utf8')
function setup(){
 const listeners:Record<string,(event:unknown)=>void>={}
 const admin={url:'https://shop.test/admin/orders',postMessage:vi.fn(),navigate:vi.fn().mockResolvedValue(undefined),focus:vi.fn()}
 const storefront={url:'https://shop.test/store',postMessage:vi.fn()}
 const self={location:{origin:'https://shop.test'},addEventListener:(name:string,callback:(event:unknown)=>void)=>{listeners[name]=callback},skipWaiting:vi.fn(),registration:{showNotification:vi.fn().mockResolvedValue(undefined)},clients:{claim:vi.fn(),matchAll:vi.fn().mockResolvedValue([storefront,admin]),openWindow:vi.fn()}}
 runInNewContext(source,{self,URL})
 async function fire(name:string,event:Record<string,unknown>){let pending:Promise<unknown>|undefined;listeners[name]({...event,waitUntil:(value:Promise<unknown>)=>{pending=value}});await pending}
 return {self,admin,storefront,fire,listeners}
}
it('always displays a visible push and only messages admin windows',async()=>{
 const {self,admin,storefront,fire,listeners}=setup()
 await fire('push',{data:{json:()=>({title:'Нова поръчка',body:'№42',orderNumber:'42',tag:'tiarra-order-42'})}})
 expect(self.registration.showNotification).toHaveBeenCalledWith('Нова поръчка',expect.objectContaining({body:'№42',data:{url:'/admin/orders?order=42'}}))
 expect(admin.postMessage).toHaveBeenCalledWith({type:'TIARRA_NEW_ORDER'});expect(storefront.postMessage).not.toHaveBeenCalled()
 expect(listeners.fetch).toBeUndefined() // Never cache authenticated responses or offline copies.
})
it('handles malformed data with a generic visible notification',async()=>{
 const {self,fire}=setup();await fire('push',{data:{json:()=>{throw Error('invalid')}}})
 expect(self.registration.showNotification).toHaveBeenCalledWith('Нова поръчка · Tiarra',expect.objectContaining({data:{url:'/admin/orders'}}))
})
it('notification taps focus an existing admin window at the selected order',async()=>{
 const {self,admin,fire}=setup(),close=vi.fn()
 await fire('notificationclick',{notification:{close,data:{url:'/admin/orders?order=42'}}})
 expect(close).toHaveBeenCalled();expect(admin.navigate).toHaveBeenCalledWith('https://shop.test/admin/orders?order=42');expect(admin.focus).toHaveBeenCalled();expect(self.clients.openWindow).not.toHaveBeenCalled()
})
it('rejects arbitrary navigation targets and opens orders when no window is available',async()=>{
 const {self,fire}=setup();self.clients.matchAll.mockResolvedValue([])
 await fire('notificationclick',{notification:{close:vi.fn(),data:{url:'https://evil.test'}}})
 expect(self.clients.openWindow).toHaveBeenCalledWith('https://shop.test/admin/orders')
})
