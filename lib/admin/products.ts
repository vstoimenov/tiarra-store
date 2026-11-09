import type { Perfume } from '@/lib/catalog/types'
import { sql } from '@/lib/db'
export type AdminImage={id?:string;path:string;alt:string;width:number;height:number}
export type AdminProduct={id:string;title:string;slug:string;brand:string|null;gender:'female'|'male'|'unisex';price:number;compareAtPrice:number|null;stock:number|null;descriptionHtml:string;perfume:Perfume|null;hidden:boolean;updatedAt:string;categoryIds:string[];images:AdminImage[];variants:{id:string;name:string;price:number;compareAtPrice:number|null}[]}
export type AdminCategory={id:string;name:string}
export async function getAdminCategories():Promise<AdminCategory[]>{return sql<AdminCategory[]>`select id,name from store.categories order by position,legacy_id nulls last,name`}
export async function getAdminProducts():Promise<AdminProduct[]>{
 return sql<AdminProduct[]>`select p.id,p.title,p.slug,p.brand,p.gender,p.price::float8 as price,p.compare_at_price::float8 as "compareAtPrice",p.stock,p.description_html as "descriptionHtml",p.perfume,p.is_hidden as hidden,p.updated_at::text as "updatedAt",
 coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'price',v.price,'compareAtPrice',v.compare_at_price) order by v.position) from store.variants v where v.product_id=p.id),'[]') as variants,
 coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'path',i.path,'alt',i.alt,'width',i.width,'height',i.height) order by i.position,i.id) from store.product_images i where i.product_id=p.id),'[]') as images,
 coalesce((select jsonb_agg(pc.category_id) from store.product_categories pc where pc.product_id=p.id),'[]') as "categoryIds" from store.products p order by p.title`
}
