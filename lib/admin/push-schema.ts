import { z } from 'zod'

/** Only public push service hosts can be contacted, even with a forged admin subscription. */
export function allowedPushEndpoint(endpoint:string):boolean {
  try {
    const url=new URL(endpoint)
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&(
      url.hostname==='web.push.apple.com'||url.hostname==='fcm.googleapis.com'||
      url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.services.mozilla.com')||url.hostname.endsWith('.notify.windows.com'))
  } catch { return false }
}
const base64url=(bytes:number)=>z.string().regex(/^[A-Za-z0-9_-]+$/).refine(value=>Buffer.from(value,'base64url').length===bytes)
export const pushEndpointSchema=z.string().max(2048).refine(allowedPushEndpoint)
export const pushSubscriptionSchema=z.object({
  endpoint:pushEndpointSchema,
  keys:z.object({p256dh:base64url(65).refine(value=>Buffer.from(value,'base64url')[0]===4),auth:base64url(16)}),
})
