import { sql } from '@/lib/db'
export type AdminProduct={id:string;title:string;slug:string;brand:string|null;price:number;compareAtPrice:number|null;hidden:boolean;updatedAt:string;variants:{id:string;name:string;price:number;compareAtPrice:number|null}[]}
export async function getAdminProducts():Promise<AdminProduct[]>{
 return sql<AdminProduct[]>`select p.id,p.title,p.slug,p.brand,p.price::float8 as price,p.compare_at_price::float8 as "compareAtPrice",p.is_hidden as hidden,p.updated_at::text as "updatedAt",
 coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'price',v.price,'compareAtPrice',v.compare_at_price) order by v.position) from store.variants v where v.product_id=p.id),'[]') as variants from store.products p order by p.title`
}
