import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import type { CourierOffice } from '@/lib/ordyx-offices'

const payloadSchema=z.object({courier:z.enum(['econt','speedy']),id:z.string().min(1).max(120),code:z.string().min(1).max(120),name:z.string().min(1).max(250),city:z.string().min(1).max(120),address:z.string().min(1).max(350),isAutomat:z.boolean(),expires:z.number().int()})
type Payload=z.infer<typeof payloadSchema>
function key(){const value=process.env.CRON_SECRET;if(!value)throw new Error('OFFICE_SIGNING_KEY_MISSING');return value}
function signature(payload:string){return createHmac('sha256',key()).update(payload).digest('base64url')}
export function signOffice(courier:'econt'|'speedy',office:CourierOffice,now=Date.now()):string{
 const payload=Buffer.from(JSON.stringify({courier,id:office.id,code:office.code,name:office.name,city:office.city,address:office.address,isAutomat:office.isAutomat,expires:now+72*60*60*1000})).toString('base64url')
 return `${payload}.${signature(payload)}`
}
export function verifyOffice(token:string,courier:'econt'|'speedy',id:string,type:'office'|'automat',now=Date.now()):Payload|null{
 if(token.length>4000)return null
 const [payload,sig,...extra]=token.split('.')
 if(!payload||!sig||extra.length||!/^[A-Za-z0-9_-]+$/.test(payload)||!/^[A-Za-z0-9_-]+$/.test(sig))return null
 const expected=Buffer.from(signature(payload)),actual=Buffer.from(sig)
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null
 try{const parsed=payloadSchema.safeParse(JSON.parse(Buffer.from(payload,'base64url').toString('utf8')));if(!parsed.success)return null;const office=parsed.data;return office.courier===courier&&office.id===id&&office.isAutomat===(type==='automat')&&office.expires>now?office:null}catch{return null}
}
