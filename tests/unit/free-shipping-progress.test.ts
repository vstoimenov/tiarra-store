import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,it,expect} from 'vitest'
import {FreeShippingProgress} from '@/components/cart/FreeShippingProgress'
const render=(subtotal:number,threshold:number)=>renderToStaticMarkup(createElement(FreeShippingProgress,{subtotal,threshold}))
describe('checkout free-shipping progress',()=>{
 it('shows the precise remaining amount from the configured threshold',()=>{
  expect(render(9.9,39)).toContain('29,10 €')
  const custom=render(39,50)
  expect(custom).toContain('11,00 €')
  expect(custom).not.toContain('data-complete="true"')
 })
 it('confirms the reached threshold and clamps progress above it',()=>{
  const html=render(75,50)
  expect(html).toContain('Доставката е безплатна!')
  expect(html).toContain('aria-valuenow="100"')
  expect(html).toContain('width:100%')
  expect(html).not.toContain('Още ')
 })
 it('handles free delivery for every order without division by zero',()=>{
  const html=render(9.9,0)
  expect(html).toContain('Доставката е безплатна!')
  expect(html).not.toContain('NaN')
 })
})
it('names the eligible couriers without claiming that a selected paid courier is free',()=>{
 const html=renderToStaticMarkup(createElement(FreeShippingProgress,{subtotal:50,threshold:39,couriers:['Спиди','BOX NOW'],selectedEligible:false}))
 expect(html).toContain('ОТКЛЮЧИ БЕЗПЛАТНА ДОСТАВКА')
 expect(html).toContain('С Спиди и BOX NOW')
 expect(html).not.toContain('Доставката е безплатна!')
})
it('does not advertise free delivery when every courier is excluded',()=>{
 expect(renderToStaticMarkup(createElement(FreeShippingProgress,{subtotal:50,threshold:39,couriers:[]}))).toBe('')
})
