'use client'
/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation loads fresh order state and runs the unsaved-changes prompt. */
import { useEffect, useRef, useState } from 'react'
import { Bell, BellRing, Check, X } from 'lucide-react'
import { adminWorker, applicationServerKey, disableAdminPush, savePushSubscription } from '@/lib/admin/push-client'
import { newOrderNotices, type OrderNotice } from '@/lib/admin/new-orders'
import styles from './AdminNotifications.module.css'

export function AdminNotifications(){
 const [open,setOpen]=useState(false),[newCount,setNewCount]=useState(0),[toast,setToast]=useState('')
 const [available,setAvailable]=useState<boolean|null>(null),[publicKey,setPublicKey]=useState('')
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [platform,setPlatform]=useState<'loading'|'supported'|'install'|'unsupported'>('loading')
 const container=useRef<HTMLDivElement>(null)
 useEffect(()=>{const show=(event:Event)=>{event.preventDefault();setOpen(true)};if(new URLSearchParams(window.location.search).get('notifications')==='1')setOpen(true);window.addEventListener('tiarra-open-notifications',show);return()=>window.removeEventListener('tiarra-open-notifications',show)},[])
 useEffect(()=>{
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
  const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone
  const supported='Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window
  setPlatform(ios&&!standalone?'install':supported?'supported':'unsupported')
  if(!supported||ios&&!standalone)return
  let cancelled=false
  void fetch('/api/admin/notifications/push',{cache:'no-store'}).then(async response=>{
   if(!response.ok)throw new Error('Не успяхме да проверим известията. Влез отново или презареди.')
   const data=await response.json() as {available:boolean;publicKey?:string}
   if(cancelled)return
   setAvailable(data.available);setPublicKey(data.publicKey??'')
   if(!data.available)return
   const registration=await adminWorker(),subscription=await registration.pushManager.getSubscription()
   if(subscription&&Notification.permission==='granted'){
    await savePushSubscription(subscription)
    if(!cancelled)setEnabled(true)
   }
  }).catch(error=>{if(!cancelled)setMessage(error instanceof Error?error.message:'Не успяхме да заредим известията.')})
  return()=>{cancelled=true}
 },[])
 useEffect(()=>{
  let cancelled=false,inFlight=false
  let seen:string[]|null=null
  try{const saved=JSON.parse(localStorage.getItem('tiarra-admin-orders-seen-v1')??'null');if(Array.isArray(saved)&&saved.every(value=>typeof value==='string'))seen=saved.slice(0,200)}catch{}
  async function poll(){
   if(cancelled||inFlight||document.visibilityState==='hidden')return
   inFlight=true
   try{
    const response=await fetch('/api/admin/orders/notifications',{cache:'no-store'})
    if(!response.ok)return
    const data=await response.json() as {orders:OrderNotice[]}
    if(cancelled)return
    const notices=newOrderNotices(data.orders,seen);seen=notices.seen
    try{localStorage.setItem('tiarra-admin-orders-seen-v1',JSON.stringify(seen))}catch{}
    if(notices.fresh.length){setNewCount(count=>count+notices.fresh.length);setToast(notices.fresh.length===1?`Нова поръчка №${notices.fresh[0].orderNumber}`:`Има ${notices.fresh.length} нови поръчки`);window.dispatchEvent(new Event('tiarra-orders-changed'))}
   }catch{/* Poll again when connection returns. */}finally{inFlight=false}
  }
  void poll();const timer=setInterval(()=>void poll(),30000)
  const wake=()=>void poll(),push=(event:MessageEvent)=>{if(event.data?.type==='TIARRA_NEW_ORDER')void poll()}
  document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake)
  navigator.serviceWorker?.addEventListener('message',push)
  return()=>{cancelled=true;clearInterval(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);navigator.serviceWorker?.removeEventListener('message',push)}
 },[])
 useEffect(()=>{
  if(!open)return
  const click=(event:PointerEvent)=>{if(!container.current?.contains(event.target as Node))setOpen(false)}
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
  document.addEventListener('pointerdown',click);document.addEventListener('keydown',key)
  return()=>{document.removeEventListener('pointerdown',click);document.removeEventListener('keydown',key)}
 },[open])
 async function enable(){
  if(busy||!publicKey)return
  setBusy(true);setMessage('')
  try{
   // iOS requires the permission request directly in the button's gesture handler.
   const permission=await Notification.requestPermission()
   if(permission!=='granted')throw new Error(permission==='denied'?'Известията са забранени. Разреши ги от Настройки → Известия → Tiarra Admin.':'Не е дадено разрешение за известия.')
   const registration=await adminWorker()
   const subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationServerKey(publicKey)})
   await savePushSubscription(subscription);setEnabled(true);setMessage('Известията са включени на това устройство.')
  }catch(error){setMessage(error instanceof Error?error.message:'Не успяхме да включим известията.')}finally{setBusy(false)}
 }
 async function disable(){setBusy(true);setMessage('');try{await disableAdminPush();setEnabled(false);setMessage('Известията са изключени на това устройство.')}catch(error){setMessage(error instanceof Error?error.message:'Опитай отново.')}finally{setBusy(false)}}
 async function test(){
  setBusy(true);setMessage('')
  try{
   const registration=await adminWorker(),subscription=await registration.pushManager.getSubscription()
   if(!subscription)throw new Error('Първо включи известията.')
   const response=await fetch('/api/admin/notifications/push/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error??'Известието не беше изпратено.')
   setMessage('Тестовото известие е изпратено. Провери известията на телефона.')
  }catch(error){setMessage(error instanceof Error?error.message:'Опитай отново.')}finally{setBusy(false)}
 }
 return <div className={styles.wrap} ref={container}>
  <button type="button" className={styles.bell} aria-label={newCount?`Известия: ${newCount} ${newCount===1?'нова поръчка':'нови поръчки'}`:'Известия за поръчки'} aria-expanded={open} aria-controls="admin-notifications" onClick={()=>setOpen(value=>!value)}>{newCount?<BellRing size={20}/>:<Bell size={20}/ >}{newCount>0&&<span>{newCount>99?'99+':newCount}</span>}</button>
  {open&&<section className={styles.panel} id="admin-notifications" aria-label="Известия за нови поръчки">
   <header><h2>Известия за поръчки</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Затвори известията"><X size={18}/></button></header>
   <a className={styles.orders} href="/admin/orders">{newCount?`${newCount} ${newCount===1?'нова поръчка':'нови поръчки'} · Виж поръчките`:'Виж всички поръчки'}</a>
   <p>Получавай известие на телефона при нова поръчка, дори когато приложението е затворено.</p>
   {platform==='install'?<p className={styles.help}>На iPhone отвори админ панела в Safari → Споделяне → Добави към началния екран. После го отвори от иконата и включи известията тук. Нужен е iOS 16.4 или по-нов.</p>:platform==='unsupported'?<p className={styles.help}>Това устройство не поддържа push известия. Докато панелът е отворен, новите поръчки се показват тук автоматично.</p>:platform==='loading'?<p>Проверка на устройството…</p>:available===false?<div className={styles.help}><p>Необходимо е еднократно активиране в Supabase → SQL Editor.</p><a href="https://github.com/vstoimenov/tiarra-store/blob/main/supabase/migrations/20261117160000_admin_order_notifications.sql" target="_blank" rel="noopener noreferrer">SQL за активиране</a></div>:<>
    {enabled?<><p className={styles.enabled}><Check size={16}/> Включени на това устройство</p><button type="button" className={styles.primary} disabled={busy} onClick={test}>Изпрати тестово известие</button><button type="button" className={styles.secondary} disabled={busy} onClick={disable}>Изключи на това устройство</button></>:<button type="button" className={styles.primary} disabled={busy||available!==true} onClick={enable}>{busy?'Включване…':'Включи известията'}</button>}
   </>}
   {message&&<p className={styles.message} role="status">{message}</p>}
  </section>}
  {toast&&<aside className={styles.toast} role="status"><BellRing size={21}/><div><strong>{toast}</strong><a href="/admin/orders">Виж поръчките</a></div><button type="button" aria-label="Скрий съобщението" onClick={()=>setToast('')}><X size={18}/></button></aside>}
 </div>
}
