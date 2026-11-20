'use client'
import {useState} from 'react'
import styles from './SettingsAdmin.module.css'
export function MetaCapiTestButton({enabled}:{enabled:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function test(){
  setBusy(true);setMessage('')
  try{
   const response=await fetch('/api/admin/meta/test',{method:'POST'})
   const result=await response.json()
   if(!response.ok)throw new Error(result.error||'Meta не прие теста.')
   setMessage('Тестът е приет от Meta. Провери Events Manager → Test Events. Не е създадена поръчка в магазина.')
  }catch(error){setMessage(error instanceof Error?error.message:'Неуспешна проверка.')}finally{setBusy(false)}
 }
 return <div><button type="button" className={styles.noticeAction} disabled={!enabled||busy} onClick={test}>{busy?'Изпращане…':'Изпрати тест към Meta'}</button>{!enabled&&<p>За тест добави и META_CONVERSIONS_TEST_EVENT_CODE от раздел Test Events във Vercel.</p>}{message&&<p role="status">{message}</p>}</div>
}
