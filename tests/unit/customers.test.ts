import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/db',()=>({sql:vi.fn()}))
import { customerFilter,customersCsv,filterCustomers,type Customer } from '@/lib/admin/customers'
const buyer:Customer={key:'email:buyer@test.bg',name:'Иван Петров',email:'buyer@test.bg',phone:'+359888123456',orderCount:2,activeOrders:1,orderValue:25,lastOrder:'2026-11-14',subscribedAt:null}
const subscriber:Customer={...buyer,key:'email:subscriber@test.bg',name:null,email:'subscriber@test.bg',phone:null,orderCount:0,activeOrders:0,orderValue:0,lastOrder:null,subscribedAt:'2026-11-14'}
const both:Customer={...buyer,key:'email:both@test.bg',email:'both@test.bg',subscribedAt:'2026-11-14'}
const rows=[buyer,subscriber,both]
describe('customer directory',()=>{
 it('distinguishes buyers, consented subscribers, and signups without orders',()=>{
  expect(filterCustomers(rows,'','buyers')).toEqual([buyer,both])
  expect(filterCustomers(rows,'','subscribers')).toEqual([subscriber,both])
  expect(filterCustomers(rows,'','leads')).toEqual([subscriber])
  expect(filterCustomers(rows,'','all')).toEqual(rows)
 })
 it('searches names, email and phone without treating punctuation as wildcards',()=>{
  expect(filterCustomers(rows,'  ИВАН  ','all')).toEqual([buyer,both])
  expect(filterCustomers(rows,'subscriber@','all')).toEqual([subscriber])
  expect(filterCustomers(rows,'888123','all')).toEqual([buyer,both])
  expect(filterCustomers(rows,'%','all')).toEqual([])
  expect(customerFilter('unrecognized')).toBe('all')
 })
 it('exports consent separately from purchases and protects spreadsheet formulas',()=>{
  const csv=customersCsv([{...buyer,name:'=DANGEROUS("x")'},subscriber])
  expect(csv).toContain('"\'=DANGEROUS(""x"")"')
  expect(csv).toContain('"\'+359888123456"')
  expect(csv).toContain('"Не",""')
  expect(csv).toContain('"Да","2026-11-14"')
  expect(csv.startsWith('\ufeff')).toBe(true)
 })
})
