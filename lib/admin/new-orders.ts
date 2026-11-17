export type OrderNotice={orderNumber:string;status:string}
export function newOrderNotices(orders:OrderNotice[],seen:string[]|null){
 const known=new Set(seen??[])
 return {
  fresh:seen===null?[]:orders.filter(order=>!known.has(order.orderNumber)&&['new','confirmed'].includes(order.status)),
  seen:[...new Set([...orders.map(order=>order.orderNumber),...(seen??[])])].slice(0,200),
 }
}
