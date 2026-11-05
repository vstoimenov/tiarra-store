import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {expect,it} from 'vitest'
import {Savings} from '@/components/product/Savings'
const render=(price:number,compareAtPrice:number|null)=>renderToStaticMarkup(createElement(Savings,{price,compareAtPrice}))
it('shows the exact currency saving including fractional cents rounding',()=>{
 expect(render(35.9,59.9)).toContain('Спестяваш 24,00 €')
 expect(render(29.9,34.9)).toContain('Спестяваш 5,00 €')
})
it('does not claim a saving without a valid positive discount',()=>{
 for(const old of [null,20,10,NaN,Infinity])expect(render(20,old)).toBe('')
})
