// Browser-only admin notification checks. All endpoints and OS push APIs are mocked.
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
const root=fileURLToPath(new URL('../../',import.meta.url)),folder=await mkdtemp(join(tmpdir(),'tiarra-notifications-'))
const server=createServer(async(req,res)=>{
 const file=req.url==='/bundle.js'?'bundle.js':req.url==='/bundle.css'?'bundle.css':null
 res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?'text/css':'text/html')
 res.end(file?await readFile(join(folder,file)):'<!doctype html><html lang="bg"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>*{box-sizing:border-box}body{margin:0;background:#eef2e7;font-family:Arial}a{color:inherit;text-decoration:none}button{font:inherit}</style><div id="root"></div><script src="/bundle.js"></script></html>')
})
let browser
try{
 await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import GlassDashboard from '${root}components/ui/adjustable-glass-dashboard';createRoot(document.getElementById('root')).render(<GlassDashboard><main><h1>Поръчки</h1></main></GlassDashboard>);`,loader:'tsx',resolveDir:root},bundle:true,jsx:'automatic',tsconfig:join(root,'tsconfig.json'),outfile:join(folder,'bundle.js'),define:{'process.env.NODE_ENV':'"test"'},alias:{react:join(root,'node_modules/react'),'@':root},plugins:[{name:'next-fixture',setup(build){build.onResolve({filter:/^next\/(link|navigation)$/},args=>({path:args.path,namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='next/navigation'?"export function usePathname(){return '/admin/orders'}":"import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}",loader:'jsx',resolveDir:root}))}}]})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']})
 for(const [width,ios,installed,available] of [[360,true,true,true],[1280,false,false,true],[390,true,false,true],[390,false,false,false]]){
  const context=await browser.newContext({viewport:{width,height:844},userAgent:ios?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1':'Mozilla/5.0 Chrome/130.0.0.0'})
  await context.addInitScript(({installed})=>{
   window.testCalls=[];let current=null
   const subscription={endpoint:'https://web.push.apple.com/test',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'key',auth:'auth'}}},async unsubscribe(){window.testCalls.push('unsubscribe');current=null;return true}}
   const registration={active:{},pushManager:{async getSubscription(){return current},async subscribe(){window.testCalls.push('subscribe');current=subscription;return current}}}
   Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{async register(){window.testCalls.push('register');return registration},async getRegistration(){return registration},addEventListener(){},removeEventListener(){}}})
   Object.defineProperty(window,'PushManager',{configurable:true,value:function(){}})
   Object.defineProperty(window,'Notification',{configurable:true,value:class{static permission='default';static async requestPermission(){window.testCalls.push('permission');this.permission='granted';return 'granted'}}})
   const match=window.matchMedia.bind(window);window.matchMedia=query=>query==='(display-mode: standalone)'?{matches:installed,media:query,addEventListener(){},removeEventListener(){}}:match(query)
  },{installed})
  const page=await context.newPage();let rows=[{orderNumber:'1',status:'new'}],registrations=0,tests=0,deletes=0
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/api/admin/orders/notifications',route=>route.fulfill({json:{orders:rows}}))
  await page.route('**/api/admin/notifications/push',route=>{
   if(route.request().method()==='POST'){registrations++;return route.fulfill({json:{ok:true}})}
   if(route.request().method()==='DELETE'){deletes++;return route.fulfill({json:{ok:true}})}
   return route.fulfill({json:{available,publicKey:Buffer.alloc(65,4).toString('base64url')}})
  })
  await page.route('**/api/admin/notifications/push/test',route=>{tests++;return route.fulfill({json:{ok:true}})})
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.waitForFunction(()=>localStorage.getItem('tiarra-admin-orders-seen-v1')?.includes('1'))
  await page.locator('button[aria-controls=admin-notifications]').click()
  assert.equal((await page.evaluate(()=>window.testCalls)).includes('permission'),false)
  if(ios&&!installed){await expect(page.getByText(/На iPhone отвори админ панела в Safari/)).toBeVisible()}
  else if(!available){await expect(page.getByRole('link',{name:'SQL за активиране'})).toBeVisible()}
  else{
   await page.getByRole('button',{name:'Включи известията',exact:true}).click()
   await expect(page.getByText('Включени на това устройство',{exact:true})).toBeVisible()
   const calls=await page.evaluate(()=>window.testCalls);assert.equal(calls.filter(value=>value==='permission').length,1);assert.ok(calls.indexOf('permission')<calls.indexOf('subscribe'));assert.equal(registrations,1)
   await page.getByRole('button',{name:'Изпрати тестово известие'}).click();await expect(page.getByText(/Тестовото известие е изпратено/)).toBeVisible();assert.equal(tests,1)
   const bounds=await page.locator('#admin-notifications').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);await page.screenshot({path:join(tmpdir(),`tiarra-admin-notifications-${width}.png`)})
   await page.getByRole('button',{name:'Изключи на това устройство'}).click();await expect(page.getByRole('button',{name:'Включи известията',exact:true})).toBeVisible();assert.equal(deletes,1)
   assert.ok((await page.evaluate(()=>window.testCalls)).includes('unsubscribe'))
  }
  await page.getByRole('button',{name:'Затвори известията'}).click()
  rows=[{orderNumber:'2',status:'new'},...rows]
  await page.evaluate(()=>window.dispatchEvent(new Event('online')))
  await expect(page.getByText('Нова поръчка №2',{exact:true})).toBeVisible()
  await page.evaluate(()=>window.dispatchEvent(new Event('online')))
  await expect(page.locator('button[aria-controls=admin-notifications]')).toHaveAttribute('aria-label','Известия: 1 нова поръчка')
  await page.getByRole('button',{name:'Скрий съобщението'}).click();await expect(page.getByText('Нова поръчка №2',{exact:true})).toHaveCount(0)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[])
  console.log(`PASS ${width}px iOS=${ios} installed=${installed} activated=${available}: permission only on tap, setup states, foreground alerts without duplicates, no overflow`)
  await context.close()
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(folder,{recursive:true,force:true})}
