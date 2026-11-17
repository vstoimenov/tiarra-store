import { afterAll, beforeEach, expect, it } from 'vitest'
import { sql } from '@/lib/db'
import { resetCatalog } from './helpers'
import type { OrderEdit } from '@/lib/admin/order-edit-schema'

beforeEach(resetCatalog)
afterAll(()=>sql.end())
async function fixture(){
  const [product]=await sql<{id:string}[]>`insert into store.products(slug,title,gender,price,stock) values ('editable-order','Тестов парфюм','unisex',10,10) returning id`
  const [order]=await sql<{order_number:string}[]>`select order_number from store.create_order_with_settings_and_promo(${crypto.randomUUID()},'Иван Петров','0888123456','ivan@example.com','econt','address',null,'София','1000','ул. Тестова 10','',${sql.json([{productId:product.id,variantId:null,quantity:2}])},'')`
  const read=async()=>{
    const [o]=await sql<{version:string;id:string}[]>`select id,updated_at::text as version from store.orders where order_number=${order.order_number}`
    const items=await sql<OrderEdit['items']>`select id,product_id as "productId",variant_id as "variantId",quantity,unit_price::float8 as "unitPrice" from store.order_items where order_id=${o.id}`
    return {expectedVersion:o.version,customerName:'Иван Петров',phone:'0888123456',email:'ivan@example.com',courier:'econt',deliveryType:'address',officeId:null,city:'София',postCode:'1000',deliveryAddress:'ул. Тестова 10',notes:'',shipping:4.5,discountAmount:0,items} satisfies OrderEdit
  }
  const save=(draft:OrderEdit)=>sql`select store.admin_edit_order(${order.order_number},${sql.json(draft)})`
  const stock=async()=>(await sql<{stock:number}[]>`select stock from store.products where id=${product.id}`)[0].stock
  return {product,number:order.order_number,read,save,stock}
}
it('reserves only the additional quantity and calculates the final total in the same transaction',async()=>{
 const f=await fixture();const draft=await f.read();draft.items[0].quantity=3;draft.customerName='Мария Петрова';draft.shipping=2.49;draft.discountAmount=2
 await f.save(draft)
 expect(await f.stock()).toBe(7)
 const [order]=await sql<{customer_name:string;total:number}[]>`select customer_name,total::float8 from store.orders where order_number=${f.number}`
 expect(order).toEqual({customer_name:'Мария Петрова',total:30.49})
 await expect(f.save(draft)).rejects.toThrow('ORDER_CHANGED')
})
it('rolls back all changes if an added item has insufficient stock',async()=>{
 const f=await fixture();const before=await f.read();const draft=structuredClone(before);draft.customerName='Не трябва да се запише';draft.items[0].quantity=99
 await expect(f.save(draft)).rejects.toThrow('INSUFFICIENT_STOCK')
 expect(await f.read()).toEqual(before);expect(await f.stock()).toBe(8)
})
it('restores removed quantities and cancellation restores the remaining edited quantities once',async()=>{
 const f=await fixture();const draft=await f.read();draft.items[0].quantity=1;await f.save(draft)
 expect(await f.stock()).toBe(9)
 await sql`select * from store.update_order_status(${f.number},'cancelled')`
 expect(await f.stock()).toBe(10)
 await sql`select * from store.update_order_status(${f.number},'cancelled')`
 expect(await f.stock()).toBe(10)
 await expect(f.save(await f.read())).rejects.toThrow('ORDER_NOT_EDITABLE')
})
it('rejects empty orders, foreign item IDs and an excessive discount',async()=>{
 const f=await fixture();const draft=await f.read()
 await expect(f.save({...draft,items:[]})).rejects.toThrow('INVALID_ORDER')
 await expect(f.save({...draft,items:[{...draft.items[0],id:crypto.randomUUID()}]})).rejects.toThrow('INVALID_ORDER_ITEM')
 await expect(f.save({...draft,discountAmount:100})).rejects.toThrow('INVALID_DISCOUNT')
 expect(await f.stock()).toBe(8)
})
