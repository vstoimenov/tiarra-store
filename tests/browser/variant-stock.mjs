// Real product editor, isolated APIs: verifies per-type quantity entry on mobile and desktop.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { chromium, expect } from '@playwright/test'
const require = createRequire(import.meta.url), { build } = require(require.resolve('esbuild', { paths: [require.resolve('tsx')] }))
const root = fileURLToPath(new URL('../../', import.meta.url)), folder = await mkdtemp(join(tmpdir(), 'tiarra-variant-stock-'))
const category = { id: '11111111-1111-4111-8111-111111111111', name: 'Коса' }
const product = { id: '22222222-2222-4222-8222-222222222222', slug: 'wax', title: 'NISH MAN Серия вакса', brand: 'NISH MAN', gender: 'male', price: 10.5, compareAtPrice: null, stock: null, descriptionHtml: '', perfume: null, hidden: false, updatedAt: 'revision', categoryIds: [category.id], images: [], variants: [{ id: '33333333-3333-4333-8333-333333333333', name: 'M1', price: 10.5, compareAtPrice: null, stock: 4 }, { id: '44444444-4444-4444-8444-444444444444', name: 'M2', price: 10.5, compareAtPrice: null, stock: 7 }] }
const server = createServer(async (req, res) => {
 const file = req.url === '/bundle.js' ? 'bundle.js' : req.url === '/bundle.css' ? 'bundle.css' : null
 res.setHeader('Content-Type', file?.endsWith('.js') ? 'text/javascript' : file ? 'text/css' : 'text/html')
 res.end(file ? await readFile(join(folder, file)) : '<!doctype html><html lang="bg"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>*{box-sizing:border-box}body{margin:0;padding:16px;font-family:Arial}input,button,select,textarea{font:inherit}</style><div id="root"></div><script src="/bundle.js"></script></html>')
})
let browser
try {
 await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ProductsAdmin} from '${root}components/admin/ProductsAdmin';createRoot(document.getElementById('root')).render(<ProductsAdmin initialProducts={[${JSON.stringify(product)}]} categories={[${JSON.stringify(category)}]}/>);`, loader: 'tsx', resolveDir: root }, bundle: true, jsx: 'automatic', tsconfig: join(root, 'tsconfig.json'), outfile: join(folder, 'bundle.js'), define: { 'process.env.NODE_ENV': '"test"' }, alias: { react: join(root, 'node_modules/react'), '@': root } })
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
 browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, args: ['--no-sandbox'] })
 for (const width of [360, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } }), page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  let current = structuredClone(product), payload, conflict = false
  await page.route('**/api/admin/products', route => {
   payload = route.request().postDataJSON()
   if (conflict) return route.fulfill({ status: 409, json: { error: 'Наличността на вид е променена. Презареди продукта.' } })
   current = { ...current, ...payload, variants: payload.variants.map(variant => { const saved = { ...variant }; delete saved.expectedStock; return saved }) }
   return route.fulfill({ json: { id: current.id, slug: current.slug, updatedAt: 'next' } })
  })
  await page.route('**/api/admin/products/list', route => route.fulfill({ json: { products: [current] } }))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.getByRole('button', { name: 'Редактирай', exact: true }).click()
  const stock = name => page.getByRole('spinbutton', { name: `Наличност за ${name} (бр.)`, exact: true })
  await expect(stock('M1')).toHaveValue('4'); await expect(stock('M2')).toHaveValue('7')
  await stock('M1').fill('0'); await stock('M2').fill('9')
  await page.getByRole('button', { name: '＋ Добави вид', exact: true }).click()
  await page.getByRole('textbox', { name: 'Вид', exact: true }).nth(2).fill('M3')
  await stock('M3').fill('3')
  await page.screenshot({ path: `/tmp/tiarra-variant-stock-${width}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Запази промените', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Редакция на продукт' })).toHaveCount(0)
  assert.deepEqual(payload.variants.map(({ stock }) => stock), [0, 9, 3])
  assert.deepEqual(payload.variants.map(({ expectedStock }) => expectedStock), [4, 7, undefined])
  await page.getByRole('button', { name: 'Редактирай', exact: true }).click()
  await expect(stock('M1')).toHaveValue('0'); await expect(stock('M2')).toHaveValue('9'); await expect(stock('M3')).toHaveValue('3')
  // Unlimited is distinct from zero, and a rejected edit must preserve its draft.
  conflict = true; await stock('M2').fill('')
  await page.getByRole('button', { name: 'Запази промените', exact: true }).click()
  await expect(page.getByText('Наличността на вид е променена. Презареди продукта.', { exact: true }).first()).toBeVisible()
  await expect(stock('M2')).toHaveValue(''); assert.equal(payload.variants[1].stock, null)
  // New products show one independent quantity per type, without a shared stock input.
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: '+ Нов продукт', exact: true }).click()
  await page.getByRole('textbox', { name: 'Име на продукта', exact: true }).fill('Нова вакса')
  await page.getByRole('spinbutton', { name: 'Цена (€)', exact: true }).fill('10.5')
  await page.getByRole('checkbox', { name: 'Коса', exact: true }).check()
  for (const [index, name, quantity] of [[0, 'Черен', '2'], [1, 'Кафяв', '0']]) {
   await page.getByRole('button', { name: '＋ Добави вид', exact: true }).click()
   await page.getByRole('textbox', { name: 'Вид', exact: true }).nth(index).fill(name); await stock(name).fill(quantity)
  }
  await expect(page.getByRole('spinbutton', { name: 'Наличност', exact: true })).toHaveCount(0)
  conflict = false; await page.getByRole('button', { name: 'Запази промените', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Нов продукт', exact: true })).toHaveCount(0)
  assert.deepEqual(payload.variants.map(({ stock }) => stock), [2, 0]); assert.ok(payload.variants.every(variant => variant.expectedStock === undefined))
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); assert.deepEqual(errors, [])
  console.log(`PASS ${width}px: existing/new per-type stock, zero, unlimited, add type, persisted reload, conflict retains draft`)
  await context.close()
 }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); await rm(folder, { recursive: true, force: true }) }
