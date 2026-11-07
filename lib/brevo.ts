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
  if (!response.ok) throw new Error(`BREVO_HTTP_${response.status}`)
}
