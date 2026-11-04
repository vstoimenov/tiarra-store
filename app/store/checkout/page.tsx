import type { Metadata } from 'next'
import { CheckoutForm } from '@/components/cart/CheckoutForm'
import styles from '@/components/cart/CheckoutForm.module.css'
import { getProductCards, getProductBySlug } from '@/lib/catalog/queries'

export const metadata: Metadata = { title: 'Завършване на поръчката | Tiarra Cosmetics', robots: { index: false, follow: false } }

export default async function CheckoutPage() {
  const cards = (await getProductCards()).filter(card => card.inStock && !card.hasVariants && card.price <= 25).slice(0, 3)
  const bumps = (await Promise.all(cards.map(card => getProductBySlug(card.slug)))).filter(product => product !== null).map(product => ({
    productId: product.id, slug: product.slug, title: product.title, imagePath: product.imagePath,
    unitPrice: product.price,
  }))
  return <div className={styles.page}><div className={styles.intro}><span>TIARRA COSMETICS / CHECKOUT</span><h1>Последната стъпка<br /><em>към твоя ритуал.</em></h1><p>Бърза поръчка, удобна доставка и грижа във всеки детайл.</p></div><CheckoutForm bumps={bumps} /></div>
}
