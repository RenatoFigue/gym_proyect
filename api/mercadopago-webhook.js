// Notificación del proveedor: valida firma + consulta estado oficial.
// NO confirma pagos por redirecciones del navegador ni por cuerpos POST sin validar.
import { verifyMercadoPagoSignature } from './_lib/mp-signature.js'
import { privilegedClient } from './_lib/supabase-server.js'


export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store')
  if (req.method !== 'POST') return res.status(405).json({error:'Método no permitido'})
  if (!process.env.MP_WEBHOOK_SECRET || !process.env.MP_ACCESS_TOKEN) {
    return res.status(503).json({error:'Webhook no configurado'})
  }
  let payload; try { payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {} } catch { return res.status(400).json({error:"JSON inválido"}) }
  const paymentId = String(payload?.data?.id || '')
  if (payload?.type !== 'payment' || !/^\d{1,30}$/.test(paymentId)) {
    return res.status(200).json({received:true,ignored:true})
  }
  if (!verifyMercadoPagoSignature({
    signature:req.headers['x-signature'], requestId:req.headers['x-request-id'],
    paymentId, secret:process.env.MP_WEBHOOK_SECRET
  })) return res.status(401).json({error:'Firma inválida'})
  try {
    const paymentReply = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers:{Authorization:`Bearer ${process.env.MP_ACCESS_TOKEN}`},
      signal:AbortSignal.timeout(15000)
    })
    if (!paymentReply.ok) return res.status(502).json({error:'Sin confirmación del proveedor'})
    const payment = await paymentReply.json()
    const attempt = String(payment.external_reference || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attempt) ||
        String(payment.id) !== paymentId || payment.currency_id !== 'CLP' ||
        !Number.isSafeInteger(Number(payment.transaction_amount))) {
      return res.status(422).json({error:'Datos de pago incompatibles'})
    }
    const admin = privilegedClient()
    const { data, error } = await admin.rpc('gym_confirm_external_payment', {
      p_attempt:attempt,p_provider_payment:paymentId,p_amount:Number(payment.transaction_amount),
      p_currency:payment.currency_id,p_provider_status:String(payment.status)
    })
    if (error) return res.status(409).json({error:'Pago pendiente de revisión administrativa'})
    return res.status(200).json({received:true,status:data?.status || 'processed'})
  } catch { return res.status(502).json({error:'No se pudo verificar el pago'}) }
}
