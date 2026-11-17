// Real admin components, mocked read-only data: never creates production orders.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createServer} from 'node:http'
import {chromium,expect} from '@playwright/test'
const require=createRequire(import.meta.url)
const {build}=require(require.resolve('esbuild',{paths:[require.resolve('tsx')]}))
const root=fileURLToPath(new URL('../../',import.meta.url)),folder=await mkdtemp(join(tmpdir(),'tiarra-live-orders-'))
const server=createServer(async(req,res)=>{
 const file=req.url==='/bundle.js'?'bundle.js':req.url==='/bundle.css'?'bundle.css':null
 res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?'text/css':'text/html')
 res.end(file?await readFile(join(folder,file)):'<!doctype html><html lang="bg"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial}main{max-width:1100px;margin:auto;padding:16px}input,button,select{font:inherit}</style><div id="root"></div><script src="/bundle.js"></script></html>')
})
let browser
try{
 await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {GlassOverview} from '${root}components/admin/GlassOverview';import {AnalyticsPanel} from '${root}components/admin/AnalyticsPanel';import {OrdersAdmin} from '${root}components/admin/OrdersAdmin';
 const order=n=>({orderNumber:String(n),customerName:'Клиент '+n,phone:'0899999999',email:'test@example.com',status:'new',createdAt:'2026-11-17T12:00:00Z',updatedAt:'2026-11-17T12:00:00Z',total:20,subtotal:16.5,shipping:3.5,courier:'speedy',deliveryType:'office',officeId:'1',city:'София',postCode:'1000',deliveryAddress:'Тестов офис',internalNotes:'',trackingNumber:'',trackingUrl:'',notes:'',ordyxStatus:'pending',ordyxError:null,promoCode:null,discountAmount:0,items:[]});
 window.serverOrders=[order(1)];window.addServerOrder=n=>window.serverOrders.unshift(order(n));
 function App(){const [orders,setOrders]=React.useState(()=>structuredClone(window.serverOrders));window.refreshMock=()=>{window.refreshes=(window.refreshes??0)+1;setOrders(structuredClone(window.serverOrders))};return <main><div id="overview"><GlassOverview stats={{today:orders.length,value:orders.length*20,new_orders:orders.length,sync_errors:0,products:1,low_stock:0}} daily={[]} recent={orders.map(o=>({number:o.orderNumber,customer:o.customerName,status:o.status,total:o.total}))}/></div><div id="orders"><OrdersAdmin initialOrders={orders}/></div><div id="analytics"><AnalyticsPanel/></div></main>};createRoot(document.getElementById('root')).render(<App/>);`,loader:'tsx',resolveDir:root},bundle:true,jsx:'automatic',tsconfig:join(root,'tsconfig.json'),outfile:join(folder,'bundle.js'),define:{'process.env.NODE_ENV':'"test"'},alias:{react:join(root,'node_modules/react'),'@':root},plugins:[{name:'next-fixture',setup(build){build.onResolve({filter:/^next\/(link|navigation)$/},args=>({path:args.path,namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='next/navigation'?"export function useRouter(){return {refresh(){window.refreshMock()}}}":"import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}",loader:'jsx',resolveDir:root}))}}]})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']})
 for(const width of [360,1280]){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage()
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.clock.install({time:new Date('2026-11-17T21:59:00Z')})
  let count=1,offline=false,requests=[]
  await page.route('**/api/admin/analytics?*',route=>{
   requests.push(route.request().url())
   return route.fulfill(offline?{status:503,json:{error:'Временно няма връзка.'}}:{json:{sessions:3,visitors:3,pageViews:4,orders:count,trackedOrders:0,conversionRate:0,averageOrder:20,orderValue:20*count,bumpOrders:0,bumpValue:0,upsellOrders:0,upsellValue:0,days:[],topProducts:[]}})
  })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const orderCount=()=>page.locator('#orders').getByText(/^\d+ поръчки$/)
  const analyticCount=()=>page.locator('#analytics div').filter({has:page.locator('span').filter({hasText:/^Поръчки$/})}).filter({has:page.locator('strong')}).last().locator('strong')
  await expect(orderCount()).toHaveText('1 поръчки');await expect(analyticCount()).toHaveText('1')
  count=2;await page.evaluate(()=>window.addServerOrder(2));await page.clock.runFor(30_001)
  await expect(orderCount()).toHaveText('2 поръчки');await expect(analyticCount()).toHaveText('2')
  await expect(page.locator('#overview').getByRole('link',{name:/Поръчки днес/})).toContainText('2')
  // An already-open order list receives new props, without resetting its filter.
  await page.locator('#orders').getByRole('textbox',{name:'Търсене'}).fill('Клиент 3')
  count=3;await page.evaluate(()=>{window.addServerOrder(3);window.dispatchEvent(new Event('tiarra-orders-changed'))})
  await expect(orderCount()).toHaveText('1 поръчки');await expect(page.locator('#orders').getByRole('heading',{name:'Клиент 3'})).toBeVisible();await expect(analyticCount()).toHaveText('3')
  await page.locator('#orders').getByRole('textbox',{name:'Търсене'}).fill('')
  // Preserve unsaved internal notes, including an in-flight server refresh.
  const notes=page.locator('#orders article').filter({has:page.getByRole('heading',{name:'Клиент 3',exact:true})}).getByRole('textbox',{name:'Вътрешна бележка'})
  await notes.fill('Не губи тази бележка')
  await page.evaluate(()=>{window.addServerOrder(4);window.refreshMock()})
  await expect(orderCount()).toHaveText('4 поръчки');await expect(notes).toHaveValue('Не губи тази бележка')
  // Full editor draft is protected, then refresh resumes after closing it.
  await notes.fill('');await page.locator('#orders').getByRole('button',{name:'Редактирай поръчката'}).first().click()
  const editor=page.locator('#orders').getByRole('textbox',{name:'Име и фамилия',exact:true})
  await editor.fill('Редактиран клиент')
  await page.clock.runFor(30_001)
  await expect(editor).toHaveValue('Редактиран клиент')
  page.once('dialog',dialog=>dialog.accept())
  await page.locator('#orders').getByRole('button',{name:'Отказ',exact:true}).click()
  count=5;await page.evaluate(()=>{window.addServerOrder(5);window.dispatchEvent(new Event('online'))})
  await expect(orderCount()).toHaveText('5 поръчки');await expect(analyticCount()).toHaveText('5')
  // Local Sofia midnight updates "Today" in an app left open overnight.
  await page.clock.runFor(60_001)
  await expect.poll(()=>requests.at(-1)).toContain('from=2026-11-18&to=2026-11-18')
  // A failed refresh shows an error and retains the last known figures.
  offline=true;await page.evaluate(()=>window.dispatchEvent(new Event('online')))
  await expect(page.getByRole('alert')).toHaveText('Временно няма връзка.');await expect(analyticCount()).toHaveText('5')
  offline=false;count=6;await page.evaluate(()=>window.dispatchEvent(new Event('online')))
  await expect(analyticCount()).toHaveText('6');await expect(page.getByRole('alert')).toHaveCount(0)
  // Background timers do not query; returning to the foreground queries at once.
  await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'}))
  const beforeHidden=requests.length;await page.clock.runFor(60_001);assert.equal(requests.length,beforeHidden)
  count=7;await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))})
  await expect(analyticCount()).toHaveText('7')
  assert.deepEqual(errors,[])
  console.log(`PASS ${width}px: new orders/counts refresh, filters and unsaved drafts survive, Sofia midnight, reconnect, background pause, error recovery`)
  await context.close()
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(folder,{recursive:true,force:true})}
