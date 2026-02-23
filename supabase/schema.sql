-- Run this file in the Supabase SQL editor.
-- Safe to run multiple times.

create table if not exists public.nurse_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'Registered Nurse (RN)',
  phone text,
  location text not null,
  bio text not null,
  hourly_rate numeric(10,2) not null check (hourly_rate > 0),
  profile_photo_url text not null,
  license_photo_url text not null,
  verified boolean not null default false,
  contact_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Migration safety for projects that already created the older schema.
alter table public.nurse_profiles drop column if exists license_number;
alter table public.nurse_profiles add column if not exists profile_photo_url text;
alter table public.nurse_profiles add column if not exists license_photo_url text;
update public.nurse_profiles
set profile_photo_url = coalesce(profile_photo_url, '')
where profile_photo_url is null;
update public.nurse_profiles
set license_photo_url = coalesce(license_photo_url, '')
where license_photo_url is null;
alter table public.nurse_profiles alter column profile_photo_url set not null;
alter table public.nurse_profiles alter column license_photo_url set not null;

create or replace function public.set_nurse_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists nurse_profiles_set_updated_at on public.nurse_profiles;
create trigger nurse_profiles_set_updated_at
before update on public.nurse_profiles
for each row execute function public.set_nurse_profiles_updated_at();

create or replace function public.handle_new_nurse_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.nurse_profiles (
    id,
    full_name,
    role,
    phone,
    location,
    bio,
    hourly_rate,
    profile_photo_url,
    license_photo_url,
    verified,
    contact_email
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New Nurse'),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'Registered Nurse (RN)'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'location', ''), 'Not provided'),
    coalesce(nullif(new.raw_user_meta_data ->> 'bio', ''), 'Bio pending'),
    coalesce(nullif(new.raw_user_meta_data ->> 'hourly_rate', '')::numeric, 1),
    coalesce(nullif(new.raw_user_meta_data ->> 'profile_photo_url', ''), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'license_photo_url', ''), ''),
    false,
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role,
    phone = excluded.phone,
    location = excluded.location,
    bio = excluded.bio,
    hourly_rate = excluded.hourly_rate,
    profile_photo_url = excluded.profile_photo_url,
    license_photo_url = excluded.license_photo_url,
    contact_email = excluded.contact_email,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_nurse_profile on auth.users;
create trigger on_auth_user_created_nurse_profile
after insert on auth.users
for each row execute procedure public.handle_new_nurse_profile();

alter table public.nurse_profiles enable row level security;

drop policy if exists "Public can read verified nurse profiles" on public.nurse_profiles;
create policy "Public can read verified nurse profiles"
on public.nurse_profiles
for select
to anon, authenticated
using (verified = true);

drop policy if exists "Nurses can read own profile" on public.nurse_profiles;
create policy "Nurses can read own profile"
on public.nurse_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Nurses can update own profile" on public.nurse_profiles;
create policy "Nurses can update own profile"
on public.nurse_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Storage bucket for uploaded RN license photos.
insert into storage.buckets (id, name, public)
values ('nurse-license-photos', 'nurse-license-photos', true)
on conflict (id) do update set public = excluded.public;

-- Storage bucket for public nurse profile photos.
insert into storage.buckets (id, name, public)
values ('nurse-profile-photos', 'nurse-profile-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can upload nurse license photos" on storage.objects;
create policy "Anyone can upload nurse license photos"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'nurse-license-photos');

drop policy if exists "Anyone can upload nurse profile photos" on storage.objects;
create policy "Anyone can upload nurse profile photos"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'nurse-profile-photos');

drop policy if exists "Anyone can read nurse license photos" on storage.objects;
create policy "Anyone can read nurse license photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'nurse-license-photos');

drop policy if exists "Anyone can read nurse profile photos" on storage.objects;
create policy "Anyone can read nurse profile photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'nurse-profile-photos');

-- Verification should happen by admin workflow:
-- update public.nurse_profiles
-- set verified = true
-- where id = '<user_id>';
