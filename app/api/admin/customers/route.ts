import { customerFilter,customersCsv,filterCustomers,getCustomers } from '@/lib/admin/customers'
export const dynamic='force-dynamic'
// All /api/admin routes require an authenticated admin session in middleware.
export async function GET(request:Request){
 const url=new URL(request.url)
 const rows=filterCustomers(await getCustomers(),(url.searchParams.get('q')??'').slice(0,200),customerFilter(url.searchParams.get('filter')??undefined))
 return new Response(customersCsv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="customers.csv"','Cache-Control':'private, no-store'}})
}
