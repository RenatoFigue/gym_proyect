import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHmac } from 'node:crypto'
import { verifyMercadoPagoSignature } from '../api/_lib/mp-signature.js'
const read = path => fs.readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('EV03 incorpora cargos reales, pagos parciales y auditoría',()=>{
  const migration = read('supabase/07_cobros_reportes_pago_online.sql')
  const action = read('supabase/03_actions.sql')
  const page = read('supabase/02_pages.sql')
  for (const table of ['charges','payment_allocations','online_checkout_attempts']) assert.match(migration,new RegExp('create table if not exists public\\.'+table))
  assert.match(migration,/paid_amount<=amount/)
  assert.match(action,/v_amount>ch\.amount-ch\.paid_amount/)
  assert.match(action,/update public\.charges set paid_amount=paid_amount\+v_amount/)
  assert.match(page,/'due_total'/)
  assert.match(page,/'new_members'/)
  assert.match(page,/'monthly'/)
  assert.match(read('src/main.jsx'),/exportCsv/)
})
test('no se exponen credenciales de pagos en React y el webhook requiere firma',()=>{
  for(const f of ['src/main.jsx','src/lib/supabase.js']){
    assert.doesNotMatch(read(f),/MP_ACCESS_TOKEN|MP_WEBHOOK_SECRET|SUPABASE_SERVICE_ROLE_KEY/)
  }
  assert.match(read('api/mercadopago-webhook.js'),/verifyMercadoPagoSignature/)
  assert.match(read('api/mercadopago-webhook.js'),/api\.mercadopago\.com\/v1\/payments/)
  assert.match(read('supabase/07_cobros_reportes_pago_online.sql'),/to service_role/)
  assert.doesNotMatch(read('supabase/07_cobros_reportes_pago_online.sql'),/to authenticated;/)
  assert.match(read('api/start-checkout.js'),/charge\?\.member_id !== profile\.member_id/)
})
test('HMAC de Mercado Pago válido e inválido',()=>{
  const paymentId='123456789'; const requestId='abc-def';const ts='1731941012345';const secret='test-firmado'
  const message=`id:${paymentId};request-id:${requestId};ts:${ts};`
  const digest=createHmac('sha256',secret).update(message).digest('hex')
  const opts={ signature:`ts=${ts},v1=${digest}`,requestId,paymentId,secret }
  assert.equal(verifyMercadoPagoSignature(opts),true)
  assert.equal(verifyMercadoPagoSignature({...opts,paymentId:'987654321'}),false)
  assert.equal(verifyMercadoPagoSignature({...opts,secret:'otro'}),false)
  assert.equal(verifyMercadoPagoSignature({...opts,signature:'v1=invalid'}),false)
})
test('la creación de cargos nunca cobra ni renueva automáticamente',()=>{
  const action=read('supabase/03_actions.sql')
  const from=action.indexOf("p_action ~ '^/members/[0-9]+/charge$'")
  const to=action.indexOf("elsif p_action='/payments/new'",from)
  const chunk=action.slice(from,to)
  assert.ok(from>=0)
  assert.match(chunk,/v\.role<>'admin'/)
  assert.match(chunk,/insert into public\.charges/)
  assert.doesNotMatch(chunk,/insert into public\.memberships/)
  assert.doesNotMatch(chunk,/insert into public\.payments/)
})
test('la documentación EV03 cubre las seis categorías, 10 riesgos y controles',()=>{
  const doc=read('EV03_INFORME_Y_MATRIZ.md')
  for(const term of ['Plataforma nube','Base de datos','Autenticación','Almacenamiento','Facturación','Seguridad','Ley 21.459','OWASP','R01','R10','CU01','CU16']) assert.ok(doc.includes(term),term)
})
