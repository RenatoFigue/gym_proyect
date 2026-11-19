# GymControl — Informe técnico y matriz de cumplimiento EV03

**Asignatura:** Ingeniería de Software · **Rúbrica:** `Plantilla_Escala_EV03-2026 (1).xlsx` · **Versión:** EV03, noviembre de 2026.
**Fuentes académicas:** `Informe Ev.II INGSF.docx`, `Entrevista al dueño simulado.docx` y `Especificaciones CU.docx`. Esta entrega preserva el proyecto React/Vite/Supabase y sus tres actores: administrador, recepcionista y socio.

> **Alcance y honestidad de la evidencia:** este informe describe código y funcionalidades programadas. No demuestra que la instalación del alumno cumpla los porcentajes de disponibilidad, respaldo, P95 ni que la plataforma esté lista para operar con datos reales. Las integraciones que requieren credenciales, pruebas de carga, restauración y revisión legal/tributaria figuran expresamente como pendientes de validación.

## 1. Matriz de los 10 indicadores EV03

| Indicador (10 % c/u) | Evidencia preparada | Estado verificable |
|---|---|---|
| 1. Cumple el 100 % de RF/RNF anteriores | `src/main.jsx`, `supabase/02_pages.sql`, `03_actions.sql`, `07_cobros_reportes_pago_online.sql`, API online, esta matriz | **Parcial**: faltan pruebas P95, respaldos y pasarela real |
| 2. Navegación fluida, clara y consistente | React SPA con roles; menús originales; rutas a recibos, socios, personal, reportes | **Implementado en código; prueba visual pendiente** |
| 3. Tres roles con vistas y restricciones | `profiles.role`; comprobación PostgreSQL (`auth.uid()`), API servidor con token | **Implementado en código; probar con 3 cuentas** |
| 4. Colores y tipografía adecuados | `src/style.css` original oscuro/verde lima preservado | **Conservado; revisión visual en navegador pendiente** |
| 5. Stack tecnológico indicado | Node.js, React 19, Vite, Supabase, Vercel; VS Code como editor | **Configurado; despliegue no comprobado** |
| 6. Seis categorías tecnológicas | Apartado 2 de este informe | **Documentado** |
| 7. Elección justificada de 6/6 tecnologías | Apartado 2, ventajas y límites | **Documentado** |
| 8. Norma: origen, objetivos, alcance y ejemplo | Apartado 3, Ley 21.459 | **Documentado** |
| 9. Diez riesgos y tres priorizados | Apartado 4 | **Documentado** |
| 10. OWASP: definición, utilidad y tres controles | Apartado 5 + controles en código | **Documentado/implementado parcialmente; requiere pentest** |

## 2. Seis categorías tecnológicas, elección y justificación

| Categoría | Tecnología elegida | ¿Por qué para GymControl? | Límite / precaución |
|---|---|---|---|
| **Plataforma nube** | **Vercel** (hosting del React compilado y API Node serverless), **Supabase** (servicios gestionados) | Publicación accesible por Internet sin abrir puertos, escalado gestionado, separación cliente-servidor | Depende de Internet, cuota, región, disponibilidad contractual. Vercel no sustituye un backend seguro. |
| **Base de datos** | **PostgreSQL en Supabase** (DBaaS) | Relaciones y transacciones para cargos, pagos, reservas, historiales; restricciones SQL e índices | Planificar respaldos, migraciones, restauración y pruebas de carga; plan gratuito no equivale a SLA. |
| **Autenticación** | **Supabase Auth** | Identidad por UUID, sesión JWT, restablecimiento de contraseña, integración con perfiles de tres roles | No mostrar contraseñas; validar roles por operación. Cuentas con correos ficticios solo para pruebas. |
| **Almacenamiento** | **PostgreSQL** para registros y comprobantes internos; **Supabase Storage** solo si se incorporan archivos | Evitar duplicar infraestructura innecesaria; los recibos se generan desde datos. Storage sería útil para archivos adjuntos | La app NO implementa subida de archivos ni política de retención de objetos; no afirmar que Storage está operativo. |
| **Facturación** | Registro interno de cargos, abonos y comprobantes; pasarela opcional **Mercado Pago Checkout Pro** | Puede conciliar importes y deudas sin manejar números de tarjeta; los cargos admiten pagos parciales en recepción | **No emite boletas/facturas tributarias electrónicas del SII.** DTE/SII requiere integración y autorización adicionales. Cobros online desactivados sin credenciales reales y webhook probado. |
| **Seguridad** | RLS activado, permisos DB/RPC, JWT, validaciones, HTTPS en hosting, auditoría y firma HMAC webhook | Controlar operaciones críticas por rol y evitar confirmaciones de pago falsas | No confundir configuración con garantía de cumplimiento: auditar permisos, vulnerabilidades, backup y monitoreo. |

**Conceptos cloud:** *Cloud Computing* es la entrega remota de computación y almacenamiento; *SaaS* es el software que usa el gimnasio desde el navegador; *IaaS* alquila infraestructura administrada por quien la contrata. Aquí se utilizan sobre todo servicios gestionados/PaaS/DBaaS y serverless; no se ha contratado un servidor IaaS propio.

**Diagrama actualizado (texto):** navegador (React + Vite compilado) → HTTPS → Vercel (SPA, funciones Node) → HTTPS → Supabase Auth/PostgreSQL. Para pagos online habilitados: Vercel crea preferencia Mercado Pago → navegador sale a checkout externo → webhook firmado vuelve a Vercel → consulta a API del proveedor → RPC PostgreSQL actualiza cargo/pago. El retorno del navegador **no autoriza** el cobro por sí solo.

## 3. Normativa chilena de delitos informáticos: cuatro elementos

**Norma:** Ley N.º **21.459**, publicada en Chile en 2022, que moderniza los delitos informáticos y adapta la normativa al Convenio de Budapest (fuente oficial: Biblioteca del Congreso Nacional de Chile: https://www.bcn.cl/leychile/navegar?idNorma=1177743 ).

1. **Origen:** la necesidad de adaptar los tipos penales nacionales frente a ciberdelitos y estándares de cooperación internacional del Convenio de Budapest.
2. **Objetivos:** sancionar conductas ilegítimas contra sistemas, datos y operaciones digitales, reforzando protección y persecución penal.
3. **Alcance:** incluye acceso ilícito, ataques a la integridad de sistemas o datos, interceptación ilícita, falsificación y fraude informático, receptación de datos y abuso de dispositivos, con requisitos y sanciones según cada tipo penal.
4. **Ejemplo en GymControl:** una persona que accede sin autorización a cuentas de socios y altera registros de pagos podría cometer delitos asociados al acceso ilícito y/o ataque a datos, según hechos y elementos del tipo penal. Por prevención, GymControl valida el rol en PostgreSQL, restringe registros y mantiene auditoría. Esta ejemplificación académica **no constituye calificación jurídica de un caso real**.

También debe respetarse la normativa aplicable de protección de datos personales y obligaciones tributarias antes de gestionar clientes reales. El prototipo por sí solo no certifica cumplimiento legal.

## 4. Diez riesgos informáticos del proyecto

| Código | Riesgo | Cómo afecta a GymControl | Medida / evidencia |
|---|---|---|---|
| **R01** | Acceso indebido entre roles | Socio consulta pagos ajenos o controla recepción | RPC valida `auth.uid()` y `profiles.role`; API valida JWT y titularidad |
| **R02** | Robo de sesión/credenciales | Suplantación de recepcionista o administrador | Supabase Auth, sesiones y recuperación; pendiente MFA para admin |
| **R03** | Pago falso o repetido | Se salda deuda sin transacción real | Webhook con HMAC, consulta al proveedor, referencia única y transacción DB |
| **R04** | Reserva duplicada/sobrecupo | Saturación de clases y reclamos | Bloqueos `FOR UPDATE` y controles de cupo, horario y titular |
| **R05** | Pérdida de base de datos | Se pierden socios, pagos y asistencias | **Pendiente:** respaldos diarios y prueba de restauración <=4h |
| **R06** | Fuga de información personal | Exposición de nombre, correo, historial | RLS sin acceso directo, secretos en servidor, HTTPS |
| **R07** | Exposición de claves privadas | Control total de Auth/BD por atacante | `.gitignore`, claves solo en servidor, inspección de configuración de Vercel |
| **R08** | Caída del proveedor/nube | Gimnasio no registra acceso ni pagos | **Pendiente:** plan de contingencia y medición 99,5 % |
| **R09** | SQL/entradas maliciosas | Datos incorrectos, acciones no deseadas | Parámetros RPC, validaciones de formularios, SQL sin concatenación de texto de usuarios |
| **R10** | Errores de actualización/duplicación | La misma deuda se descuenta dos veces o se pierde abono | Transacciones PostgreSQL, pagos únicos, asignación única e historiales |

**Tres riesgos prioritarios seleccionados:**

- **R01, autorización:** afecta directamente confidencialidad e integridad de los datos de >100 socios; prioridad *alta* por impacto y exposición web. Control preventivo: autorización en cada RPC/endpoint, no solo ocultar botones.
- **R03, fraude de pagos:** riesgo *alto* por pérdida financiera y membresías habilitadas indebidamente. El proveedor debe confirmar servidor-servidor, aplicando monto/moneda/propiedad y deduplicación. Realizar prueba de webhook antes de activar.
- **R05, pérdida de datos:** riesgo *alto* por imposibilidad de operar y recuperar el historial. Copias diarias y restauración probada son requisito formal RNF03/RNF11/RNF21; aún no están demostradas.

## 5. OWASP: qué es, para qué sirve y controles aplicables

**OWASP (Open Worldwide Application Security Project)** es una comunidad abierta que publica guías para mejorar la seguridad de aplicaciones. El **OWASP Top 10:2025** identifica categorías de riesgos frecuentes; sirve para orientar diseño, revisión y pruebas. Fuente: https://top10.owasp.org/2025/0x00_2025-Introduction/ .

| Control aplicable | Relación OWASP | Aplicación en código | Verificación pendiente |
|---|---|---|---|
| **Autorización por rol y titular** | A01:2025 Broken Access Control | `gym_page`, `gym_action`, `authenticatedProfile` y políticas sin SELECT público | Probar 403 desde cada perfil para recursos ajenos |
| **Configuración segura de secretos y API** | A02:2025 Security Misconfiguration | Claves `sb_secret_` y `MP_ACCESS_TOKEN` únicamente en servidor; webhook validado | Auditar entorno de Vercel, cabeceras, HTTPS, CORS, logs |
| **Autenticación y control de cuentas** | A07:2025 Authentication Failures | Supabase Auth + JWT; validación de contraseñas para cuentas iniciales | Reforzar MFA para admin, recuperación segura y no usar correos ficticios en producción |
| **Registro y trazabilidad** | A09:2025 Security Logging and Alerting Failures | `audit_log`, recibos con folio, registros de cargos y pagos | Alertas/retención de logs y revisión de eventos anómalos |

OWASP es guía técnica, no certificación; que exista código para cada control no equivale a demostrar que no hay vulnerabilidades.

## 6. Trazabilidad CU01–CU16 (EV02)

| Caso | Actor | Vista / lógica | Validación que debe probarse |
|---|---|---|---|
| CU01 | Administrador | Socios/membresías; historial | Cambiar plan sin generar pago; fechas válidas |
| CU02 | Administrador | Finanzas/cargos/recibos | Filtros, totales confirmados y deuda pendiente |
| CU03 | Administrador | Clases y horarios | Cruce de sala/instructor; cupo mínimo; cancelación |
| CU04 | Administrador | Reportes | Fechas/filtros, pagos/altas/asistencia/reservas/cargos; CSV |
| CU05 | Administrador | Equipamiento/mantenimiento | Programar/editar/cerrar con auditoría |
| CU06 | Recepcionista | Control de acceso | Registrar una entrada autorizada, bloquear duplicado cercano |
| CU07 | Recepcionista | Verificación previa | Denegar membresía vencida/suspendida/sin cobertura |
| CU08 | Recepcionista | Nuevo socio | Autocódigo, evitar duplicados, Auth + ficha |
| CU09 | Recepcionista | Registrar pago | Pago sin duplicado; cargo vinculado, abono parcial y comprobante |
| CU10 | Recepcionista | Reservas para socio | Cupo, horario, membresía, cancelación antes del inicio |
| CU11 | Socio | Mi membresía | Únicamente membresía propia y fechas |
| CU12 | Socio | Mis pagos y deudas | Cargos propios; checkout solo con merchant configurado; webhook real pendiente de probar |
| CU13 | Socio | Calendario | Fecha/instructor/actividad, estados y cupo |
| CU14 | Socio | Reservar clase | Solo plan válido, sin simultaneidad/sobrecupo |
| CU15 | Socio | Mis reservas | Solo propia, antes de inicio, confirmación |
| CU16 | Socio | Mis asistencias | Período y entradas propias; reserva ≠ asistencia |

## 7. RNF: plan de validación de los 37 requisitos

Requisitos de seguridad, integridad, roles y trazabilidad (RNF01, 02, 05, 06, 07, 09, 10, 14, 16, 17, 18, 19, 20, 23, 24, 26, 27, 28, 30, 32, 34, 35, 36): ejecutar pruebas con tres cuentas y registros ajenos, deduplicación, cierre/rollback de transacciones, lectura de auditoría y teclado. **Pruebas automáticas de estructura en `npm test` NO sustituyen un pentest ni una auditoría de infraestructura.**

**Rendimiento (requieren P95 con 20 usuarios concurrentes):** RNF04 (pagos <=3 s, hasta 10.000), RNF08 (reportes <=5 s, hasta 10.000), RNF12 (entrada <=2 s), RNF15 (verificación <=1 s), RNF22 (20 reservas sin sobrecupo), RNF25 (membresía <=2 s), RNF29 (calendario <=2 s), RNF31 (último cupo), RNF33 (reserva <=3 s), RNF37 (asistencia hasta 12 meses <=3 s). Crear datos ficticios y medir en Vercel/Supabase bajo carga. **No evaluados aquí.**

**Disponibilidad y recuperación:** RNF03, RNF11 y RNF21 exigen **backup diario** y **restauración en <=4 horas**; RNF13 exige disponibilidad >=99,5 % mensual durante apertura. Consultar capacidades del plan Supabase contratado, automatizar exportación segura donde corresponda, mantener copia fuera de la cuenta y ejecutar una restauración en proyecto de pruebas. **No demostrado.**

## 8. Pruebas manuales de aceptación para presentar al profesor

1. Crear administrador real en Supabase; acceso restringido por perfil.
2. Desde administrador crear recepcionista con credenciales de prueba; probar que este no abre `/staff`.
3. Recepción registra socio con autocódigo; sesión socio sólo ve datos propios.
4. Administrador asigna membresía y crea cargo CLP 20.000 con vencimiento.
5. Recepción registra abono CLP 8.000 vinculado al cargo: saldo CLP 12.000.
6. Recepción registra segundo abono CLP 12.000: estado `paid`, saldo 0; un tercero debe rechazarse.
7. Socio comprueba sus cargos, dos recibos y saldo 0. Con pago online desactivado, botón no aparece.
8. Crear clase y reserva; probar cupo lleno y choque de horario; cancelar reserva antes de inicio.
9. Probar acceso con membresía vigente y vencida; verificar historial socio.
10. En Reportes filtrar fechas, exportar ingresos CSV, revisar asistencias/cargos/clases.
11. Para cobro online, usar entorno de pruebas de proveedor con URL HTTPS pública y webhook; probar confirmación duplicada, importe ajeno y pago rechazado. **NO hacer cobros reales hasta validación**.
12. Ejecutar `npm test`, `npm run build`, y pruebas de carga, backup/restauración y accesibilidad.

## 9. Límites e integraciones no resueltas

- Ninguna credencial del comercio Mercado Pago, clave webhook, ni entorno Vercel real está disponible en este ZIP. El código de checkout queda **opcional y desactivado por defecto**.
- Las boletas tributarias/DTE del Servicio de Impuestos Internos no están implementadas. Los comprobantes mostrados son **internos**, como advierte la aplicación.
- Los servicios de respaldo de Supabase dependen del plan y su configuración; no afirmar cumplimiento de RTO 4h sin restauración medida.
- El software no ha sido probado en esta entrega con 20 usuarios simultáneos ni con 10.000 registros; no atribuir cumplimiento de SLA/P95.
- Una cuenta creada con correo inventado para la demostración no permite recuperación por email. Para operación real exigir correo válido y comprobado.
- La emisión automática de mensualidades no se inventa porque la entrevista no determina periodicidad, tarifas ni política de cobro; los cargos son introducidos expresamente por administración.

**Fuentes oficiales adicionales:**
- Supabase (Auth, seguridad y respaldos): https://supabase.com/docs
- Vercel (funciones y despliegues): https://vercel.com/docs
- Mercado Pago Checkout Pro y API de preferencias: https://www.mercadopago.cl/developers/es/reference/online-payments/checkout-pro-preferences/overview
- Mercado Pago notificaciones Webhook: https://www.mercadopago.cl/developers/en/docs/checkout-pro-preferences/payment-notifications
- Chile Ley 21.459: https://www.bcn.cl/leychile/navegar?idNorma=1177743
- OWASP Top 10:2025: https://top10.owasp.org/2025/0x00_2025-Introduction/
