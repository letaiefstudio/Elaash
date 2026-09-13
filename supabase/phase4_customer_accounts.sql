-- Elaash Phase 4: Customer accounts, My Elaash, appointments and customer packages.
-- Run once in Supabase SQL Editor AFTER the Phase 2 migration.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'phone','')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill profiles for Auth users that existed before this migration.
insert into public.profiles (id, email, full_name, phone)
select id, email, nullif(raw_user_meta_data->>'full_name',''), nullif(raw_user_meta_data->>'phone','')
from auth.users
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  package_id uuid references public.package_offers(id) on delete set null,
  appointment_date date not null,
  appointment_time time,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled','no_show')),
  notes text,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_packages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.package_offers(id) on delete restrict,
  sessions_total integer not null default 1 check (sessions_total > 0),
  sessions_used integer not null default 0 check (sessions_used >= 0),
  starts_on date,
  expires_on date,
  status text not null default 'active' check (status in ('active','completed','expired','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sessions_used <= sessions_total)
);

alter table public.profiles enable row level security;
alter table public.appointments enable row level security;
alter table public.customer_packages enable row level security;

-- Customer profile access.
drop policy if exists "Customers can view own profile" on public.profiles;
create policy "Customers can view own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "Customers can update own profile" on public.profiles;
create policy "Customers can update own profile" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Customers only see their own appointments; admin can manage all.
drop policy if exists "Customers can view own appointments" on public.appointments;
create policy "Customers can view own appointments" on public.appointments for select to authenticated using (customer_id = auth.uid() or public.is_admin());
drop policy if exists "Admin can manage appointments" on public.appointments;
create policy "Admin can manage appointments" on public.appointments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Customers only see their own assigned packages; admin can manage all.
drop policy if exists "Customers can view own packages" on public.customer_packages;
create policy "Customers can view own packages" on public.customer_packages for select to authenticated using (customer_id = auth.uid() or public.is_admin());
drop policy if exists "Admin can manage customer packages" on public.customer_packages;
create policy "Admin can manage customer packages" on public.customer_packages for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, update on public.profiles to authenticated;
grant select on public.appointments to authenticated;
grant select on public.customer_packages to authenticated;
grant insert, update, delete on public.appointments to authenticated;
grant insert, update, delete on public.customer_packages to authenticated;

-- Keep timestamps current.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();
drop trigger if exists customer_packages_set_updated_at on public.customer_packages;
create trigger customer_packages_set_updated_at before update on public.customer_packages for each row execute function public.set_updated_at();

-- IMPORTANT SECURITY UPGRADE NOW THAT CUSTOMERS CAN SIGN IN:
-- Phase 2 allowed every authenticated user to manage packages. Replace that with admin-only writes.
drop policy if exists "Authenticated can manage package offers" on public.package_offers;
create policy "Admins can manage package offers" on public.package_offers for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Authenticated can manage package service links" on public.package_offer_services;
create policy "Admins can manage package service links" on public.package_offer_services for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage writes for package images are admin-only now.
drop policy if exists "Authenticated can upload offer images" on storage.objects;
create policy "Admins can upload offer images" on storage.objects for insert to authenticated with check (bucket_id = 'offer-images' and public.is_admin());
drop policy if exists "Authenticated can update offer images" on storage.objects;
create policy "Admins can update offer images" on storage.objects for update to authenticated using (bucket_id = 'offer-images' and public.is_admin()) with check (bucket_id = 'offer-images' and public.is_admin());
drop policy if exists "Authenticated can delete offer images" on storage.objects;
create policy "Admins can delete offer images" on storage.objects for delete to authenticated using (bucket_id = 'offer-images' and public.is_admin());

-- Set your EXISTING admin Auth user to admin after running this file:
-- update public.profiles set role = 'admin' where email = 'YOUR-ADMIN-EMAIL@example.com';

-- Lock the existing catalogue admin writes to admin profiles as well.
-- This removes any older broad authenticated write policies without relying on their exact names.
do $$
declare p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('services','service_categories')
      and cmd <> 'SELECT'
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage service categories" on public.service_categories;
create policy "Admins can manage service categories" on public.service_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Lock service image writes to admins while keeping existing public read access.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd <> 'SELECT'
      and (coalesce(qual,'') ilike '%service-images%' or coalesce(with_check,'') ilike '%service-images%')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

drop policy if exists "Admins can upload service images" on storage.objects;
create policy "Admins can upload service images" on storage.objects for insert to authenticated with check (bucket_id = 'service-images' and public.is_admin());
drop policy if exists "Admins can update service images" on storage.objects;
create policy "Admins can update service images" on storage.objects for update to authenticated using (bucket_id = 'service-images' and public.is_admin()) with check (bucket_id = 'service-images' and public.is_admin());
drop policy if exists "Admins can delete service images" on storage.objects;
create policy "Admins can delete service images" on storage.objects for delete to authenticated using (bucket_id = 'service-images' and public.is_admin());
