// Real checkout + Ordyx integration boundary, with mocked APIs. Never creates an order.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createServer} from 'node:http'
import {chromium,expect} from '@playwright/test'
const require=createRequire(import.meta.url),{build}=require(require.resolve('esbuild',{paths:[require.resolve('tsx')]}))
const root=fileURLToPath(new URL('../../',import.meta.url)),folder=await mkdtemp(join(tmpdir(),'tiarra-shipping-'))
const server=createServer(async(req,res)=>{const file=req.url==='/bundle.js'?'bundle.js':req.url==='/bundle.css'?'bundle.css':null;res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?'text/css':'text/html');res.end(file?await readFile(join(folder,file)):'<!doctype html><html lang="bg"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial}</style><div id="root"></div><script src="/bundle.js"></script></html>')})
const productId='11111111-1111-4111-8111-111111111111'
const initialSettings={googleAnalyticsId:null,googleTagManagerId:null,metaPixelId:null,freeShippingThreshold:39,econtEnabled:true,econtAddressEnabled:true,econtOfficePrice:4.5,econtAddressPrice:6.5,speedyEnabled:true,speedyAddressEnabled:true,speedyOfficePrice:3.5,speedyAddressPrice:5.5,boxnowEnabled:true,boxnowPrice:2.49,deliveryEstimate:'1–2 работни дни',dispatchHours:24,econtFreeShipping:false,speedyFreeShipping:true,boxnowFreeShipping:true}
let browser
try{
 await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {CheckoutForm} from '${root}components/cart/CheckoutForm';const settings=${JSON.stringify(initialSettings)};createRoot(document.getElementById('root')).render(<CheckoutForm settings={settings}/>);`,loader:'tsx',resolveDir:root},bundle:true,jsx:'automatic',tsconfig:join(root,'tsconfig.json'),outfile:join(folder,'bundle.js'),define:{'process.env.NODE_ENV':'"test"'},alias:{react:join(root,'node_modules/react'),'@':root},plugins:[{name:'next-fixture',setup(build){build.onResolve({filter:/^next\/(link|script)$/},args=>({path:args.path,namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='next/script'?"import {useEffect} from 'react';export default function Script({onReady}){useEffect(()=>{onReady?.()},[]);return null}":"import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}",loader:'jsx',resolveDir:root}))}}]})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']})
 for(const width of [390,1280])for(const subtotal of [20,50]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage()
  await context.addInitScript(({productId,subtotal})=>{
   localStorage.setItem('tiarra-consent-v1','essential');localStorage.setItem('tiarra-cart-v1',JSON.stringify([{key:productId+':default',productId,slug:'test-product',title:'Продукт',variantId:null,variantName:null,imagePath:null,quantity:1,unitPrice:subtotal}]))
   window.OrdyxPicker={mount(target,options){const buttons={};const methods=[['econt_office','Еконт'],['speedy_office','Спиди'],['boxnow_locker','BOX NOW']];for(const [method,name] of methods){const button=document.createElement('button');button.type='button';button.dataset.method=method;button.onclick=()=>options.onChange({type:method,officeId:'test:1',officeText:'Тестов офис',city:'София',postCode:'1000',addressText:'Тестов адрес',error:''});buttons[method]=[button,name];target.appendChild(button)}const setPrices=prices=>{window.testPrices=prices;for(const [method,[button,name]] of Object.entries(buttons))button.textContent=name+' · '+prices[method]};setPrices(options.prices);return {setPrices,destroy(){target.replaceChildren()}}}}
  },{productId,subtotal})
  let liveSettings={...initialSettings};const errors=[];page.on('pageerror',error=>errors.push(error.message));let submits=0
  await page.route('**/api/orders',route=>{submits++;return route.abort()})
  await page.route('**/api/orders/bumps',route=>route.fulfill({json:{bumps:[]}}))
  await page.route('**/api/orders/quote',route=>{const {courier}=route.request().postDataJSON();const shipping=subtotal>=39&&liveSettings[`${courier}FreeShipping`]?0:courier==='econt'?4.5:courier==='boxnow'?2.49:3.5;return route.fulfill({json:{promoCode:'',discount:0,shippingSettings:liveSettings,subtotal,shipping,total:subtotal+shipping,lines:[{productId,variantId:null,quantity:1,unitPrice:subtotal}]}})})
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await expect(page.getByRole('button',{name:'Еконт · 4,50 €',exact:true})).toBeVisible()
  const delivery=page.locator('p').filter({has:page.getByText('Доставка',{exact:true})})
  await expect(delivery).toContainText('4,50 €')
  const progress=page.locator('section[aria-label="Безплатна доставка"]')
  if(subtotal>=39){await expect(progress).toContainText('ОТКЛЮЧИ БЕЗПЛАТНА ДОСТАВКА');await expect(page.getByRole('button',{name:'Спиди · Безплатна',exact:true})).toBeVisible()}
  else await expect(progress).toContainText('19,00 €')
  await page.locator('[data-method=speedy_office]').click();await expect(delivery).toContainText(subtotal>=39?'Безплатна':'3,50 €')
  await page.locator('[data-method=boxnow_locker]').click();await expect(delivery).toContainText(subtotal>=39?'Безплатна':'2,49 €')
  if(subtotal>=39)await expect(progress).toContainText('Доставката е безплатна!')
  await expect(progress).toContainText('Спиди и BOX NOW');
  if(subtotal>=39){liveSettings={...initialSettings,econtFreeShipping:true,speedyFreeShipping:false};await page.locator('[data-method=econt_office]').click();await expect(delivery).toContainText('Безплатна');await expect(page.getByRole('button',{name:'Еконт · Безплатна',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Спиди · 3,50 €',exact:true})).toBeVisible()}
  assert.equal(submits,0);assert.deepEqual(errors,[])
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
  console.log(`PASS ${width}px subtotal=${subtotal}: Econt paid, Speedy/BOX NOW eligibility matches checkout and courier labels; no real order`)
  await context.close()
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(folder,{recursive:true,force:true})}
