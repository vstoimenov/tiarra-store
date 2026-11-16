import {describe,it,expect} from 'vitest'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {TruckOrderButton} from '@/components/cart/TruckOrderButton'
describe('checkout animation accessibility',()=>{
 it('keeps native form submission and announces a pending order without claiming success',()=>{
  const html=renderToStaticMarkup(createElement(TruckOrderButton,{phase:'packing',disabled:true}))
  expect(html).toContain('type="submit"');expect(html).toContain('disabled=""');expect(html).toContain('aria-label="Изпращане на поръчката…"');expect(html).toContain('aria-busy="true"')
 })
 it('announces the accepted state after the parent confirms the order',()=>{
  const html=renderToStaticMarkup(createElement(TruckOrderButton,{phase:'driving',disabled:true}))
  expect(html).toContain('aria-label="Поръчано"');expect(html).toContain('aria-busy="false"')
 })
})
