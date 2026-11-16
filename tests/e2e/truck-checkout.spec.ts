import {test,expect,type Page} from '@playwright/test'
const productId='11111111-1111-4111-8111-111111111111'
async function setup(page:Page){
 await page.setViewportSize({width:390,height:844})
 await page.addInitScript(({productId})=>{
  localStorage.setItem('tiarra-consent-v1','essential')
  localStorage.setItem('tiarra-cart-v1',JSON.stringify([{key:productId+':default',productId,slug:'test-product',title:'Тестов продукт',imagePath:null,variantId:null,variantName:null,unitPrice:20,quantity:1}]))
 },{productId})
 await page.route('https://app.ordyx.eu/checkout.js',route=>route.fulfill({contentType:'text/javascript',body:`window.OrdyxPicker={mount:function(el,opts){var button=document.createElement('button');button.type='button';button.textContent='Избери тестова доставка';button.onclick=function(){opts.onChange({type:'econt_office',officeId:'test-office',officeText:'Тестов офис',city:'София',postCode:'1000',addressText:'',error:''})};el.appendChild(button);return {setPrices:function(){},destroy:function(){el.replaceChildren()}}}};`}))
 await page.route('**/api/orders/quote',route=>route.fulfill({json:{promoCode:'',discount:0,lines:[{productId,variantId:null,quantity:1,unitPrice:20}],subtotal:20,shipping:5,total:25}}))
 await page.route('**/api/orders/bumps',route=>route.fulfill({json:{bumps:[]}}))
 await page.route('**/api/checkout/recommendations',route=>route.fulfill({json:{cards:[]}}))
 await page.goto('/store/checkout')
 await expect(page.getByRole('button',{name:'Купи сега',exact:true})).toBeEnabled()
}
async function contacts(page:Page){
 await page.locator('[name=email]').fill('checkout-test@example.invalid')
 await page.locator('[name=customerName]').fill('Тестов клиент')
 await page.locator('[name=phone]').fill('0888123456')
}
test('validates, handles errors, blocks duplicate submits and confirms only a saved order',async({page})=>{
 let requests=0;const requestIds:string[]=[];let release:()=>void=()=>{};const accepted=new Promise<void>(resolve=>{release=resolve})
 // Every order request is intercepted: this test must never create a real order.
 await page.route('**/api/orders',async route=>{
  requests++;const payload=route.request().postDataJSON();requestIds.push(payload.requestId);expect(payload.email).toBe('checkout-test@example.invalid');expect(payload.customerName).toBe('Тестов клиент')
  if(requests===1){await route.fulfill({status:500,json:{error:'Тестова грешка при запис'}});return}
  await accepted;await route.fulfill({json:{orderNumber:'TEST-123',total:25}})
 })
 await setup(page)
 const button=page.getByRole('button',{name:'Купи сега',exact:true})
 await button.click();expect(requests).toBe(0)
 await contacts(page);await button.click();await expect(page.getByText('Избери начин на доставка.',{exact:true})).toBeVisible();expect(requests).toBe(0)
 await page.getByRole('button',{name:'Избери тестова доставка'}).click()
 await button.click();await expect(page.getByText('Тестова грешка при запис')).toBeVisible();await expect(button).toBeEnabled()
 await button.click();await expect(page.getByRole('button',{name:'Изпращане на поръчката…'})).toBeDisabled()
 await page.locator('form').filter({has:page.locator('[name=customerName]')}).evaluate(form=>{(form as HTMLFormElement).requestSubmit();(form as HTMLFormElement).requestSubmit()})
 await expect.poll(()=>requests).toBe(2);expect(requestIds[0]).toBe(requestIds[1]);await expect(page.getByRole('button',{name:'Поръчано',exact:true})).toHaveCount(0)
 release();await expect(page.locator('button[data-phase=truck]')).toBeVisible()
 await expect(page.locator('button[data-phase=driving]')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false)
 await expect(page.locator('#order-confirmation-heading')).toBeVisible();await expect(page.getByText('№ TEST-123',{exact:true})).toBeVisible()
 expect(requests).toBe(2);expect(await page.evaluate(()=>localStorage.getItem('tiarra-cart-v1'))).toBe('[]')
})
test('respects reduced motion and opens confirmation without animation delays',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.route('**/api/orders',route=>route.fulfill({json:{orderNumber:'TEST-REDUCED',total:25}}))
 await setup(page);await contacts(page);await page.getByRole('button',{name:'Избери тестова доставка'}).click()
 await page.getByRole('button',{name:'Купи сега',exact:true}).click()
 await expect(page.locator('#order-confirmation-heading')).toBeVisible({timeout:1500})
})
