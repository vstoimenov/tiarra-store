import { sql } from '@/lib/db'
export const dynamic='force-dynamic'
export async function GET(){
 const orders=await sql<{orderNumber:string;status:string}[]>`select order_number::text as "orderNumber",status from store.orders order by created_at desc,order_number desc limit 50`
 return Response.json({orders},{headers:{'Cache-Control':'no-store'}})
}
