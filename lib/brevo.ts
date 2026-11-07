/** Server-only Brevo transactional email transport. */
export type TransactionalEmail = {
  to: { email: string; name?: string }
  subject: string
  html: string
  text: string
  idempotencyKey: string
}

export async function sendTransactionalEmail(message: TransactionalEmail): Promise<void> {
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error('BREVO_NOT_CONFIGURED')
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Tiarra Cosmetics', email: 'info@tiarracosmetics.com' },
      to: [message.to], subject: message.subject, htmlContent: message.html,
      textContent: message.text, headers: { 'idempotencyKey': message.idempotencyKey },
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    // Store only a sanitized diagnostic; never log API keys, recipient addresses or payloads.
    const body = await response.json().catch(() => null) as { code?:unknown; message?:unknown } | null
    const code = typeof body?.code === 'string' ? body.code.replace(/[^a-z0-9_-]/gi,'').slice(0,60) : ''
    const reason = typeof body?.message === 'string' ? body.message.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email]').replace(/xkeysib-[a-z0-9-]+/gi,'[key]').replace(/https?:\/\/\S+/gi,'[url]').slice(0,220) : ''
    throw new Error([`BREVO_HTTP_${response.status}`,code,reason].filter(Boolean).join(': '))
  }
}
