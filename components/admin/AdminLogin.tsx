'use client'
import Link from 'next/link'
import { useState,type FormEvent } from 'react'
import styles from './AdminShell.module.css'
export function AdminLogin(){
 const [message,setMessage]=useState('');const [pending,setPending]=useState(false)
 async function login(event:FormEvent<HTMLFormElement>){event.preventDefault();setPending(true);setMessage('');const form=new FormData(event.currentTarget)
 try{const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'),password:form.get('password')})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Входът не е успешен.');const next=new URLSearchParams(window.location.search).get('next');window.location.assign(next?.startsWith('/admin/')&&!next.startsWith('/admin/login')&&!next.includes('\\')?next:'/admin')}
 catch(error){setMessage(error instanceof Error?error.message:'Няма връзка. Опитай отново.');setPending(false)}}
 return <div className={styles.login}><form onSubmit={login}><span>TIARRA COSMETICS / ADMIN</span><h1>Добре дошъл.</h1><p>Твоят магазин, на едно място.</p><label>Потребителско име<input name="username" autoComplete="username" required disabled={pending}/></label><label>Парола<input type="password" name="password" autoComplete="current-password" required disabled={pending}/></label><p role="alert">{message}</p><button disabled={pending}>{pending?'Влизане…':'Влез в администрацията →'}</button><Link href="/">Към магазина</Link></form></div>
}
