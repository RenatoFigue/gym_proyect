// CU12 — inicia Checkout Pro solo cuando el comercio ha configurado Mercado Pago.
// Nunca confía en el precio, titular o cargo enviado por el navegador.
import { randomUUID } from 'node:crypto'
import { privilegedClient, authenticatedProfile } from './_lib/supabase-server.js'

const validHttps = value => {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password }
  catch { return false }
}
const validCheckout = value => {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && [
      'mercadopago.cl','mercadopago.com','mercadopago.com.cl'
    ].some(domain => u.hostname === domain || u.hostname.endsWith('.' + domain))
  } catch { return false }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })
  if (!process.env.MP_ACCESS_TOKEN || !validHttps(process.env.MP_WEBHOOK_URL) ||
      !validHttps(process.env.PUBLIC_APP_URL)) {
    return res.status(503).json({ error: 'Pago online no configurado: falta acreditar el comercio, URL HTTPS o webhook.' })
  }
  const id = Number(req.body?.charge_id)
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Cargo inválido' })
  let admin
  try { admin = privilegedClient() }
  catch { return res.status(503).json({ error: 'Servicio no configurado' }) }
  const check = await authenticatedProfile(admin, req, 'socio')
  if (check.error) return res.status(check.error.status).json({ error: check.error.text })
  const { profile, user } = check
  const { data: charge, error: chargeError } = await admin.from('charges')
    .select('id,member_id,concept,amount,paid_amount,status').eq('id', id).maybeSingle()
  if (chargeError || charge?.member_id !== profile.member_id ||
      !['pending','partial'].includes(charge?.status) || charge.amount-charge.paid_amount<=0) {
    return res.status(409).json({ error: 'Cargo inexistente, sin saldo o ajeno.' })
  }
  const amount = charge.amount-charge.paid_amount
  const attemptId = randomUUID()
  const { error: insertError } = await admin.from('online_checkout_attempts').insert({
    id: attemptId,charge_id:id,member_id:profile.member_id,amount,status:'created'
  })
  if (insertError) return res.status(500).json({ error: 'No se pudo iniciar el intento de pago.' })

  const base = process.env.PUBLIC_APP_URL.replace(/\/$/,'')
  const preference = {
    items:[{ title: `GymControl - ${charge.concept}`.slice(0,240), quantity:1, currency_id:'CLP',unit_price:amount }],
    external_reference:attemptId,
    payer:{email:user.email},
    notification_url:process.env.MP_WEBHOOK_URL,
    back_urls:{success:base+'/my/payments?checkout=success',failure:base+'/my/payments?checkout=failure',pending:base+'/my/payments?checkout=pending'},
    auto_return:'approved'
  }
  try {
    const reply = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method:'POST',headers:{
        'Authorization':`Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type':'application/json',
        'X-Idempotency-Key': attemptId
      },body:JSON.stringify(preference),signal:AbortSignal.timeout(15000)
    })
    if (!reply.ok) throw new Error('Proveedor rechazó la preferencia')
    const created = await reply.json()
    const link = process.env.MP_SANDBOX === 'true' ? created.sandbox_init_point : created.init_point
    if (!created.id || !validCheckout(link)) throw new Error('Respuesta de preferencia inválida')
    const { error: savedError } = await admin.from('online_checkout_attempts')
      .update({preference_id:String(created.id),updated_at:new Date().toISOString()})
      .eq('id',attemptId)
    if (savedError) throw new Error('No se pudo vincular la preferencia')
    return res.status(200).json({ external_url:link, message:'Continúa el pago en Mercado Pago.' })
  } catch {
    await admin.from('online_checkout_attempts').update({status:'failed',updated_at:new Date().toISOString()}).eq('id',attemptId)
    return res.status(502).json({error:'No se pudo iniciar el pago con el proveedor. No se registró ningún cobro.'})
  }
}
