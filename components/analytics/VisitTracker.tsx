'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { recordVisit } from '@/lib/visit-analytics'
export function VisitTracker(){
 const path=usePathname()
 useEffect(()=>{
  if(!path||path.startsWith('/admin'))return
  recordVisit(path)
  const onConsent=()=>recordVisit(path)
  window.addEventListener('tiarra-consent-updated',onConsent)
  return()=>window.removeEventListener('tiarra-consent-updated',onConsent)
 },[path])
 return null
}
