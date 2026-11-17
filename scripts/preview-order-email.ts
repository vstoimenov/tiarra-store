import { writeFileSync } from 'node:fs'
import { renderOrderEmail, type OrderEmailData } from '../lib/order-email'

// Example data only. This script writes a preview and never sends email.
const sample: OrderEmailData = {
  number: 'preview-only', name: 'Мария', phone: '0888000000', email: null,
  courier: 'speedy', delivery: 'София, офис на Спиди',
  subtotal: 41.4, discount: 2.99, shipping: 0, total: 38.41,
  items: [
    { productId: 'ccd274a5-4e5e-4526-a9c7-b7f1339c92e9', title: 'YODEYMA Paris EDP Eau de Parfum For Him 100 ml — COMPLICIDAD', variant: null, quantity: 1, total: 29.9 },
    { productId: '4a3aa809-deb5-48ae-ab5b-dbf8617af037', title: 'NISH MAN Крем афтършейв No2 Arctic Blue', variant: '400 ml', quantity: 1, total: 11.5 },
  ],
}
const { html } = renderOrderEmail(sample)
writeFileSync(new URL('../emails/order-confirmation-preview.html', import.meta.url), html)
console.log('Updated emails/order-confirmation-preview.html (example data).')
