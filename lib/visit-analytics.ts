const VISITOR='tiarra-visitor-v1'
const SESSION='tiarra-visit-session-v1'
const LAST='tiarra-visit-last-v1'
export function currentVisitSession():string|null{
 if(typeof window==='undefined'||window.localStorage.getItem('tiarra-consent-v1')!=='accepted')return null
 try{
  const now=Date.now();let session=window.sessionStorage.getItem(SESSION)
  const last=Number(window.sessionStorage.getItem(LAST))
  if(!session||!Number.isFinite(last)||now-last>30*60*1000){session=crypto.randomUUID();window.sessionStorage.setItem(SESSION,session)}
  window.sessionStorage.setItem(LAST,String(now))
  return session
 }catch{return null}
}
export function recordVisit(path:string):void{
 const sessionId=currentVisitSession();if(!sessionId)return
 try{
  let visitorId=window.localStorage.getItem(VISITOR)
  if(!visitorId){visitorId=crypto.randomUUID();window.localStorage.setItem(VISITOR,visitorId)}
  void fetch('/api/analytics/visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,visitorId,path}),keepalive:true}).catch(()=>{})
 }catch{/* Analytics must never interrupt shopping. */}
}
