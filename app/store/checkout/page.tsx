import type { Metadata } from 'next'
import { CheckoutForm } from '@/components/cart/CheckoutForm'
import styles from '@/components/cart/CheckoutForm.module.css'

export const metadata: Metadata = { title: 'Завършване на поръчката | Tiarra Cosmetics', robots: { index: false, follow: false } }

export default function CheckoutPage() {
  return <div className={styles.page}><div className={styles.intro}><span>TIARRA COSMETICS / CHECKOUT</span><h1>Последната стъпка<br /><em>към твоя ритуал.</em></h1><p>Бърза поръчка, удобна доставка и грижа във всеки детайл.</p></div><CheckoutForm /></div>
}
