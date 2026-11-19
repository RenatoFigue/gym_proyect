import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyMercadoPagoSignature({ signature, requestId, paymentId, secret }) {
  if (!signature || !requestId || !paymentId || !secret) return false
  const parts = Object.fromEntries(String(signature).split(',').map(part => part.trim().split('=')))
  if (!/^\d{10,17}$/.test(parts.ts || '') || !/^[a-f0-9]{64}$/i.test(parts.v1 || '')) return false
  const id = String(paymentId).toLowerCase()
  const manifest = `id:${id};request-id:${requestId};ts:${parts.ts};`
  const expected = createHmac('sha256',secret).update(manifest).digest('hex')
  return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(parts.v1,'hex'))
}

