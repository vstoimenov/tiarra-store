import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { editTotals, orderEditSchema } from '@/lib/admin/order-edit-schema'

const mocks=vi.hoisted(()=>({query:Object.assign(vi.fn(),{json:vi.fn(value=>value)}),orders:vi.fn(),offices:vi.fn(),after:vi.fn(),sync:vi.fn(),revalidate:vi.fn()}))
vi.mock('@/lib/db',()=>({sql:mocks.query}))
vi.mock('@/lib/admin/orders',()=>({getAdminOrders:mocks.orders}))
vi.mock('@/lib/ordyx-offices',()=>({getCourierOffices:mocks.offices}))
vi.mock('@/lib/ordyx-sync',()=>({syncOrder:mocks.sync}))
vi.mock('next/server',async original=>({...await original<typeof import('next/server')>(),after:mocks.after}))
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}))
import { PUT } from '@/app/api/admin/orders/[orderNumber]/route'

const productId='11111111-1111-4111-8111-111111111111'
const draft={expectedVersion:'2026-11-17 10:00:00.123456+00',customerName:'Иван Петров',phone:'0888123456',email:'ivan@example.com',courier:'econt' as const,deliveryType:'address' as const,officeId:null,city:'София',postCode:'1000',deliveryAddress:'ул. Тестова 10',notes:'',shipping:4.5,discountAmount:0,items:[{id:'22222222-2222-4222-8222-222222222222',productId,variantId:null,quantity:2,unitPrice:9.9}]}
const context={params:Promise.resolve({orderNumber:'42'})}
function request(body:unknown,origin='https://shop.test'){return new NextRequest('https://shop.test/api/admin/orders/42',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})}
beforeEach(()=>{vi.clearAllMocks();mocks.query.mockResolvedValue([]);mocks.orders.mockResolvedValue([{...draft,ordyxStatus:'synced'}])})
describe('order edit validation and totals',()=>{
 it('requires at least one line, valid prices, bounded quantities and a real delivery selection',()=>{
  expect(orderEditSchema.safeParse(draft).success).toBe(true)
  for(const patch of [{items:[]},{items:[{...draft.items[0],quantity:100}]},{items:[{...draft.items[0],unitPrice:1.001}]},{items:[draft.items[0],draft.items[0]]},{discountAmount:20},{courier:'boxnow'},{deliveryType:'office',officeId:null},{phone:'12'},{email:'broken'}]) expect(orderEditSchema.safeParse({...draft,...patch}).success).toBe(false)
 })
 it('calculates totals in cents',()=>{expect(editTotals([{unitPrice:0.1,quantity:3},{unitPrice:9.9,quantity:2}],2.49,0.2)).toEqual({subtotal:20.1,total:22.39})})
})
describe('protected order edit endpoint',()=>{
 it('rejects cross-origin requests and invalid payloads before querying',async()=>{
  expect((await PUT(request(draft,'https://other.test'),context)).status).toBe(403)
  expect((await PUT(request({...draft,items:[]}),context)).status).toBe(400)
  expect(mocks.query).not.toHaveBeenCalled();expect(mocks.orders).not.toHaveBeenCalled()
 })
 it('saves atomically and warns about a previously synced order without resending it',async()=>{
  const response=await PUT(request(draft),context)
  expect(response.status).toBe(200);expect((await response.json()).ordyxManualUpdate).toBe(true)
  expect(mocks.query.mock.calls[0][0].join('')).toContain('store.admin_edit_order(')
  expect(mocks.query.json).toHaveBeenCalledWith(draft)
  expect(mocks.after).not.toHaveBeenCalled();expect(mocks.sync).not.toHaveBeenCalled()
  expect(mocks.revalidate).toHaveBeenCalledWith('/','layout')
 })
 it('validates and normalizes a changed locker from Ordyx',async()=>{
  mocks.offices.mockResolvedValue([{id:'boxnow:1',city:'София',postCode:'1000',name:'Автомат',address:'ул. Нова 1',code:'1',isAutomat:true}])
  const response=await PUT(request({...draft,courier:'boxnow',deliveryType:'automat',officeId:'boxnow:1',deliveryAddress:'Непроверен адрес'}),context)
  expect(response.status).toBe(200)
  expect(mocks.query.json).toHaveBeenCalledWith(expect.objectContaining({deliveryAddress:'София, Автомат, ул. Нова 1 [1]',officeId:'boxnow:1'}))
 })
 it('keeps existing office deliveries editable when the office service is unavailable',async()=>{
  const officeDraft={...draft,deliveryType:'office',officeId:'econt:1'}
  mocks.orders.mockResolvedValue([{...officeDraft,ordyxStatus:'synced'}])
  expect((await PUT(request(officeDraft),context)).status).toBe(200)
  expect(mocks.offices).not.toHaveBeenCalled()
 })
 it.each([['ORDER_CHANGED',409],['INSUFFICIENT_STOCK',409],['ORDER_NOT_EDITABLE',409],['PRODUCT_NOT_FOUND',409],['INVALID_DISCOUNT',400]])('returns an actionable error for %s',async(message,status)=>{
  mocks.query.mockRejectedValueOnce(new Error(message))
  expect((await PUT(request(draft),context)).status).toBe(status)
  expect(mocks.revalidate).not.toHaveBeenCalled()
 })
 it('reports a missing migration without reporting success',async()=>{
  mocks.query.mockRejectedValueOnce(Object.assign(new Error('function does not exist'),{code:'42883'}))
  const response=await PUT(request(draft),context)
  expect(response.status).toBe(503);expect((await response.json()).error).toContain('Supabase')
 })
})
