import { getAdminProducts } from '@/lib/admin/products'
import { ProductsAdmin } from '@/components/admin/ProductsAdmin'
import styles from '../bumps/page.module.css'
export const dynamic='force-dynamic'
export const metadata={title:'Продукти | Tiarra Admin'}
export default async function ProductsPage(){return <main className={styles.page}><header className={styles.header}><p>КАТАЛОГ</p><h1>Продукти</h1><span>Редактирай имена, марки, цени и видимост. Наличностите се управляват в отделния раздел.</span></header><ProductsAdmin initialProducts={await getAdminProducts()}/></main>}
