import { afterAll, beforeEach, expect, it } from 'vitest'
import { sql } from '@/lib/db'
import { resetCatalog } from './helpers'
beforeEach(async()=>{await resetCatalog();await sql`truncate store.admin_push_subscriptions cascade`})
afterAll(()=>sql.end())
async function createOrder(requestId=crypto.randomUUID()){
 const [product]=await sql<{id:string}[]>`insert into store.products(slug,title,gender,price) values(${crypto.randomUUID()},'Тестов продукт','unisex',10) returning id`
 const items=[{productId:product.id,variantId:null,quantity:1}]
 const call=()=>sql<{order_number:string;is_new:boolean}[]>`select * from store.create_order_with_settings_and_promo(${requestId},'Тест Клиент','0888123456','test@example.com','econt','address',null,'София','1000','Тестов адрес','',${sql.json(items)},'')`
 return {call}
}
it('queues one notification per device without replaying old orders or checkout retries',async()=>{
 await(await createOrder()).call()
 await sql`insert into store.admin_push_subscriptions(endpoint,p256dh,auth) values('https://web.push.apple.com/device-one','test','test'),('https://web.push.apple.com/device-two','test','test')`
 expect((await sql<{count:number}[]>`select count(*)::int as count from store.admin_push_queue`)[0].count).toBe(0)
 const order=await createOrder();await order.call();expect((await order.call())[0].is_new).toBe(false)
 expect((await sql<{count:number}[]>`select count(*)::int as count from store.admin_push_queue`)[0].count).toBe(2)
})
it('a rolled-back order cannot leave a queued notification',async()=>{
 await sql`insert into store.admin_push_subscriptions(endpoint,p256dh,auth) values('https://web.push.apple.com/device-one','test','test')`
 await expect(sql.begin(async tx=>{
  await tx`insert into store.orders(customer_name,phone,courier,delivery_address,subtotal,shipping,total) values('Тест','0888123456','econt','Тестов адрес',10,4.5,14.5)`
  throw new Error('PRICE_CHANGED')
 })).rejects.toThrow('PRICE_CHANGED')
 expect((await sql<{count:number}[]>`select count(*)::int as count from store.admin_push_queue`)[0].count).toBe(0)
})
it('deleting a device also removes its pending notifications and keeps secrets private',async()=>{
 await sql`insert into store.admin_push_subscriptions(endpoint,p256dh,auth) values('https://web.push.apple.com/device-one','test','test')`
 await(await createOrder()).call()
 await sql`delete from store.admin_push_subscriptions where endpoint='https://web.push.apple.com/device-one'`
 expect((await sql<{count:number}[]>`select count(*)::int as count from store.admin_push_queue`)[0].count).toBe(0)
 const [permissions]=await sql<{anon:boolean;authenticated:boolean}[]>`select has_table_privilege('anon','store.admin_push_config','select') as anon,has_table_privilege('authenticated','store.admin_push_subscriptions','select') as authenticated`
 expect(permissions).toEqual({anon:false,authenticated:false})
})
