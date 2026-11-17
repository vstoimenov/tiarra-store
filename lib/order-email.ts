export type OrderEmailData = {
  number: string; name: string; phone: string; email: string | null; total: number; subtotal: number; shipping: number; discount: number; delivery: string; courier: string
  items: { title: string; variant: string | null; quantity: number; total: number; productId: string | null }[]
}
const esc = (value:string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!))
const money = (value:number) => `${value.toLocaleString('bg-BG',{minimumFractionDigits:2,maximumFractionDigits:2})} €`
const meta='font:700 10px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#a38049'
const line='border-bottom:1px solid #ebe5dc'

/** Escapes customer and product fields before placing them in email HTML. */
export function renderOrderEmail(order:OrderEmailData, kind:'customer'|'merchant'='customer'){
 if(kind==='customer')return renderCustomerOrderEmail(order)
 const number=esc(order.number),name=esc(order.name),delivery=esc(order.delivery)
 const courier=order.courier==='econt'?'Еконт':order.courier==='speedy'?'Спиди':order.courier==='boxnow'?'BOX NOW':order.courier
 const title='Нова поръчка<br><em style="color:#ad8950;font-weight:normal">в магазина.</em>'
 const intro=`Получена е нова поръчка от <strong>${name}</strong>.`
 const rows=order.items.map(item=>{
  const picture=item.productId&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId)?`<img src="https://tiarracosmetics.com/api/email/product-image/${item.productId}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border:0;background:#f5f1eb">`:''
  return `<tr><td width="84" valign="top" style="padding:16px 12px 16px 0;${line}">${picture}</td><td valign="middle" style="padding:16px 4px;${line};font:600 14px/1.5 Arial,sans-serif;color:#27231f">${esc(item.title)}${item.variant?`<br><span style="font-weight:400;font-size:12px;color:#867f75">${esc(item.variant)}</span>`:''}<br><span style="font-weight:400;font-size:12px;color:#867f75">Количество: ${item.quantity}</span></td><td align="right" valign="middle" style="padding:16px 0 16px 8px;${line};font:700 13px Arial,sans-serif;white-space:nowrap;color:#27231f">${money(item.total)}</td></tr>`
 }).join('')
 const summaryRow=(label:string,value:string,bold=false)=>`<tr><td style="padding:7px 0;font:${bold?'700':'400'} ${bold?'17':'13'}px Arial,sans-serif;color:${bold?'#211e1a':'#70695f'}">${label}</td><td align="right" style="padding:7px 0;font:${bold?'700':'600'} ${bold?'19':'13'}px Arial,sans-serif;color:#211e1a">${value}</td></tr>`
 const discount=order.discount>0?summaryRow('Отстъпка',`− ${money(order.discount)}`):''
 const merchantDetails=`<p style="margin:0 0 8px;font:600 13px Arial,sans-serif;color:#302a23">Клиент: ${name}</p><p style="margin:0 0 8px;font:13px Arial,sans-serif;color:#615a51">Телефон: ${esc(order.phone)}</p>${order.email?`<p style="margin:0 0 8px;font:13px Arial,sans-serif;color:#615a51">Имейл: ${esc(order.email)}</p>`:''}`
 const subject=`Нова поръчка №${order.number} | Tiarra Cosmetics`
 const preheader=`Нова поръчка №${order.number} на стойност ${money(order.total)}.`
 const html=`<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title><style>@media only screen and (max-width:600px){.pad{padding-left:22px!important;padding-right:22px!important}.hero-title{font-size:34px!important}}</style></head><body style="margin:0;padding:0;background:#f3f0e9;color:#211e1a;-webkit-text-size-adjust:100%"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f0e9"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fffdf9;border:1px solid #e8e0d4"><tr><td align="center" style="background:#050505;padding:18px 25px"><img src="https://tiarracosmetics.com/site/email-logo.png" width="200" alt="Tiarra Cosmetics" style="display:block;width:200px;max-width:100%;height:auto;border:0"></td></tr><tr><td class="pad" style="padding:44px 40px 30px"><p style="margin:0 0 16px;${meta}">ИЗВЕСТИЕ ЗА ПОРЪЧКА</p><h1 class="hero-title" style="margin:0 0 22px;font:normal 40px/1.15 Georgia,serif;color:#211e1a">${title}</h1><p style="margin:0;font:15px/1.8 Arial,sans-serif;color:#625b52">${intro}</p></td></tr><tr><td class="pad" style="padding:0 40px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e9"><tr><td style="padding:18px 20px"><span style="${meta}">НОМЕР НА ПОРЪЧКАТА</span><br><strong style="display:block;padding-top:8px;font:700 18px Arial,sans-serif;color:#211e1a">№ ${number}</strong></td><td align="right" style="padding:18px 20px"><span style="${meta}">ПЛАЩАНЕ</span><br><strong style="display:block;padding-top:8px;font:600 13px Arial,sans-serif;color:#211e1a">Наложен платеж</strong></td></tr></table></td></tr><tr><td class="pad" style="padding:35px 40px 10px"><p style="margin:0;${meta}">ПРОДУКТИ В ПОРЪЧКАТА</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table></td></tr><tr><td class="pad" style="padding:12px 40px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${summaryRow('Продукти',money(order.subtotal))}${discount}${summaryRow('Доставка',order.shipping===0?'Безплатна':money(order.shipping))}<tr><td colspan="2" style="border-top:1px solid #ded6ca;height:12px"></td></tr>${summaryRow('Общо',money(order.total),true)}</table></td></tr><tr><td class="pad" style="padding:0 40px 38px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f6f1"><tr><td style="padding:22px"><p style="margin:0 0 14px;${meta}">ДАННИ ЗА ДОСТАВКА</p>${merchantDetails}<p style="margin:0 0 6px;font:700 13px Arial,sans-serif;color:#302a23">Куриер: ${esc(courier)}</p><p style="margin:0;font:13px/1.65 Arial,sans-serif;color:#615a51">${delivery}</p></td></tr></table></td></tr><tr><td class="pad" style="padding:27px 40px;background:#211f1b;color:#f8f4ed"><p style="margin:0 0 8px;font:normal 21px Georgia,serif">Грижата започва с теб.</p><p style="margin:0;font:12px/1.7 Arial,sans-serif;color:#d1c6b5">Въпроси? Пиши ни на <a href="mailto:info@tiarracosmetics.com" style="color:#dfc58e">info@tiarracosmetics.com</a></p></td></tr><tr><td class="pad" style="padding:20px 40px;font:11px/1.6 Arial,sans-serif;color:#9b9387">Tiarra Cosmetics · Съобщение във връзка с поръчка №${number}.</td></tr></table></td></tr></table></body></html>`
 const text=`Нова поръчка №${order.number}.\nКлиент: ${order.name}\nТелефон: ${order.phone}\n${order.email?`Имейл: ${order.email}\n`:''}${order.items.map(item=>`${item.title}${item.variant?` — ${item.variant}`:''} × ${item.quantity}: ${money(item.total)}`).join('\n')}\nПродукти: ${money(order.subtotal)}${order.discount>0?`\nОтстъпка: − ${money(order.discount)}`:''}\nДоставка: ${order.shipping===0?'Безплатна':money(order.shipping)}\nОбщо: ${money(order.total)}\nКуриер: ${courier}\n${order.delivery}\nПлащане: Наложен платеж\ninfo@tiarracosmetics.com`
 return {subject,html,text}
}

/** Customer confirmation; operational order numbers stay in merchant mail only. */
function renderCustomerOrderEmail(order:OrderEmailData){
 const subject='Получихме твоята поръчка | Tiarra Cosmetics'
 const preheader='Благодарим ти за доверието. Виж избраните продукти, доставката и сумата за плащане.'
 const name=esc(order.name.trim())
 const courier=order.courier==='econt'?'Еконт':order.courier==='speedy'?'Спиди':order.courier==='boxnow'?'BOX NOW':order.courier
 const greeting=name?`Здравей, ${name}!`:'Здравей!'
 const message='Усмихни се! Получихме твоята поръчка и скоро ще подготвим избраните от теб продукти за изпращане.'
 const label='font:700 10px/1.5 Arial,Helvetica,sans-serif;letter-spacing:1.8px;text-transform:uppercase;color:#80622f'
 const copy='font:14px/1.7 Arial,Helvetica,sans-serif;color:#625b52'
 const detail=(title:string,value:string)=>`<tr><td class="detail-label" valign="top" width="100" style="padding:8px 12px 8px 0;border-bottom:1px solid #e6dfd3;font:13px/1.6 Arial,Helvetica,sans-serif;color:#746b5f">${title}</td><td valign="top" style="padding:8px 0;border-bottom:1px solid #e6dfd3;font:600 13px/1.6 Arial,Helvetica,sans-serif;color:#2c2923;word-break:break-word">${value}</td></tr>`
 const deliveryDetails=detail('Куриер',esc(courier))+detail('Получаване',esc(order.delivery))+(name?detail('Получател',name):'')+(order.phone?detail('Телефон',esc(order.phone)):'')+detail('Плащане','Наложен платеж')
 const rows=order.items.map(item=>{
  const picture=item.productId&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId)?`<td width="80" valign="top" style="width:80px;padding:20px 12px 20px 0;${line}"><img src="https://tiarracosmetics.com/api/email/product-image/${item.productId}" width="68" height="68" alt="${esc(item.title)}" style="display:block;width:68px;height:68px;border:0;background:#ffffff"></td>`:''
  return `<tr>${picture}<td${picture?'':' colspan="2"'} valign="top" style="padding:20px 0;${line};word-break:break-word"><p style="margin:0;font:600 14px/1.6 Arial,Helvetica,sans-serif;color:#27231f">${esc(item.title)}</p>${item.variant?`<p style="margin:4px 0 0;font:12px/1.6 Arial,Helvetica,sans-serif;color:#746b5f">${esc(item.variant)}</p>`:''}<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:10px 8px 0 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#746b5f">${item.quantity} бр.</td><td align="right" style="padding:10px 0 0;font:700 15px/1.5 Arial,Helvetica,sans-serif;color:#27231f;white-space:nowrap">${money(item.total)}</td></tr></table></td></tr>`
 }).join('')
 const summaryRow=(title:string,value:string)=>`<tr><td style="padding:6px 0;font:13px/1.5 Arial,Helvetica,sans-serif;color:#625b52">${title}</td><td align="right" style="padding:6px 0;font:600 13px/1.5 Arial,Helvetica,sans-serif;color:#2c2923">${value}</td></tr>`
 const discount=order.discount>0?summaryRow('Отстъпка',`− ${money(order.discount)}`):''
 const shipping=order.shipping===0?'Безплатна':money(order.shipping)
 const html=`<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<title>${esc(subject)}</title>
<style>
@media only screen and (max-width:600px){
 .outer-pad{padding:16px 8px!important}
 .pad{padding-left:24px!important;padding-right:24px!important}
 .hero-title{font-size:34px!important}
 .delivery-pad{padding:16px!important}
 .detail-label{width:80px!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#f3f0e9;color:#211e1a;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;mso-hide:all">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f0e9"><tr><td class="outer-pad" align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fffdf9;border:1px solid #e8e0d4">
 <tr><td align="center" style="padding:25px 24px;background:#050505"><a href="https://tiarracosmetics.com" style="color:#ffffff;text-decoration:none;font:18px Arial,Helvetica,sans-serif"><img src="https://tiarracosmetics.com/site/email-logo.png" width="180" alt="Tiarra Cosmetics" style="display:block;width:180px;max-width:100%;height:auto;border:0"></a></td></tr>
 <tr><td class="pad" style="padding:40px 40px 28px">
  <p style="margin:0 0 14px;${label}">ТВОЯТА ПОРЪЧКА Е ПОЛУЧЕНА</p>
  <h1 class="hero-title" style="margin:0 0 24px;font:normal 40px/1.18 Georgia,'Times New Roman',serif;color:#211e1a">Благодарим ти<br><em style="font-weight:normal;color:#97733a">за доверието.</em></h1>
  <p style="margin:0 0 10px;font:600 15px/1.7 Arial,Helvetica,sans-serif;color:#2c2923">${greeting}</p>
  <p style="margin:0;${copy}">${message}</p>
 </td></tr>
 <tr><td class="pad" style="padding:0 40px 30px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e9"><tr><td class="delivery-pad" style="padding:22px 24px">
   <h2 style="margin:0 0 12px;font:normal 23px/1.3 Georgia,'Times New Roman',serif;color:#2c2923">Детайли за доставката</h2>
   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed">${deliveryDetails}</table>
  </td></tr></table>
 </td></tr>
 <tr><td class="pad" style="padding:0 40px">
  <h2 style="margin:0;font:normal 25px/1.3 Georgia,'Times New Roman',serif;color:#2c2923">Избрано от теб</h2>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed">${rows}</table>
 </td></tr>
 <tr><td class="pad" style="padding:20px 40px 32px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${summaryRow('Продукти',money(order.subtotal))}${discount}${summaryRow('Доставка',shipping)}
   <tr><td colspan="2" style="padding:14px 0 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #bfa36e"><tr><td valign="middle" style="padding:18px 12px 0 0;font:600 15px/1.5 Arial,Helvetica,sans-serif;color:#2c2923">Общо за плащане</td><td align="right" valign="middle" style="padding:18px 0 0;font:700 25px/1.2 Georgia,'Times New Roman',serif;color:#2c2923;white-space:nowrap">${money(order.total)}</td></tr></table></td></tr>
  </table>
 </td></tr>
 <tr><td class="pad" style="padding:24px 40px 30px;border-top:1px solid #e8e0d4">
  <p style="margin:0 0 8px;font:600 14px/1.6 Arial,Helvetica,sans-serif;color:#2c2923">Благодарим ти, че избра Tiarra Cosmetics.</p>
  <p style="margin:0;${copy}">Имаш въпрос за поръчката? Отговори на този имейл или ни пиши на <a href="mailto:info@tiarracosmetics.com" style="color:#80622f;text-decoration:underline">info@tiarracosmetics.com</a>.</p>
 </td></tr>
 <tr><td class="pad" style="padding:20px 40px;background:#eee9e0;font:11px/1.7 Arial,Helvetica,sans-serif;color:#6b6358">TIARRA COSMETICS<br>Съобщение във връзка с твоята поръчка.</td></tr>
</table>
</td></tr></table>
</body></html>`
 const text=[
  'Благодарим ти за доверието.',order.name.trim()?`Здравей, ${order.name.trim()}!`:'Здравей!',message,'',
  'Детайли за доставката',`Куриер: ${courier}`,`Получаване: ${order.delivery}`,
  ...(order.name.trim()?[`Получател: ${order.name.trim()}`]:[]),...(order.phone?[`Телефон: ${order.phone}`]:[]),'Плащане: Наложен платеж','',
  'Избрано от теб',...order.items.map(item=>`${item.title}${item.variant?` — ${item.variant}`:''} × ${item.quantity}: ${money(item.total)}`),'',
  `Продукти: ${money(order.subtotal)}`,...(order.discount>0?[`Отстъпка: − ${money(order.discount)}`]:[]),`Доставка: ${shipping}`,`Общо за плащане: ${money(order.total)}`,'',
  'Благодарим ти, че избра Tiarra Cosmetics.','Въпроси за поръчката? info@tiarracosmetics.com',
 ].join('\n')
 return {subject,html,text}
}
