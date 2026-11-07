import type { Metadata } from 'next'
import { CheckoutForm } from '@/components/cart/CheckoutForm'
import styles from '@/components/cart/CheckoutForm.module.css'
import { getCommerceSettings } from '@/lib/commerce-settings'

export const metadata: Metadata = { title: 'Завършване на поръчката | Tiarra Cosmetics', robots: { index: false, follow: false } }

export default async function CheckoutPage() {
  const settings=await getCommerceSettings()
  return <div className={styles.page}><CheckoutForm settings={settings}/></div>
}
