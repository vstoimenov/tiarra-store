'use client'

import { useEffect, useId, useState } from 'react'
import { Plus, Save, Trash2, X } from 'lucide-react'
import type { AdminOrder } from '@/lib/admin/orders'
import { editTotals, orderEditSchema, type OrderEdit } from '@/lib/admin/order-edit-schema'
import type { CourierOffice } from '@/lib/ordyx-offices'
import { formatPrice } from '@/lib/format'
import styles from './OrdersAdmin.module.css'

type Product = { id:string; title:string; price:number; variants:{id:string;name:string;price:number}[] }
type Line = AdminOrder['items'][number]
function initialDraft(order:AdminOrder):OrderEdit {
  return { expectedVersion:order.updatedAt, customerName:order.customerName,phone:order.phone,email:order.email??'',courier:order.courier,deliveryType:order.deliveryType??'address',officeId:order.officeId,city:order.city,postCode:order.postCode,deliveryAddress:order.deliveryAddress,notes:order.notes,shipping:order.shipping,discountAmount:order.discountAmount,items:order.items }
}
export function OrderEditor({order,onClose,onSaved}:{order:AdminOrder;onClose:()=>void;onSaved:(order:AdminOrder,message:string)=>void}) {
  const id=useId()
  const [draft,setDraft]=useState(()=>initialDraft(order))
  const [lines,setLines]=useState<Line[]>(order.items)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [search,setSearch]=useState('')
  const [products,setProducts]=useState<Product[]>([])
  const [searchStatus,setSearchStatus]=useState('')
  const [officeSearch,setOfficeSearch]=useState('')
  const [offices,setOffices]=useState<CourierOffice[]|null>(null)
  const [officeError,setOfficeError]=useState('')
  const [officeReload,setOfficeReload]=useState(0)
  const dirty=JSON.stringify({...draft,items:lines})!==JSON.stringify({...initialDraft(order),items:order.items})
  const totals=editTotals(lines,draft.shipping,draft.discountAmount)
  useEffect(()=>{
    if(!dirty)return
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    const links=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
      const link=(event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]')
      if(!link||link.target==='_blank'||link.href===window.location.href)return
      if(!window.confirm('Има незапазени промени по поръчката. Да излезеш без запазване?')){event.preventDefault();event.stopPropagation()}
    }
    window.addEventListener('beforeunload',warn);document.addEventListener('click',links,true)
    return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',links,true)}
  },[dirty])
  useEffect(()=>{
    const abort=new AbortController()
    const timer=setTimeout(async()=>{
      if(search.trim().length<2){setProducts([]);setSearchStatus('');return}
      setSearchStatus('Търсене…')
      try {
        const response=await fetch(`/api/admin/orders/catalog?q=${encodeURIComponent(search.trim())}`,{signal:abort.signal})
        if(!response.ok)throw Error()
        const data=await response.json() as {products:Product[]}
        if(abort.signal.aborted)return
        setProducts(data.products);setSearchStatus(data.products.length?'':'Няма намерени продукти.')
      }catch{if(!abort.signal.aborted){setProducts([]);setSearchStatus('Търсенето не успя. Опитай отново.')}}
    },250)
    return()=>{clearTimeout(timer);abort.abort()}
  },[search])
  useEffect(()=>{
    if(draft.deliveryType==='address')return
    const abort=new AbortController()
    setOffices(null);setOfficeError('')
    void fetch(`/api/admin/orders/offices?courier=${draft.courier}`,{signal:abort.signal}).then(async response=>{
      if(!response.ok)throw Error()
      const data=await response.json() as {offices:CourierOffice[]}
      if(!abort.signal.aborted)setOffices(data.offices)
    }).catch(()=>{if(!abort.signal.aborted)setOfficeError('Не успяхме да заредим офисите.')})
    return()=>abort.abort()
  },[draft.courier,draft.deliveryType,officeReload])
  function field<K extends keyof OrderEdit>(key:K,value:OrderEdit[K]) {setDraft(current=>({...current,[key]:value}))}
  function close(){if(!dirty||window.confirm('Има незапазени промени. Да ги отхвърля ли?'))onClose()}
  function add(product:Product,variant:Product['variants'][number]|null){
    setLines(current=>{
      const existing=current.find(line=>line.productId===product.id&&line.variantId===(variant?.id??null))
      if(existing)return current.map(line=>line===existing?{...line,quantity:Math.min(99,line.quantity+1)}:line)
      return [...current,{id:`new:${crypto.randomUUID()}`,productId:product.id,variantId:variant?.id??null,title:product.title,variantName:variant?.name??null,quantity:1,unitPrice:variant?.price??product.price}]
    });setSearch('');setProducts([])
  }
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return
    const parsed=orderEditSchema.safeParse({...draft,items:lines.map(line=>({...line,id:line.id.startsWith('new:')?null:line.id}))})
    if(!parsed.success){setError(parsed.error.issues[0]?.message??'Провери данните.');return}
    setBusy(true);setError('')
    try{
      const response=await fetch(`/api/admin/orders/${order.orderNumber}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data)})
      const data=await response.json() as {order:AdminOrder;error?:string;ordyxManualUpdate?:boolean}
      if(!response.ok)throw Error(data.error??'Поръчката не беше записана.')
      onSaved(data.order,data.ordyxManualUpdate?'Поръчката е записана. Нанеси промените и в Ordyx преди изпращане.':'Поръчката е записана. Наличностите и сумата са обновени.')
    }catch(error){setError(error instanceof Error?error.message:'Връзката прекъсна. Промените остават във формата.');setBusy(false)}
  }
  const matchingOffices=(offices??[]).filter(office=>office.isAutomat===(draft.deliveryType==='automat')&&`${office.city} ${office.name} ${office.address}`.toLocaleLowerCase('bg').includes(officeSearch.toLocaleLowerCase('bg'))).slice(0,30)
  return <form className={styles.editor} onSubmit={save} aria-labelledby={`${id}-title`}>
    <div className={styles.editorHeader}><div><span className={styles.eyebrow}>РЕДАКЦИЯ НА ПОРЪЧКА</span><h3 id={`${id}-title`}>Поръчка #{order.orderNumber}</h3></div><button type="button" className={styles.iconButton} onClick={close} disabled={busy} aria-label="Затвори редакцията"><X size={20}/></button></div>
    {order.ordyxStatus==='synced'&&<p className={styles.warning}>Поръчката вече е изпратена към Ordyx. След запазване нанеси промените и там, преди да издадеш товарителница.</p>}
    {dirty&&<div className={styles.editSave}><span>Има незапазени промени</span><button type="submit" disabled={busy}><Save size={17}/>{busy?'Записване…':'Запази промените'}</button></div>}
    <fieldset disabled={busy} className={styles.editorFields}>
      <legend>Данни на клиента</legend>
      <div className={styles.editGrid}>
        <label>Име и фамилия<input required minLength={2} maxLength={120} value={draft.customerName} onChange={event=>field('customerName',event.target.value)}/></label>
        <label>Телефон<input required type="tel" minLength={7} maxLength={30} value={draft.phone} onChange={event=>field('phone',event.target.value)}/></label>
        <label className={styles.fullWidth}>Имейл<input type="email" maxLength={160} value={draft.email} onChange={event=>field('email',event.target.value)}/></label>
      </div>
      <h4>Доставка</h4>
      <div className={styles.editGrid}>
        <label>Куриер<select value={draft.courier} onChange={event=>{const courier=event.target.value as OrderEdit['courier'];setDraft(current=>({...current,courier,officeId:null,deliveryType:courier==='boxnow'?'automat':'office'}));setOfficeSearch('')}}><option value="econt">Еконт</option><option value="speedy">Спиди</option><option value="boxnow">BOX NOW</option></select></label>
        <label>Начин на доставка<select value={draft.deliveryType} onChange={event=>{setDraft(current=>({...current,deliveryType:event.target.value as OrderEdit['deliveryType'],officeId:null}));setOfficeSearch('')}}>{draft.courier!=='boxnow'&&<><option value="office">До офис</option><option value="address">До адрес</option></>}<option value="automat">До автомат</option></select></label>
        {draft.deliveryType==='address'?<>
          <label>Град<input required maxLength={100} value={draft.city} onChange={event=>field('city',event.target.value)}/></label><label>Пощенски код<input required maxLength={20} value={draft.postCode} onChange={event=>field('postCode',event.target.value)}/></label>
          <label className={styles.fullWidth}>Пълен адрес за доставка<input required minLength={5} maxLength={500} value={draft.deliveryAddress} onChange={event=>field('deliveryAddress',event.target.value)}/></label>
        </>:<div className={styles.fullWidth}>
          <p className={styles.deliveryCurrent}>{draft.officeId?`Избрано: ${draft.deliveryAddress}`:'Избери офис или автомат за доставка.'}</p>
          <label>Търси офис/автомат<input value={officeSearch} onChange={event=>setOfficeSearch(event.target.value)} placeholder="Град, име или адрес"/></label>
          {officeError?<p role="alert">{officeError} <button type="button" className={styles.textButton} onClick={()=>setOfficeReload(value=>value+1)}>Опитай отново</button></p>:offices===null?<p>Зареждане на офисите…</p>:<div className={styles.searchResults}>{matchingOffices.map(office=><button type="button" key={office.id} aria-pressed={draft.officeId===office.id} onClick={()=>{setDraft(current=>({...current,officeId:office.id,city:office.city,postCode:office.postCode,deliveryAddress:`${office.city}, ${office.name}, ${office.address} [${office.code}]`}))}}>{office.city} · {office.name}<small>{office.address}</small></button>)}{!matchingOffices.length&&<p>Няма намерени офиси. Промени търсенето.</p>}</div>}
        </div>}
      </div>
      <h4>Продукти <span>({lines.length})</span></h4>
      <div className={styles.editLines}>{lines.map(line=><div className={styles.editLine} key={line.id}>
        <div className={styles.lineTitle}><strong>{line.title}</strong>{line.variantName&&<small>{line.variantName}</small>}</div>
        <label>Количество<input aria-label={`Количество: ${line.title}${line.variantName?` · ${line.variantName}`:''}`} type="number" min={1} max={99} required value={Number.isFinite(line.quantity)?line.quantity:''} onChange={event=>setLines(current=>current.map(item=>item.id===line.id?{...item,quantity:event.target.valueAsNumber}:item))}/></label>
        <label>Цена за брой (€)<input aria-label={`Цена: ${line.title}${line.variantName?` · ${line.variantName}`:''}`} type="number" min={0} max={999999} step="0.01" required value={Number.isFinite(line.unitPrice)?line.unitPrice:''} onChange={event=>setLines(current=>current.map(item=>item.id===line.id?{...item,unitPrice:event.target.valueAsNumber}:item))}/></label>
        <strong className={styles.lineTotal}>{formatPrice(editTotals([line],0,0).subtotal)}</strong>
        <button type="button" className={styles.iconButton} aria-label={`Премахни ${line.title}${line.variantName?` · ${line.variantName}`:''}`} onClick={()=>setLines(current=>current.filter(item=>item.id!==line.id))}><Trash2 size={19}/></button>
      </div>)}</div>
      <label className={styles.productSearch}>Добави продукт<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Търси по име (поне 2 букви)"/></label>
      <p className={styles.searchStatus} role="status">{searchStatus}</p>
      {!!products.length&&<div className={styles.searchResults}>{products.flatMap(product=>product.variants.length?product.variants.map(variant=><button key={variant.id} type="button" disabled={lines.length>=50} onClick={()=>add(product,variant)}><Plus size={16}/>{product.title} · {variant.name}<small>{formatPrice(variant.price)}</small></button>):[<button key={product.id} type="button" disabled={lines.length>=50} onClick={()=>add(product,null)}><Plus size={16}/>{product.title}<small>{formatPrice(product.price)}</small></button>])}</div>}
      <h4>Сума и бележка</h4>
      <div className={styles.editGrid}>
        <label>Доставка (€)<input type="number" min={0} max={999999} step="0.01" required value={Number.isFinite(draft.shipping)?draft.shipping:''} onChange={event=>field('shipping',event.target.valueAsNumber)}/></label>
        <label>Отстъпка (€)<input type="number" min={0} max={totals.subtotal} step="0.01" required value={Number.isFinite(draft.discountAmount)?draft.discountAmount:''} onChange={event=>field('discountAmount',event.target.valueAsNumber)}/></label>
        <label className={styles.fullWidth}>Бележка към поръчката<textarea maxLength={1000} rows={3} value={draft.notes} onChange={event=>field('notes',event.target.value)}/></label>
      </div>
      <p className={styles.help}>Провери цената за доставка и отстъпката след промяна на продуктите. Запазват се въведените суми.</p>
      <div className={styles.editTotal}><span>Продукти: {formatPrice(totals.subtotal)}</span><strong>Общо: {formatPrice(totals.total)}</strong></div>
    </fieldset>
    {error&&<p role="alert" className={styles.editError}>{error}</p>}
    <div className={styles.editFooter}><button type="button" disabled={busy} onClick={close}>Отказ</button><button type="submit" disabled={busy||!dirty}>{busy?'Записване…':'Запази поръчката'}</button></div>
  </form>
}
