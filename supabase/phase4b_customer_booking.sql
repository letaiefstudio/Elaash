-- Elaash Phase 4B: allow signed-in customers to create their own appointments.
-- Run once in Supabase SQL Editor after phase4_customer_accounts.sql.

alter table public.appointments enable row level security;

drop policy if exists "Customers can create own appointments" on public.appointments;
create policy "Customers can create own appointments"
on public.appointments
for insert
to authenticated
with check (customer_id = auth.uid());

grant insert on public.appointments to authenticated;
