// Promo usage visibility and refresh checks with mocked data; no production writes.
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
const root=fileURLToPath(new URL('../../',import.meta.url)),folder=await mkdtemp(join(tmpdir(),'tiarra-promos-'))
const server=createServer(async(req,res)=>{const file=req.url==='/bundle.js'?'bundle.js':req.url==='/bundle.css'?'bundle.css':null;res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?'text/css':'text/html');res.end(file?await readFile(join(folder,file)):'<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>*{box-sizing:border-box}body{margin:0;background:#f4f2ec;font-family:Arial}main{max-width:1100px;margin:auto;padding:16px}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')})
let browser
try{
 await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {PromoAdmin} from '${root}components/admin/PromoAdmin';const base={kind:'percent',value:10,minSubtotal:0,expiresAt:null,maxUses:null,uses:0,active:true,brands:[]};window.serverPromos=[{...base,code:'ZERO'},{...base,code:'LIMITED',uses:7,maxUses:10},{...base,code:'LONG_PROMOTION_CODE_12345678900000',uses:1234,active:false,brands:['Много дълга марка за проверка на мобилния изглед']}];function App(){const [promos,setPromos]=React.useState(window.serverPromos);window.refreshPromos=()=>setPromos(structuredClone(window.serverPromos));return <main><PromoAdmin initialPromos={promos} brands={['YODEYMA','CHOGAN']}/></main>};createRoot(document.getElementById('root')).render(<App/>);`,loader:'tsx',resolveDir:root},bundle:true,jsx:'automatic',tsconfig:join(root,'tsconfig.json'),outfile:join(folder,'bundle.js'),define:{'process.env.NODE_ENV':'"test"'},alias:{react:join(root,'node_modules/react'),'@':root},plugins:[{name:'next-fixture',setup(build){build.onResolve({filter:/^next\/navigation$/},args=>({path:args.path,namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export function useRouter(){return {refresh(){window.refreshPromos()}}}',loader:'js',resolveDir:root}))}}]})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox']})
 for(const width of [360,1280]){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install()
  let submitted
  await page.route('**/api/admin/promos',async route=>{submitted=route.request().postDataJSON();const promos=await page.evaluate(data=>{window.serverPromos=window.serverPromos.map(p=>p.code===data.code?{...p,...data}:p);return window.serverPromos},submitted);return route.fulfill({json:{promos}})})
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const counter=code=>page.getByRole('group',{name:`Използвания за ${code}`,exact:true})
  await expect(counter('ZERO').locator('strong')).toHaveText('0');await expect(counter('ZERO')).toContainText('Без лимит')
  await expect(counter('LIMITED').locator('strong')).toHaveText('7');await expect(counter('LIMITED')).toContainText('Лимит: 10')
  await expect(counter('LONG_PROMOTION_CODE_12345678900000').locator('strong')).toHaveText(/1\s?234/)
  await page.getByRole('article',{name:'Промокод LIMITED',exact:true}).getByRole('button',{name:'Редактирай'}).click()
  await page.getByRole('spinbutton',{name:'Размер на отстъпката',exact:true}).fill('25')
  await page.evaluate(()=>{window.serverPromos.find(p=>p.code==='LIMITED').uses=8})
  await page.clock.runFor(30_001)
  await expect(counter('LIMITED').locator('strong')).toHaveText('8');await expect(page.getByRole('spinbutton',{name:'Размер на отстъпката',exact:true})).toHaveValue('25')
  await expect(page.getByRole('heading',{name:'Редакция на LIMITED',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Запази промокода',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Промокодът е записан.')
  await expect(counter('LIMITED').locator('strong')).toHaveText('8');assert.equal(submitted.uses,undefined);assert.equal(submitted.value,25)
  await page.getByRole('heading',{name:'Създадени кодове'}).scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/tiarra-promo-usage-${width}.png`,fullPage:true})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[])
  console.log(`PASS ${width}px: visible counts including zero/stopped codes, limit, live refresh, editor preserved, save does not reset uses, no overflow`);await context.close()
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(folder,{recursive:true,force:true})}
