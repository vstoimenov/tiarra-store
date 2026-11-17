import {afterAll,beforeEach,expect,it} from 'vitest'
import {sql} from '@/lib/db'
import {resetCatalog} from './helpers'
beforeEach(async()=>{
 await resetCatalog()
 await sql`update store.commerce_settings set free_shipping_threshold=39,econt_enabled=true,speedy_enabled=true,boxnow_enabled=true,econt_address_enabled=true,speedy_address_enabled=true,econt_free_shipping=false,speedy_free_shipping=true,boxnow_free_shipping=true,econt_office_price=4.5,econt_address_price=6.5,speedy_office_price=3.5,speedy_address_price=5.5,boxnow_price=2.49 where singleton`
})
afterAll(()=>sql.end())
async function order(courier:string,deliveryType:string,price:number,requestId=crypto.randomUUID()){
 const [product]=await sql<{id:string}[]>`insert into store.products(slug,title,gender,price) values(${crypto.randomUUID()},'Продукт','unisex',${price}) returning id`
 const create=()=>sql<{order_number:string;total:number;is_new:boolean}[]>`select order_number,total::float8,is_new from store.create_order_with_settings_and_promo(${requestId},'Тест Клиент','0888123456','test@example.com',${courier},${deliveryType},${deliveryType==='address'?null:'test:1'},'София','1000','Тестов адрес','',${sql.json([{productId:product.id,variantId:null,quantity:1}])},'')`
 return {create}
}
it.each([['econt','office',50,4.5],['econt','address',50,6.5],['speedy','office',50,0],['speedy','address',50,0],['boxnow','automat',50,0],['speedy','office',38.99,3.5],['boxnow','automat',38.99,2.49],['speedy','office',39,0]])('stores the correct shipping for %s %s at %s',async(courier,method,price,shipping)=>{
 const [created]=await(await order(courier,method,Number(price))).create()
 const [saved]=await sql<{shipping:number;total:number}[]>`select shipping::float8,total::float8 from store.orders where order_number=${created.order_number}`
 expect(saved.shipping).toBe(shipping);expect(saved.total).toBeCloseTo(Number(price)+Number(shipping),2)
})
it('supports changing eligibility independently, including a zero threshold',async()=>{
 await sql`update store.commerce_settings set econt_free_shipping=true,speedy_free_shipping=false,boxnow_free_shipping=false,free_shipping_threshold=0 where singleton`
 expect((await(await order('econt','office',20)).create())[0].total).toBe(20)
 expect((await(await order('speedy','office',20)).create())[0].total).toBe(23.5)
 expect((await(await order('boxnow','automat',20)).create())[0].total).toBe(22.49)
})
it('does not change an already saved order on a checkout retry after a policy change',async()=>{
 const checkout=await order('econt','office',50)
 const [first]=await checkout.create()
 await sql`update store.commerce_settings set econt_free_shipping=true where singleton`
 const [retry]=await checkout.create()
 expect(first.total).toBe(54.5);expect(retry.total).toBe(54.5);expect(retry.is_new).toBe(false)
})
