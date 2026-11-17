/** A narrowly scoped worker: it receives pushes, but never caches admin pages. */
export async function adminWorker():Promise<ServiceWorkerRegistration>{
 const registration=await navigator.serviceWorker.register('/admin-sw.js',{scope:'/admin/'})
 if(registration.active)return registration
 const worker=registration.installing??registration.waiting
 if(!worker)throw new Error('Известията не се заредиха. Презареди страницата.')
 await new Promise<void>((resolve,reject)=>{
  const timeout=setTimeout(()=>{worker.removeEventListener('statechange',changed);reject(new Error('Известията не се заредиха. Опитай отново.'))},15000)
  function changed(){if(worker!.state==='activated'||worker!.state==='redundant'){clearTimeout(timeout);worker!.removeEventListener('statechange',changed);if(worker!.state==='activated')resolve();else reject(new Error('Презареди страницата и опитай отново.'))}}
  worker.addEventListener('statechange',changed);changed()
 })
 return registration
}
export function applicationServerKey(value:string):ArrayBuffer {
 const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'))
 const bytes=new Uint8Array(raw.length)
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i)
 return bytes.buffer
}
export async function savePushSubscription(subscription:PushSubscription){
 const response=await fetch('/api/admin/notifications/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription.toJSON())})
 if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error??'Не успяхме да включим известията. Влез отново и опитай пак.')}
}
export async function disableAdminPush(){
 if(!('serviceWorker' in navigator))return
 const registration=await navigator.serviceWorker.getRegistration('/admin/')
 const subscription=await registration?.pushManager?.getSubscription()
 if(!subscription)return
 const response=await fetch('/api/admin/notifications/push',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})})
 if(!response.ok)throw new Error('Изключването на известията не успя. Опитай отново.')
 await subscription.unsubscribe()
}
