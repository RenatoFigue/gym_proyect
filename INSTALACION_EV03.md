# Guía de actualización de GymControl — EV03

## 1. Antes de aplicar las migraciones

- **Respalda la base de datos Supabase actual.** En SQL Editor no ejecutes `DROP TABLE` ni elimines usuarios o socios.
- El ZIP no contiene `.env.local` ni credenciales reales. Copia el tuyo de tu carpeta anterior a la nueva, sin compartirlo.
- Comprueba que estás conectado al proyecto Supabase de GymControl que ya tiene `profiles`, `members`, `payments`.

## 2. Supabase SQL Editor: instalación existente

Ejecuta los scripts en **este orden** en consultas separadas:

1. `supabase/07_cobros_reportes_pago_online.sql` — crea `charges`, `payment_allocations`, `online_checkout_attempts` y una RPC restringida al servidor. **No borra datos**.
2. `supabase/02_pages.sql` — añade consultas de cargos, saldos y reportes históricos al servidor.
3. `supabase/03_actions.sql` — añade creación/anulación de cargos y abonos parciales en la misma transacción.

Si tu base antigua aún no tiene las migraciones 05/06, ejecútalas primero (`05_actualizacion_instalacion_existente.sql`, `06_registro_socios_automatico.sql`). **No ejecutes `01_schema.sql` otra vez para intentar actualizar**.

### Proyecto nuevo

En un proyecto Supabase vacío, ejecuta: `01_schema.sql`, `07_cobros_reportes_pago_online.sql`, `02_pages.sql`, `03_actions.sql`. Después crea al primer administrador como se explica en `04_setup_usuarios.sql`.

### Confirmar que las tablas y RLS están instalados

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in
('charges','payment_allocations','online_checkout_attempts');

select routine_name from information_schema.routines
where routine_schema='public' and routine_name in
('gym_page','gym_action','gym_confirm_external_payment');
```

`rowsecurity` debe ser `true`. No confundas esta comprobación con una auditoría completa de privilegios.

## 3. Windows / Visual Studio Code

En la carpeta con `package.json`:

```powershell
npm install
npm test
npm run build
npm run dev
```

Abre `http://127.0.0.1:5173`. Entra con la cuenta administradora de Supabase que ya creaste. No hace falta crear usuarios nuevos por la migración financiera.

## 4. Cómo usar los módulos nuevos

| Perfil | Apartado | Operación |
|---|---|---|
| Administrador | Socios y membresías → Abrir ficha | **Crear cargo interno** CLP, concepto y fecha de vencimiento |
| Administrador | Finanzas | Ver cargos, saldos y abonos. Anular únicamente cargos sin pagos |
| Recepcionista | Registrar pago | Elegir socio, elegir **cargo al que abonar** y escribir importe (total o parcial) |
| Socio | Mis pagos y deudas | Ver sus cargos, saldos, comprobantes y —si está habilitado— botón de checkout |
| Administrador | Reportes | Filtros históricos, nuevo socio, deuda, ingreso mensual, reservas, asistencia, CSV |

### Ejemplo para verificar abonos

Administrador crea cargo por CLP 20.000. Recepción registra CLP 8.000 y asocia el cargo: saldo CLP 12.000 (`partial`). Recibe otros CLP 12.000: saldo 0 (`paid`). Intentar un tercer abono debe rechazarse.

## 5. Pago por Internet: OPCIONAL, desactivado por defecto

Hay código para Checkout Pro de Mercado Pago, pero **no cobra hasta que lo configures y pruebes**. Para una demostración sin cobros reales puedes mantenerlo apagado.

En `.env.local`:

```env
VITE_ONLINE_PAYMENTS_ENABLED=false
# Sólo al operar en URL pública HTTPS y con credenciales propias:
# MP_ACCESS_TOKEN=APP_USR-...
# MP_WEBHOOK_SECRET=...
# MP_WEBHOOK_URL=https://TU-SITIO.vercel.app/api/mercadopago-webhook
# PUBLIC_APP_URL=https://TU-SITIO.vercel.app
# MP_SANDBOX=true
```

**Nunca** publiques ni pongas `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` o `SUPABASE_SERVICE_ROLE_KEY` dentro de archivos `src/`, HTML o variables con el prefijo `VITE_`. La opción `VITE_ONLINE_PAYMENTS_ENABLED=true` solo muestra el botón, no otorga permiso ni confirma pagos. Úsala cuando esté listo el servidor.

En Vercel las variables secretas deben establecerse bajo **Environment Variables** y no necesitan GitHub (`vercel deploy --prod`). El endpoint público HTTPS para notificaciones se configura también en Mercado Pago.

El webhook verifica la firma, recupera el estado del pago desde la API oficial y ejecuta una transacción única que aplica el importe al cargo; no se acepta la redirección del navegador como confirmación. Si el saldo cambió por un pago simultáneo, el sistema rechaza la imputación automática y el caso requiere **conciliación manual**. En un escenario real debe implementarse además el tratamiento de reembolsos y contracargos con procedimientos comerciales definidos.

## 6. Probar la funcionalidad y seguridad (recomendado antes de desplegar)

- Tres perfiles separados; un socio no puede pedir información de otro ni llamar `/staff`.
- Dos recepcionistas no pueden sobrepasar cupos al reservar el último lugar.
- Pago parcial más segundo abono no exceden el monto del cargo; intento con otro socio se rechaza.
- Reportes y CSV respetan fechas; el estado `confirmed` es el único sumado como ingreso real.
- Restaurar copia de prueba y medir RTO, disponibilidad y P95 bajo carga de 20 usuarios.

Los indicadores RNF03, RNF04, RNF08, RNF11, RNF12, RNF13, RNF15, RNF21, RNF22, RNF25, RNF29, RNF31, RNF33, RNF37 no se consideran validados por el simple hecho de ejecutar los scripts. Consulta `EV03_INFORME_Y_MATRIZ.md`.

## 7. Utilidades de medición y respaldo incluidas

- `scripts/backup_supabase.ps1`: realiza un `pg_dump` en formato custom y comprueba su listado, **no certifica** que el backup se pueda restaurar. Requiere cliente de PostgreSQL, conexión permitida y variable `PG_BACKUP_URL` guardada fuera del proyecto. Programar diariamente en Task Scheduler **solo tras probar una restauración completa** en una base de pruebas y asegurar retención/cifrado fuera del PC.
- `scripts/medir_p95.mjs`: 100 consultas RPC concurrentes (20 trabajadores) y P95 orientativo. Ejecútalo con JWT de una cuenta **de pruebas**; no compartas el JWT. Sirve para detectar problemas, pero la rúbrica requiere medir diferentes operaciones/cargas representativas y con 10.000 registros donde corresponde.
- `scripts/verify_permissions.sql`: inspecciona RLS y permisos de ejecución de funciones.

**No pases variables privadas por argumentos publicados ni guardes credenciales en GitHub.**
