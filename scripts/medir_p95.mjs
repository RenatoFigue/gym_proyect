/** Verificación NO destructiva de latencia RPC con concurrencia (RNF04/RNF08/RNF15...).
 * Configurar variables de entorno en la terminal, no en archivos del frontend:
 *  SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SESSION_JWT
 *  RPC_PATH=/reports (o /my/membership, /classes, /my/attendance, etc.)
 */
const url=process.env.SUPABASE_URL
const key=process.env.SUPABASE_PUBLISHABLE_KEY
const jwt=process.env.SUPABASE_SESSION_JWT
const path=process.env.RPC_PATH||'/reports'
if (!url?.startsWith('https://') || !key || !jwt) {
  console.error('Faltan SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY o SUPABASE_SESSION_JWT'); process.exit(2)
}
const iterations=100
const concurrency=20
let next=0
const durations=[]
const errors=[]
async function worker(){
  while(next<iterations){
    next++
    const start=performance.now()
    try {
      const reply=await fetch(url.replace(/\/$/,'')+'/rest/v1/rpc/gym_page',{
        method:'POST',headers:{
          apikey:key,Authorization:`Bearer ${jwt}`,'Content-Type':'application/json'
        },body:JSON.stringify({p_path:path,p_query:{}}),signal:AbortSignal.timeout(30000)
      })
      if(!reply.ok)errors.push(reply.status)
      await reply.text()
    } catch(e){errors.push(e.name)}
    durations.push(performance.now()-start)
  }
}
await Promise.all(Array.from({length:concurrency},()=>worker()))
durations.sort((a,b)=>a-b)
const p95=durations[Math.ceil(durations.length*.95)-1]
console.log(JSON.stringify({path,iterations,concurrency,p95_ms:Math.round(p95),errors:errors.length,mean_ms:Math.round(durations.reduce((a,b)=>a+b,0)/durations.length)},null,2))
if(errors.length)process.exitCode=1
