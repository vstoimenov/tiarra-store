import { getProductCards } from '@/lib/catalog/queries'
export async function GET(){
 try{const cards=(await getProductCards()).filter(card=>card.inStock&&card.imagePath).slice(0,12);return Response.json({cards},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=300'}})}catch{return Response.json({cards:[]},{status:503,headers:{'Cache-Control':'no-store'}})}
}
