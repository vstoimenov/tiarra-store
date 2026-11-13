'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
export function DeleteSignup({ email }: { email: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function remove() {
    if (!window.confirm('Да премахнем ли този имейл от списъка?')) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/quiz-signups', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      if (!response.ok) throw new Error('failed')
      router.refresh()
    } catch { setError('Неуспешно премахване.') }
    finally { setBusy(false) }
  }
  return <span><button type="button" onClick={remove} disabled={busy}>Премахни</button>{error && <span role="alert"> {error}</span>}</span>
}
