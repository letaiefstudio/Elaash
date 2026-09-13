-- Elaash Phase 2: Offers & Packages
-- Run once in Supabase SQL Editor.

create table if not exists public.package_offers (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  offer_price text not null default '0',
  image_url text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.package_offer_services (
  package_id uuid not null references public.package_offers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  primary key (package_id, service_id)
);

alter table public.package_offers enable row level security;
alter table public.package_offer_services enable row level security;

drop policy if exists "Public can view active package offers" on public.package_offers;
create policy "Public can view active package offers"
on public.package_offers for select
to anon, authenticated
using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "Authenticated can manage package offers" on public.package_offers;
create policy "Authenticated can manage package offers"
on public.package_offers for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can view package service links" on public.package_offer_services;
create policy "Public can view package service links"
on public.package_offer_services for select
to anon, authenticated
using (
  exists (
    select 1 from public.package_offers p
    where p.id = package_id and (p.is_active = true or auth.role() = 'authenticated')
  )
);

drop policy if exists "Authenticated can manage package service links" on public.package_offer_services;
create policy "Authenticated can manage package service links"
on public.package_offer_services for all
to authenticated
using (true)
with check (true);

grant select on public.package_offers to anon;
grant select on public.package_offer_services to anon;
grant select, insert, update, delete on public.package_offers to authenticated;
grant select, insert, update, delete on public.package_offer_services to authenticated;

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists package_offers_set_updated_at on public.package_offers;
create trigger package_offers_set_updated_at
before update on public.package_offers
for each row execute function public.set_updated_at();

-- Separate public Storage bucket for offer/package images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-images',
  'offer-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view offer images" on storage.objects;
create policy "Public can view offer images"
on storage.objects for select
to public
using (bucket_id = 'offer-images');

drop policy if exists "Authenticated can upload offer images" on storage.objects;
create policy "Authenticated can upload offer images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'offer-images');

drop policy if exists "Authenticated can update offer images" on storage.objects;
create policy "Authenticated can update offer images"
on storage.objects for update
to authenticated
using (bucket_id = 'offer-images')
with check (bucket_id = 'offer-images');

drop policy if exists "Authenticated can delete offer images" on storage.objects;
create policy "Authenticated can delete offer images"
on storage.objects for delete
to authenticated
using (bucket_id = 'offer-images');
