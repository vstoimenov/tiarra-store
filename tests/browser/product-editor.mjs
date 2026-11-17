// Run with `node tests/browser/product-editor.mjs`. Uses the real React editor and mocked
// endpoints on a temporary local server: no login, database, upload or product is changed.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { chromium, expect } from '@playwright/test'
const require = createRequire(import.meta.url)
const { build } = require(require.resolve('esbuild', { paths: [require.resolve('tsx')] }))
const root = fileURLToPath(new URL('../../', import.meta.url))
const folder = await mkdtemp(join(tmpdir(), 'tiarra-product-editor-'))
const perfume = '11111111-1111-4111-8111-111111111111'
const hair = '22222222-2222-4222-8222-222222222222'
const image = { path:'https://images.test/product.png',alt:'',width:10,height:10 }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
let browser
const server = createServer(async(req,res) => {
 try { const file = req.url === '/bundle.js' ? 'bundle.js' : req.url === '/bundle.css' ? 'bundle.css' : null
  res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?'text/css':'text/html')
  res.end(file?await readFile(join(folder,file)):'<!doctype html><html lang="bg"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>*{box-sizing:border-box}body{margin:0;padding:16px;font-family:Arial}input,button,select,textarea{font:inherit}</style><div id="root"></div><script src="/bundle.js"></script></html>')
 }catch{res.writeHead(500);res.end('Fixture failed')}
})
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done});return {promise,resolve}}
try {
 await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {ProductsAdmin} from '${root}components/admin/ProductsAdmin';createRoot(document.getElementById('root')).render(<ProductsAdmin createNew initialProducts={[]} categories={[{id:'${perfume}',name:'Парфюми'},{id:'${hair}',name:'Грижа за коса'}]}/>);`,loader:'tsx',resolveDir:root},bundle:true,jsx:'automatic',tsconfig:join(root,'tsconfig.json'),outfile:join(folder,'bundle.js'),define:{'process.env.NODE_ENV':'"test"'},alias:{react:join(root,'node_modules/react'),'@':root}})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']})
 for(const width of [360,1280]) {
  const context=await browser.newContext({viewport:{width,height:900}})
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.route('https://images.test/**',route=>route.fulfill({contentType:'image/png',body:png}))
  let payload
  await page.route('**/api/admin/products',route=>{payload=route.request().postDataJSON();return route.fulfill({json:{id:crypto.randomUUID(),slug:'test'}})})
  await page.route('**/api/admin/products/list',route=>route.fulfill({json:{products:[]}}))
  const goto=()=>page.goto(`http://127.0.0.1:${server.address().port}`)
  const checkbox=name=>page.getByRole('checkbox',{name,exact:true})
  const title=()=>page.getByLabel('Име на продукта',{exact:true})
  const uploadStarted=deferred(),releaseUpload=deferred()
  await page.route('**/api/admin/products/upload',async route=>{uploadStarted.resolve();await releaseUpload.promise;await route.fulfill({json:image})})
  await goto();await checkbox('Парфюми').check()
  await page.getByLabel('Качи снимка').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});await uploadStarted.promise
  await expect(page.getByRole('button',{name:'Изчакай качването…',exact:true})).toBeDisabled()
  await checkbox('Парфюми').uncheck();await checkbox('Грижа за коса').check();await title().fill('SIEM шампоан')
  await page.getByLabel('Цена (€)',{exact:true}).fill('20')
  releaseUpload.resolve();await page.getByText('Качване…',{exact:true}).waitFor({state:'hidden'})
  await expect(checkbox('Парфюми')).not.toBeChecked();await expect(checkbox('Грижа за коса')).toBeChecked();await expect(title()).toHaveValue('SIEM шампоан')
  await page.getByRole('button',{name:'Запази промените',exact:true}).click()
  await page.getByText('Продуктът е записан и е видим в магазина.',{exact:true}).waitFor()
  assert.deepEqual(payload.categoryIds,[hair]);assert.equal(payload.title,'SIEM шампоан');assert.equal(payload.images.length,1)
  // A late upload from a previous product must not contaminate the next product.
  const oldStarted=deferred(),oldRelease=deferred(),oldFinished=deferred()
  await page.unroute('**/api/admin/products/upload')
  await page.route('**/api/admin/products/upload',async route=>{oldStarted.resolve();await oldRelease.promise;await route.fulfill({json:image});oldFinished.resolve()})
  await goto();await checkbox('Парфюми').check()
  await page.getByLabel('Качи снимка').setInputFiles({name:'old.png',mimeType:'image/png',buffer:png});await oldStarted.promise
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'+ Нов продукт',exact:true}).click()
  await checkbox('Грижа за коса').check();await title().fill('Друг шампоан');oldRelease.resolve();await oldFinished.promise;await page.waitForLoadState('networkidle')
  await expect(title()).toHaveValue('Друг шампоан');await expect(checkbox('Парфюми')).not.toBeChecked();await expect(checkbox('Грижа за коса')).toBeChecked();await expect(page.getByLabel('Описание на снимката',{exact:true})).toHaveCount(0)
  // Category creation can finish after the merchant has edited other fields and selections.
  const categoryStarted=deferred(),categoryRelease=deferred()
  await page.route('**/api/admin/categories',async route=>{categoryStarted.resolve();await categoryRelease.promise;await route.fulfill({json:{category:{id:'33333333-3333-4333-8333-333333333333',name:'Нова категория'}}})})
  await page.getByRole('button',{name:'＋ Нова категория',exact:true}).click();await page.getByLabel('Име на категорията',{exact:true}).fill('Нова категория')
  await page.getByRole('button',{name:'Добави категория',exact:true}).click();await categoryStarted.promise
  await title().fill('Запази този текст');await checkbox('Грижа за коса').uncheck();categoryRelease.resolve()
  await expect(checkbox('Нова категория')).toBeChecked();await expect(checkbox('Грижа за коса')).not.toBeChecked();await expect(title()).toHaveValue('Запази този текст')
  // Decode of a URL image also finishes asynchronously and must keep the latest draft.
  const imageStarted=deferred(),imageRelease=deferred()
  await page.route('https://images.test/delayed.png',async route=>{imageStarted.resolve();await imageRelease.promise;await route.fulfill({contentType:'image/png',body:png})})
  await page.getByPlaceholder('Или постави публичен линк към снимка').fill('https://images.test/delayed.png')
  await page.getByRole('button',{name:'Добави линк',exact:true}).click();await imageStarted.promise
  await title().fill('Текст по време на зареждане');await checkbox('Грижа за коса').check();imageRelease.resolve()
  await expect(page.getByLabel('Описание на снимката',{exact:true})).toHaveCount(1)
  await expect(title()).toHaveValue('Текст по време на зареждане');await expect(checkbox('Грижа за коса')).toBeChecked();await expect(checkbox('Парфюми')).not.toBeChecked()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[])
  console.log(`PASS ${width}px: upload preserves category/text; payload uses chosen category; new drafts ignore late uploads; category creation preserves edits`)
  await context.close()
 }
}finally {await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(folder,{recursive:true,force:true})}
