import type { Metadata } from 'next'
import { OrderThankYou, type Confirmation } from '@/components/cart/OrderThankYou'

export const metadata: Metadata = {
  title: 'Преглед на благодарствената страница',
  robots: { index: false, follow: false },
}

const exampleOrder: Confirmation = {
  number: 'ПРИМЕР',
  total: 29.90,
  courier: 'econt',
  delivery: 'Примерен офис на Еконт',
  items: [{
    key: 'example', productId: 'example', slug: 'example',
    title: 'Примерен продукт', imagePath: null, variantId: null,
    variantName: null, unitPrice: 29.90, quantity: 1,
  }],
}

export default function ThankYouPreview() {
  return <main>
    <div role="note" style={{ background: '#f4e6c7', color: '#332714', textAlign: 'center', padding: '16px', fontWeight: 600 }}>
      Примерен преглед — това не е реална поръчка.
    </div>
    <OrderThankYou order={exampleOrder} />
  </main>
}
