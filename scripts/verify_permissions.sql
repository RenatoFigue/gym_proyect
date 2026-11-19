-- Ejecutar con cuenta administrativa en SQL Editor.
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in
 ('members','profiles','payments','charges','payment_allocations','online_checkout_attempts');
select proname, has_function_privilege('authenticated',p.oid,'execute') as authenticated_can_execute,
 has_function_privilege('anon',p.oid,'execute') as anonymous_can_execute,
 has_function_privilege('service_role',p.oid,'execute') as service_role_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('gym_page','gym_action','gym_confirm_external_payment');
-- Resultado esperado: gym_page/gym_action para authenticated sí, anon no;
-- gym_confirm_external_payment para service_role sí, otros no.
