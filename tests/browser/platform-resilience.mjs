// Actual storefront/admin components, isolated HTTP fixtures and intercepted trackers.
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
const root=fileURLToPath(new URL('../../',import.meta.url)),folder=await mkdtemp(join(tmpdir(),'tiarra-resilience-'))
const server=createServer(async(req,res)=>{const file=req.url==='/bundle.js'?'bundle.js':req.url==='/bundle.css'?'bundle.css':null;res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?'text/css':'text/html');res.end(file?await readFile(join(folder,file)):'<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')})
let browser
try{
 await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Analytics} from '${root}components/analytics/Analytics';import {ProductView} from '${root}components/product/ProductView';import {CartClient} from '${root}components/cart/CartClient';import {OrdersAdmin} from '${root}components/admin/OrdersAdmin';import {BumpAdmin} from '${root}components/admin/BumpAdmin';import {addCartItem,readCart} from '${root}lib/cart';
 const product={id:'11111111-1111-4111-8111-111111111111',slug:'test',title:'Тестов парфюм',brand:'YODEYMA',gender:'unisex',price:20,compareAtPrice:null,stock:10,inStock:true,hasVariants:false,categorySlugs:[],createdAt:'2026-11-17T12:00:00Z',images:[],variants:[],categories:[],descriptionHtml:'',perfume:null,optionName:null};
 const item={key:product.id+':default',productId:product.id,slug:product.slug,title:product.title,unitPrice:20,quantity:1,variantId:null,variantName:null,imagePath:null};window.addTestItem=()=>addCartItem(item);window.readTestCart=readCart;
 const settings={freeShippingThreshold:39,econtEnabled:true,econtFreeShipping:false,speedyEnabled:true,speedyFreeShipping:true,boxnowEnabled:true,boxnowFreeShipping:true};
 const order={orderNumber:'16',customerName:'Тестов клиент',phone:'0888123456',email:'test@example.invalid',status:'new',createdAt:'2026-11-17T12:00:00Z',updatedAt:'2026-11-17T12:00:00Z',total:20,subtotal:16.5,shipping:3.5,courier:'speedy',deliveryType:'office',officeId:'1',city:'София',postCode:'1000',deliveryAddress:'Тестов офис',internalNotes:'',trackingNumber:'',trackingUrl:'',notes:'',ordyxStatus:'pending',ordyxError:null,promoCode:null,discountAmount:0,items:[]};
 const mode=new URLSearchParams(location.search).get('mode');function App(){const [path,setPath]=React.useState(location.pathname);window.navigateTest=next=>{history.pushState({},'',next);setPath(next);window.dispatchEvent(new Event('popstate'))};return mode==='admin'?<><OrdersAdmin initialOrders={[order]}/><BumpAdmin initialProducts={[product]} initialMappings={[]}/></>:mode==='cart'?<CartClient settings={settings}/>:<><Analytics googleAnalyticsId={null} googleTagManagerId={null} metaPixelId="1323162773274454"/><ProductView key={path} product={{...product,id:path==='/'?product.id:'22222222-2222-4222-8222-222222222222'}} breadcrumbs={null}/></>};createRoot(document.getElementById('root')).render(<App/>);`,loader:'tsx',resolveDir:root},bundle:true,jsx:'automatic',tsconfig:join(root,'tsconfig.json'),outfile:join(folder,'bundle.js'),define:{'process.env.NODE_ENV':'"test"'},alias:{react:join(root,'node_modules/react'),'@':root},plugins:[{name:'next-fixture',setup(build){build.onResolve({filter:/^next\/(link|script|navigation)$/},args=>({path:args.path,namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='next/navigation'?`import {useSyncExternalStore} from 'react';const subscribe=notify=>{window.addEventListener('popstate',notify);return ()=>window.removeEventListener('popstate',notify)};export function usePathname(){return useSyncExternalStore(subscribe,()=>location.pathname)};export function useRouter(){return {refresh(){}}}`:args.path==='next/script'?`import {useEffect} from 'react';const seen=new Set();export default function Script({id,src,children,onReady}){useEffect(()=>{const key=id||src;if(!seen.has(key)){seen.add(key);const node=document.createElement('script');if(id)node.id=id;if(src){node.src=src;node.async=true;node.onload=()=>onReady?.()}else node.textContent=children;document.head.appendChild(node);if(!src)onReady?.()}else onReady?.()},[id,src]);return null}`:"import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}",loader:'jsx',resolveDir:root}))}}]})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox']})
 const url=`http://127.0.0.1:${server.address().port}`
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('https://connect.facebook.net/**',route=>route.fulfill({contentType:'text/javascript',body:'window.metaEvents=window.fbq.queue.map(args=>Array.from(args));window.fbq.callMethod=function(...args){window.metaEvents.push(args)}'}))
  await page.route('**/api/checkout/recommendations',route=>route.fulfill({json:{cards:[]}}))
  await page.goto(url)
  assert.equal(await page.evaluate(()=>typeof window.fbq),'undefined')
  await page.getByRole('button',{name:'Приемам',exact:true}).click()
  await expect.poll(()=>page.evaluate(()=>window.metaEvents?.filter(args=>args[1]==='PageView').length)).toBe(1)
  await expect.poll(()=>page.evaluate(()=>window.metaEvents?.filter(args=>args[1]==='ViewContent').length)).toBe(1)
  await page.evaluate(()=>window.navigateTest('/store/second'))
  await expect.poll(()=>page.evaluate(()=>window.metaEvents.filter(args=>args[1]==='PageView').length)).toBe(2)
  await expect.poll(()=>page.evaluate(()=>window.metaEvents.filter(args=>args[1]==='ViewContent').length)).toBe(2)
  await page.evaluate(()=>window.dispatchEvent(new Event('tiarra-consent-updated')))
  assert.equal(await page.evaluate(()=>window.metaEvents.filter(args=>args[1]==='ViewContent').length),2)
  assert.equal(await page.locator('script[src*="connect.facebook.net"]').count(),1)
  // Cart follows another tab's edits and reconnect/focus; does not retain removed items.
  await page.goto(url+'?mode=cart');await expect(page.getByText('Количката ти е празна.')).toBeVisible()
  await page.evaluate(()=>window.addTestItem());await expect(page.getByRole('link',{name:'Тестов парфюм',exact:true})).toBeVisible()
  await page.evaluate(()=>{localStorage.setItem('tiarra-cart-v1','[]');window.dispatchEvent(new StorageEvent('storage',{key:'tiarra-cart-v1'}))})
  await expect(page.getByText('Количката ти е празна.')).toBeVisible()
  // Reject all admin mutations to exercise retryable failures without creating anything.
  await page.route('**/api/admin/**',route=>route.abort('failed'))
  await page.goto(url+'?mode=admin')
  await page.getByRole('textbox',{name:'Вътрешна бележка'}).fill('Запази тази бележка')
  await page.getByRole('button',{name:'Запази данните',exact:true}).click()
  await expect(page.getByRole('status').filter({hasText:'Няма връзка със сървъра.'})).toBeVisible()
  await expect(page.getByRole('textbox',{name:'Вътрешна бележка'})).toHaveValue('Запази тази бележка')
  await page.getByRole('button',{name:'Повтори Ordyx'}).click();await expect(page.getByRole('status').filter({hasText:'Опитай Ordyx отново.'})).toBeVisible()
  await page.getByRole('button',{name:'Потвърди',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Презареди, за да провериш статуса'})).toBeVisible()
  await page.getByRole('button',{name:'Запази bump-а'}).click();await expect(page.getByRole('status').filter({hasText:'изборът ти е запазен тук'})).toBeVisible()
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: consented product view, SPA Meta PageViews once, live cart, admin offline failures retain drafts`);await context.close()
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(folder,{recursive:true,force:true})}
