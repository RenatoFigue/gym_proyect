-- EV03: migración ADITIVA sobre una instalación existente; no borra registros.
-- Requiere 01_schema y 05/06 de la versión anterior aplicados.
-- Ejecutar ANTES de los 02_pages.sql y 03_actions.sql actualizados.
-- Los cargos son obligaciones internas, NO documentos tributarios del SII.
create table if not exists public.charges (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id),
  concept text not null,
  amount bigint not null check (amount>0),
  paid_amount bigint not null default 0 check (paid_amount>=0),
  due_on date not null,
  status text not null default 'pending' check (status in ('pending','partial','paid','void')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (paid_amount<=amount),
  check ((status='pending' and paid_amount=0) or
         (status='partial' and paid_amount>0 and paid_amount<amount) or
         (status='paid' and paid_amount=amount) or
         (status='void' and paid_amount=0))
);
create index if not exists ix_charges_member_due on public.charges(member_id,due_on);
create index if not exists ix_charges_pending on public.charges(due_on) where status in ('pending','partial');

create table if not exists public.payment_allocations (
  payment_id bigint primary key references public.payments(id),
  charge_id bigint not null references public.charges(id),
  amount bigint not null check (amount>0),
  created_at timestamptz not null default now()
);
create index if not exists ix_payment_allocations_charge on public.payment_allocations(charge_id);

create table if not exists public.online_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  charge_id bigint not null references public.charges(id),
  member_id bigint not null references public.members(id),
  amount bigint not null check (amount>0),
  preference_id text unique,
  provider_payment_id text unique,
  status text not null default 'created' check (status in ('created','confirmed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ix_checkout_charge on public.online_checkout_attempts(charge_id,created_at desc);

-- Acceso exclusivamente a través de funciones autorizadas/servicio Node.
do $$ declare t text; begin
 foreach t in array array['charges','payment_allocations','online_checkout_attempts'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on table public.%I from public, anon, authenticated',t);
 end loop;
end $$;

-- Esta RPC es SOLO para el webhook verificado del servidor con service_role.
-- No puede ejecutarse por un socio ni por una clave publicable.
create or replace function public.gym_confirm_external_payment(
 p_attempt uuid, p_provider_payment text, p_amount bigint, p_currency text,
 p_provider_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 a public.online_checkout_attempts%rowtype;
 ch public.charges%rowtype;
 pid bigint;
 due_today date := (now() at time zone 'America/Santiago')::date;
begin
 if p_provider_payment !~ '^[0-9]{1,30}$' or p_currency <> 'CLP' then
   raise exception 'Referencia externa o moneda no válida';
 end if;
 select * into a from public.online_checkout_attempts where id=p_attempt for update;
 if not found then raise exception 'Intento de pago no encontrado'; end if;
 if a.status='confirmed' then
   if a.provider_payment_id=p_provider_payment then return jsonb_build_object('status','already_confirmed'); end if;
   raise exception 'Intento ya confirmado con otra transacción';
 end if;
 if p_provider_status not in ('approved','rejected','cancelled') then
   return jsonb_build_object('status','pending');
 end if;
 if p_provider_status <> 'approved' then
   update public.online_checkout_attempts set status='failed',updated_at=now() where id=a.id;
   return jsonb_build_object('status','not_approved');
 end if;
 if a.status='failed' then raise exception 'Intento cerrado: revisar manualmente'; end if;
 if p_amount <> a.amount then raise exception 'El monto de pago no coincide con el intento'; end if;
 select * into ch from public.charges where id=a.charge_id for update;
 if not found or ch.member_id <> a.member_id or ch.status not in ('pending','partial') then
   raise exception 'Cargo no disponible o titular incorrecto';
 end if;
 if ch.amount-ch.paid_amount <> p_amount then
   raise exception 'Saldo cambió desde que se generó la preferencia: revisión manual';
 end if;
 insert into public.payments(public_id,member_id,concept,amount,method,status,reference,paid_on,created_by)
 values ('MP-'||p_provider_payment,a.member_id,ch.concept,p_amount,'Mercado Pago','confirmed',
         'MP:'||p_provider_payment,due_today,
         (select id from public.profiles where member_id=a.member_id and role='socio' limit 1))
 returning id into pid;
 insert into public.payment_allocations(payment_id,charge_id,amount) values(pid,ch.id,p_amount);
 update public.charges set paid_amount=paid_amount+p_amount,status='paid' where id=ch.id;
 update public.online_checkout_attempts set status='confirmed',provider_payment_id=p_provider_payment,
   updated_at=now() where id=a.id;
 insert into public.audit_log(actor_id,action,entity,entity_id,details)
   values ((select id from public.profiles where member_id=a.member_id and role='socio' limit 1),
           'PAGO_ONLINE_CONFIRMADO','payment',pid,'Proveedor: Mercado Pago');
 return jsonb_build_object('status','confirmed','payment_id',pid);
exception when unique_violation then
  -- No crear un segundo pago para la misma transacción externa.
  return jsonb_build_object('status','duplicate_external_payment');
end;
$$;
revoke all on function public.gym_confirm_external_payment(uuid,text,bigint,text,text)
 from public,anon,authenticated;
grant execute on function public.gym_confirm_external_payment(uuid,text,bigint,text,text) to service_role;
