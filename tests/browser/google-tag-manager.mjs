// Runs the real consent component; Google requests are intercepted, never sent.
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
const root=fileURLToPath(new URL('../../',import.meta.url)),folder=await mkdtemp(join(tmpdir(),'tiarra-gtm-'))
const server=createServer(async(req,res)=>{const file=req.url==='/bundle.js'?'bundle.js':req.url==='/bundle.css'?'bundle.css':null;res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?'text/css':'text/html');res.end(file?await readFile(join(folder,file)):'<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')})
let browser
try{
 await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Analytics} from '${root}components/analytics/Analytics';import {GOOGLE_CONSENT_DEFAULT,DEFAULT_GTM_ID,googleTagManagerScript} from '${root}lib/google-tags';const boot=document.createElement('script');boot.textContent=GOOGLE_CONSENT_DEFAULT;document.head.appendChild(boot);window.repeatBootstrap=()=>{const script=document.createElement('script');script.textContent=googleTagManagerScript(DEFAULT_GTM_ID);document.head.appendChild(script)};const ga=new URLSearchParams(location.search).has('ga');createRoot(document.getElementById('root')).render(<Analytics googleAnalyticsId="G-TEST12345" googleTagManagerId={ga?null:DEFAULT_GTM_ID} metaPixelId={null}/>);`,loader:'tsx',resolveDir:root},bundle:true,jsx:'automatic',tsconfig:join(root,'tsconfig.json'),outfile:join(folder,'bundle.js'),define:{'process.env.NODE_ENV':'"test"'},alias:{react:join(root,'node_modules/react'),'@':root},plugins:[{name:'next-fixture',setup(build){build.onResolve({filter:/^next\/(link|script|navigation)$/},args=>({path:args.path,namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='next/navigation'?"export function usePathname(){return location.pathname}":args.path==='next/script'?`import {useEffect} from 'react';const seen=new Set();export default function Script({id,src,children}){useEffect(()=>{const key=id||src;if(seen.has(key))return;seen.add(key);const node=document.createElement('script');if(id)node.id=id;if(src){node.src=src;node.async=true}else node.textContent=children;document.body.appendChild(node)},[id,src,children]);return null}`:"import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}",loader:'jsx',resolveDir:root}))}}]})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox']})
 for(const choice of ['first-accept','essential','accepted','ga4']){
  const context=await browser.newContext({viewport:{width:390,height:844}})
  if(choice==='accepted'||choice==='essential'||choice==='ga4')await context.addInitScript(value=>localStorage.setItem('tiarra-consent-v1',value),choice==='essential'?'essential':'accepted')
  const page=await context.newPage(),requests=[],states=[],errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('https://www.googletagmanager.com/**',async route=>{requests.push(route.request().url());states.push(await page.evaluate(()=>window.dataLayer.map(entry=>entry?.event?entry:Array.from(entry))));await route.fulfill({contentType:'text/javascript',body:'window.testGoogleLoaded=true'})})
  await page.goto(`http://127.0.0.1:${server.address().port}/${choice==='ga4'?'?ga=1':''}`)
  if(choice==='first-accept'){await expect(page.getByRole('button',{name:'Приемам',exact:true})).toBeVisible();assert.equal(requests.length,0);await page.getByRole('button',{name:'Приемам',exact:true}).click()}
  if(choice==='essential'){await page.waitForTimeout(300);assert.equal(requests.length,0)}
  else{
   await page.waitForFunction(()=>window.testGoogleLoaded===true)
   assert.equal(requests.length,1)
   assert.ok(states[0].some(command=>command[0]==='consent'&&command[1]==='default'&&command[2].ad_storage==='denied'))
   assert.ok(states[0].some(command=>command[0]==='consent'&&command[1]==='update'&&['analytics_storage','ad_storage','ad_user_data','ad_personalization'].every(key=>command[2][key]==='granted')))
   if(choice==='first-accept'){const grant=states[0].findIndex(command=>command[0]==='consent'&&command[1]==='update');const trigger=states[0].findIndex(command=>command.event==='consent_update');assert.ok(grant<trigger)}
   if(choice==='ga4'){assert.ok(requests[0].includes('/gtag/js?id=G-TEST12345'));assert.ok(!requests[0].includes('/gtm.js'))}
   else{assert.equal(requests[0],'https://www.googletagmanager.com/gtm.js?id=GTM-MXBFWH5L');assert.equal(await page.locator('head script[src="https://www.googletagmanager.com/gtm.js?id=GTM-MXBFWH5L"]').count(),1);await page.evaluate(()=>{window.repeatBootstrap();window.repeatBootstrap()});await page.waitForTimeout(100);assert.equal(requests.length,1);assert.equal(await page.locator('script[src*="/gtag/js"]').count(),0)}
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${choice}: consent order, requested container, one head loader, no duplicate direct GA4`);await context.close()
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(folder,{recursive:true,force:true})}
