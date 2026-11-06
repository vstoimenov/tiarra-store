export const ADMIN_COOKIE = 'tiarra_admin_session'
export const SESSION_SECONDS = 8 * 60 * 60
const bytes = new TextEncoder()
async function signingKey() {
  const password = process.env.ADMIN_PASSWORD
  const username = process.env.ADMIN_USERNAME
  if (!password || !username) return null
  return crypto.subtle.importKey('raw', bytes.encode(`${username}:${password}`), { name:'HMAC',hash:'SHA-256' }, false, ['sign','verify'])
}
export async function createAdminSession(): Promise<string> {
  const key=await signingKey()
  if(!key) throw new Error('Admin access is not configured')
  const payload=`${Math.floor(Date.now()/1000)+SESSION_SECONDS}.${crypto.randomUUID()}`
  const signature=await crypto.subtle.sign('HMAC',key,bytes.encode(payload))
  return `${payload}.${Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('')}`
}
export async function validAdminSession(token: string | undefined): Promise<boolean> {
  if(!token || token.length>200) return false
  const [expiry,nonce,signature,...extra]=token.split('.')
  const time=Number(expiry)
  if(extra.length || !/^\d+$/.test(expiry) || time<=Date.now()/1000 || time>Date.now()/1000+SESSION_SECONDS+60 || !/^[a-f0-9-]{36}$/.test(nonce??'') || !/^[a-f0-9]{64}$/.test(signature??''))return false
  const key=await signingKey();if(!key)return false
  return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g)!,v=>parseInt(v,16)),bytes.encode(`${expiry}.${nonce}`))
}
