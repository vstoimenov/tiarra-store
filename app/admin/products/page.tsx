import { getAdminCategories, getAdminProducts } from '@/lib/admin/products'
import { ProductsAdmin } from '@/components/admin/ProductsAdmin'
import styles from '../bumps/page.module.css'
export const dynamic='force-dynamic'
export const metadata={title:'Продукти | Tiarra Admin'}
export default async function ProductsPage(){const [products,categories]=await Promise.all([getAdminProducts(),getAdminCategories()]);return <main className={styles.page}><header className={styles.header}><p>КАТАЛОГ</p><h1>Продукти</h1><span>Добавяй продукти и редактирай снимки, категории, описание и цени. Наличностите на съществуващите продукти се управляват в отделния раздел.</span></header><ProductsAdmin initialProducts={products} categories={categories}/></main>}
