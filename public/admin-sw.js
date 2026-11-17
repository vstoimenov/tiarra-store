/* Push only: never cache admin pages, API responses or customer data. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()))
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()))
self.addEventListener('push',event=>{
 let data={}
 try{data=event.data?.json()??{}}catch{/* Show a generic visible notification for malformed data. */}
 const number=typeof data.orderNumber==='string'&&/^\d+$/.test(data.orderNumber)?data.orderNumber:null
 const url=number?`/admin/orders?order=${number}`:'/admin/orders'
 event.waitUntil(Promise.all([
  self.registration.showNotification(typeof data.title==='string'?data.title:'Нова поръчка · Tiarra',{
   body:typeof data.body==='string'?data.body:'Отвори панела, за да видиш новата поръчка.',
   icon:'/admin-icons/icon-192.png',badge:'/admin-icons/icon-192.png',
   tag:typeof data.tag==='string'?data.tag:'tiarra-new-order',data:{url},
  }),
  self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
   for(const client of clients)if(new URL(client.url).origin===self.location.origin&&/^\/admin(?:\/|$)/.test(new URL(client.url).pathname))client.postMessage({type:'TIARRA_NEW_ORDER'})
  }),
 ]))
})
self.addEventListener('notificationclick',event=>{
 event.notification.close()
 const requested=event.notification.data?.url
 const url=typeof requested==='string'&&/^\/admin\/orders(?:\?order=\d+)?$/.test(requested)?requested:'/admin/orders'
 const target=new URL(url,self.location.origin).href
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  const client=clients.find(client=>new URL(client.url).origin===self.location.origin&&/^\/admin(?:\/|$)/.test(new URL(client.url).pathname))
  if(client){await client.navigate(target);return client.focus()}
  return self.clients.openWindow(target)
 }))
})
