-- Run this file in the Supabase SQL editor.
-- Safe to run multiple times.

-- ============================================================
-- PRD MVP TABLES (Notice-board model)
-- ============================================================

drop table if exists public.users cascade;

create table if not exists public.user_moderation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_suspended boolean not null default false,
  is_banned boolean not null default false,
  moderation_note text,
  moderated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace view public.users as
select
  au.id,
  coalesce(au.email, '') as email,
  case
    when lower(
      coalesce(au.raw_app_meta_data ->> 'account_type', au.raw_user_meta_data ->> 'account_type', '')
    ) = 'admin' then 'admin'
    when lower(
      coalesce(au.raw_app_meta_data ->> 'account_type', au.raw_user_meta_data ->> 'account_type', '')
    ) in ('caregiver', 'offering care', 'offering_care') then 'caregiver'
    else 'client'
  end as role,
  coalesce(um.is_suspended, false) as is_suspended,
  coalesce(um.is_banned, false) as is_banned,
  um.moderation_note,
  um.moderated_at,
  au.created_at,
  coalesce(au.updated_at, au.created_at) as updated_at
from auth.users au
left join public.user_moderation um on um.user_id = au.id;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  full_name text not null,
  service_category text not null default 'home_personal_care' check (service_category in ('home_nursing', 'home_personal_care')),
  service_categories text[] not null default array['home_personal_care']::text[],
  bio text not null default '',
  years_experience integer not null default 0 check (years_experience >= 0),
  credentials_summary text not null default '',
  availability_summary text not null default '',
  response_time_summary text not null default '',
  minimum_shift_hours numeric(5,2) check (minimum_shift_hours is null or minimum_shift_hours > 0),
  last_active_at timestamptz not null default timezone('utc', now()),
  hourly_rate numeric(10,2) not null check (hourly_rate > 0),
  home_nursing_rate numeric(10,2) check (home_nursing_rate > 0),
  home_personal_care_rate numeric(10,2) check (home_personal_care_rate > 0),
  location text not null,
  care_specialties text[] not null default '{}',
  languages_spoken text[] not null default '{}',
  profile_photo_url text not null default '',
  is_verified boolean not null default false,
  is_boosted boolean not null default false,
  boost_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  location text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Migration safety when table already exists with older columns.
alter table public.profiles add column if not exists care_specialties text[] not null default '{}';
alter table public.profiles add column if not exists service_category text not null default 'home_personal_care';
alter table public.profiles add column if not exists service_categories text[] not null default array['home_personal_care']::text[];
alter table public.profiles add column if not exists years_experience integer not null default 0;
alter table public.profiles add column if not exists credentials_summary text not null default '';
alter table public.profiles add column if not exists availability_summary text not null default '';
alter table public.profiles add column if not exists response_time_summary text not null default '';
alter table public.profiles add column if not exists minimum_shift_hours numeric(5,2);
alter table public.profiles add column if not exists last_active_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists home_nursing_rate numeric(10,2);
alter table public.profiles add column if not exists home_personal_care_rate numeric(10,2);
alter table public.profiles add column if not exists languages_spoken text[] not null default '{}';
alter table public.profiles add column if not exists is_boosted boolean not null default false;
alter table public.profiles add column if not exists boost_expires_at timestamptz;
alter table public.client_profiles add column if not exists phone text;
alter table public.client_profiles add column if not exists location text;
alter table public.user_moderation add column if not exists is_suspended boolean not null default false;
alter table public.user_moderation add column if not exists is_banned boolean not null default false;
alter table public.user_moderation add column if not exists moderation_note text;
alter table public.user_moderation add column if not exists moderated_at timestamptz;

create table if not exists public.verification_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.verification_docs add column if not exists review_notes text;

-- Realtime chat tables (replaces legacy inquiries table).
drop table if exists public.inquiries cascade;

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete cascade,
  caregiver_profile_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_user_id, caregiver_profile_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('harassment', 'scam', 'agency_poaching', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'suspended', 'banned')),
  resolution_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_service_category_check'
  ) then
    alter table public.profiles
    add constraint profiles_service_category_check
    check (service_category in ('home_nursing', 'home_personal_care'));
  end if;
end;
$$;

alter table public.profiles drop constraint if exists profiles_service_categories_check;

update public.profiles
set service_category = 'home_personal_care'
where service_category not in ('home_nursing', 'home_personal_care');

update public.profiles
set service_categories = array[service_category]
where service_categories is null or cardinality(service_categories) = 0;

update public.profiles
set service_categories = (
  select coalesce(array_agg(category), array['home_personal_care']::text[])
  from (
    select distinct lower(value) as category
    from unnest(service_categories) as value
    where lower(value) in ('home_nursing', 'home_personal_care')
  ) normalized
)
where true;

update public.profiles
set home_nursing_rate = hourly_rate
where home_nursing_rate is null and service_category = 'home_nursing';

update public.profiles
set home_personal_care_rate = hourly_rate
where home_personal_care_rate is null and service_category = 'home_personal_care';

update public.profiles
set home_nursing_rate = coalesce(home_nursing_rate, hourly_rate)
where 'home_nursing' = any(service_categories);

update public.profiles
set home_personal_care_rate = coalesce(home_personal_care_rate, hourly_rate)
where 'home_personal_care' = any(service_categories);

update public.profiles
set hourly_rate = coalesce(home_personal_care_rate, home_nursing_rate, hourly_rate, 1);

update public.profiles
set years_experience = coalesce(years_experience, 0);

update public.profiles
set credentials_summary = coalesce(credentials_summary, '');

update public.profiles
set availability_summary = coalesce(availability_summary, '');

update public.profiles
set response_time_summary = coalesce(response_time_summary, '');

update public.profiles
set minimum_shift_hours = null
where minimum_shift_hours is not null and minimum_shift_hours <= 0;

update public.profiles
set last_active_at = coalesce(last_active_at, updated_at, created_at, timezone('utc', now()));

update public.profiles
set service_category = case
  when 'home_personal_care' = any(service_categories) then 'home_personal_care'
  when 'home_nursing' = any(service_categories) then 'home_nursing'
  else 'home_personal_care'
end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_service_categories_check'
  ) then
    alter table public.profiles
    add constraint profiles_service_categories_check
    check (
      service_categories <@ array['home_nursing', 'home_personal_care']::text[]
      and cardinality(service_categories) >= 1
      and (home_nursing_rate is null or 'home_nursing' = any(service_categories))
      and (home_personal_care_rate is null or 'home_personal_care' = any(service_categories))
      and (not ('home_nursing' = any(service_categories)) or home_nursing_rate is not null)
      and (not ('home_personal_care' = any(service_categories)) or home_personal_care_rate is not null)
    ) not valid;
  end if;
end;
$$;

do $$
begin
  alter table public.profiles validate constraint profiles_service_categories_check;
exception
  when undefined_object then
    null;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_years_experience_check'
  ) then
    alter table public.profiles
    add constraint profiles_years_experience_check
    check (years_experience >= 0) not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_minimum_shift_hours_check'
  ) then
    alter table public.profiles
    add constraint profiles_minimum_shift_hours_check
    check (minimum_shift_hours is null or minimum_shift_hours > 0) not valid;
  end if;
end;
$$;

do $$
begin
  alter table public.profiles validate constraint profiles_years_experience_check;
exception
  when undefined_object then
    null;
end;
$$;

do $$
begin
  alter table public.profiles validate constraint profiles_minimum_shift_hours_check;
exception
  when undefined_object then
    null;
end;
$$;

create index if not exists profiles_verified_idx
on public.profiles (is_verified, created_at desc);

create index if not exists profiles_boost_idx
on public.profiles (is_boosted, boost_expires_at desc);

create index if not exists profiles_care_specialties_gin_idx
on public.profiles using gin (care_specialties);

create index if not exists profiles_service_category_idx
on public.profiles (service_category);

create index if not exists profiles_service_categories_gin_idx
on public.profiles using gin (service_categories);

create index if not exists profiles_languages_spoken_gin_idx
on public.profiles using gin (languages_spoken);

create index if not exists profiles_last_active_idx
on public.profiles (last_active_at desc);

create index if not exists client_profiles_user_idx
on public.client_profiles (user_id);

create index if not exists chat_threads_client_last_message_idx
on public.chat_threads (client_user_id, coalesce(last_message_at, created_at) desc);

create index if not exists chat_threads_caregiver_last_message_idx
on public.chat_threads (caregiver_profile_id, coalesce(last_message_at, created_at) desc);

create index if not exists chat_messages_thread_created_idx
on public.chat_messages (thread_id, created_at);

create index if not exists verification_docs_user_status_idx
on public.verification_docs (user_id, status, created_at desc);

create unique index if not exists verification_docs_user_document_unique
on public.verification_docs (user_id, document_url);

create index if not exists user_moderation_status_idx
on public.user_moderation (is_banned, is_suspended, created_at desc);

create index if not exists chat_reports_status_created_idx
on public.chat_reports (status, created_at desc);

create index if not exists chat_reports_reported_user_idx
on public.chat_reports (reported_user_id, created_at desc);

create or replace function public.set_table_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_moderation_set_updated_at on public.user_moderation;
create trigger user_moderation_set_updated_at
before update on public.user_moderation
for each row execute function public.set_table_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_table_updated_at();

drop trigger if exists client_profiles_set_updated_at on public.client_profiles;
create trigger client_profiles_set_updated_at
before update on public.client_profiles
for each row execute function public.set_table_updated_at();

drop trigger if exists verification_docs_set_updated_at on public.verification_docs;
create trigger verification_docs_set_updated_at
before update on public.verification_docs
for each row execute function public.set_table_updated_at();

drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
before update on public.chat_threads
for each row execute function public.set_table_updated_at();

create or replace function public.handle_chat_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_threads
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 160),
    updated_at = timezone('utc', now())
  where id = new.thread_id;

  update public.profiles
  set
    last_active_at = new.created_at,
    updated_at = timezone('utc', now())
  where user_id = new.sender_user_id;

  return new;
end;
$$;

drop trigger if exists chat_messages_after_insert on public.chat_messages;
create trigger chat_messages_after_insert
after insert on public.chat_messages
for each row execute function public.handle_chat_message_insert();

-- Bootstrap caregiver/client profile rows from signup metadata.
create or replace function public.handle_new_marketplace_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_type text;
  mapped_role text;
  service_category_value text;
  service_categories_value text[];
  supplied_rate text;
  parsed_rate numeric;
  supplied_home_nursing_rate text;
  supplied_home_personal_care_rate text;
  parsed_home_nursing_rate numeric;
  parsed_home_personal_care_rate numeric;
  supplied_years_experience text;
  years_experience_value integer;
  credentials_summary_value text;
  availability_summary_value text;
  response_time_summary_value text;
  supplied_minimum_shift_hours text;
  minimum_shift_hours_value numeric;
  specialties text[];
  languages text[];
  doc_url_value text;
  profile_photo_value text;
begin
  account_type := lower(coalesce(new.raw_user_meta_data ->> 'account_type', 'client'));
  mapped_role := case
    when account_type in ('caregiver', 'offering care', 'offering_care') then 'caregiver'
    when account_type = 'admin' then 'admin'
    else 'client'
  end;

  if mapped_role = 'caregiver' then
    profile_photo_value := nullif(new.raw_user_meta_data ->> 'profile_photo_url', '');
    doc_url_value := nullif(new.raw_user_meta_data ->> 'verification_doc_url', '');
    if doc_url_value is null then
      doc_url_value := nullif(new.raw_user_meta_data ->> 'verification_doc_path', '');
    end if;

    if profile_photo_value is null then
      raise exception 'Caregiver signup requires profile photo upload.';
    end if;

    if doc_url_value is null then
      raise exception 'Caregiver signup requires verification document upload.';
    end if;

    service_category_value := lower(coalesce(new.raw_user_meta_data ->> 'service_category', 'home_personal_care'));
    if service_category_value not in ('home_nursing', 'home_personal_care') then
      service_category_value := 'home_personal_care';
    end if;

    service_categories_value := '{}'::text[];
    if jsonb_typeof(new.raw_user_meta_data -> 'service_categories') = 'array' then
      select coalesce(
        array_agg(distinct lower(value)::text)
        filter (where lower(value) in ('home_nursing', 'home_personal_care')),
        '{}'::text[]
      )
      into service_categories_value
      from jsonb_array_elements_text(new.raw_user_meta_data -> 'service_categories');
    end if;

    if cardinality(service_categories_value) = 0 then
      service_categories_value := array[service_category_value];
    end if;

    if cardinality(service_categories_value) = 0 then
      service_categories_value := array['home_personal_care'];
    end if;

    supplied_rate := nullif(new.raw_user_meta_data ->> 'hourly_rate', '');
    parsed_rate := case
      when supplied_rate is not null and supplied_rate ~ '^[0-9]+(\.[0-9]+)?$'
        then supplied_rate::numeric
      else null
    end;

    supplied_home_nursing_rate := nullif(new.raw_user_meta_data ->> 'home_nursing_rate', '');
    parsed_home_nursing_rate := case
      when supplied_home_nursing_rate is not null and supplied_home_nursing_rate ~ '^[0-9]+(\.[0-9]+)?$'
        then supplied_home_nursing_rate::numeric
      else null
    end;

    supplied_home_personal_care_rate := nullif(new.raw_user_meta_data ->> 'home_personal_care_rate', '');
    parsed_home_personal_care_rate := case
      when supplied_home_personal_care_rate is not null and supplied_home_personal_care_rate ~ '^[0-9]+(\.[0-9]+)?$'
        then supplied_home_personal_care_rate::numeric
      else null
    end;

    supplied_years_experience := nullif(new.raw_user_meta_data ->> 'years_experience', '');
    years_experience_value := case
      when supplied_years_experience is not null and supplied_years_experience ~ '^[0-9]+$'
        then greatest(supplied_years_experience::integer, 0)
      else 0
    end;

    credentials_summary_value := coalesce(
      nullif(new.raw_user_meta_data ->> 'credentials_summary', ''),
      ''
    );
    availability_summary_value := coalesce(
      nullif(new.raw_user_meta_data ->> 'availability_summary', ''),
      ''
    );
    response_time_summary_value := coalesce(
      nullif(new.raw_user_meta_data ->> 'response_time_summary', ''),
      ''
    );

    supplied_minimum_shift_hours := nullif(new.raw_user_meta_data ->> 'minimum_shift_hours', '');
    minimum_shift_hours_value := case
      when supplied_minimum_shift_hours is not null
        and supplied_minimum_shift_hours ~ '^[0-9]+(\.[0-9]+)?$'
        then supplied_minimum_shift_hours::numeric
      else null
    end;

    if minimum_shift_hours_value is not null and minimum_shift_hours_value <= 0 then
      minimum_shift_hours_value := null;
    end if;

    if parsed_home_nursing_rate is null
      and 'home_nursing' = any(service_categories_value)
      and service_category_value = 'home_nursing'
      and parsed_rate is not null then
      parsed_home_nursing_rate := parsed_rate;
    end if;

    if parsed_home_personal_care_rate is null
      and 'home_personal_care' = any(service_categories_value)
      and service_category_value = 'home_personal_care'
      and parsed_rate is not null then
      parsed_home_personal_care_rate := parsed_rate;
    end if;

    if 'home_nursing' = any(service_categories_value) and parsed_home_nursing_rate is null then
      raise exception 'Caregiver signup requires Home Nursing rate.';
    end if;

    if 'home_personal_care' = any(service_categories_value) and parsed_home_personal_care_rate is null then
      raise exception 'Caregiver signup requires Home Personal Care rate.';
    end if;

    service_category_value := case
      when 'home_personal_care' = any(service_categories_value) then 'home_personal_care'
      when 'home_nursing' = any(service_categories_value) then 'home_nursing'
      else 'home_personal_care'
    end;

    parsed_rate := coalesce(
      case
        when service_category_value = 'home_personal_care' then parsed_home_personal_care_rate
        else parsed_home_nursing_rate
      end,
      parsed_home_personal_care_rate,
      parsed_home_nursing_rate,
      1
    );

    specialties := '{}'::text[];
    if jsonb_typeof(new.raw_user_meta_data -> 'care_specialties') = 'array' then
      select coalesce(array_agg(value::text), '{}'::text[])
      into specialties
      from jsonb_array_elements_text(new.raw_user_meta_data -> 'care_specialties');
    end if;

    languages := '{}'::text[];
    if jsonb_typeof(new.raw_user_meta_data -> 'languages_spoken') = 'array' then
      select coalesce(array_agg(value::text), '{}'::text[])
      into languages
      from jsonb_array_elements_text(new.raw_user_meta_data -> 'languages_spoken');
    end if;

    insert into public.profiles (
      user_id,
      full_name,
      service_category,
      service_categories,
      bio,
      years_experience,
      credentials_summary,
      availability_summary,
      response_time_summary,
      minimum_shift_hours,
      last_active_at,
      hourly_rate,
      home_nursing_rate,
      home_personal_care_rate,
      location,
      care_specialties,
      languages_spoken,
      profile_photo_url,
      is_verified,
      is_boosted,
      boost_expires_at
    )
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New Caregiver'),
      service_category_value,
      service_categories_value,
      coalesce(nullif(new.raw_user_meta_data ->> 'bio', ''), ''),
      years_experience_value,
      credentials_summary_value,
      availability_summary_value,
      response_time_summary_value,
      minimum_shift_hours_value,
      timezone('utc', now()),
      greatest(parsed_rate, 1),
      case when parsed_home_nursing_rate is null then null else greatest(parsed_home_nursing_rate, 1) end,
      case when parsed_home_personal_care_rate is null then null else greatest(parsed_home_personal_care_rate, 1) end,
      coalesce(nullif(new.raw_user_meta_data ->> 'location', ''), 'Not provided'),
      specialties,
      languages,
      profile_photo_value,
      false,
      false,
      null
    )
    on conflict (user_id) do update
    set
      full_name = excluded.full_name,
      service_category = excluded.service_category,
      service_categories = excluded.service_categories,
      bio = excluded.bio,
      years_experience = excluded.years_experience,
      credentials_summary = excluded.credentials_summary,
      availability_summary = excluded.availability_summary,
      response_time_summary = excluded.response_time_summary,
      minimum_shift_hours = excluded.minimum_shift_hours,
      last_active_at = excluded.last_active_at,
      hourly_rate = excluded.hourly_rate,
      home_nursing_rate = excluded.home_nursing_rate,
      home_personal_care_rate = excluded.home_personal_care_rate,
      location = excluded.location,
      care_specialties = excluded.care_specialties,
      languages_spoken = excluded.languages_spoken,
      profile_photo_url = excluded.profile_photo_url,
      updated_at = timezone('utc', now());

    insert into public.verification_docs (user_id, document_url, status)
    values (new.id, doc_url_value, 'pending')
    on conflict (user_id, document_url) do nothing;
  elsif mapped_role = 'client' then
    insert into public.client_profiles (
      user_id,
      full_name,
      phone,
      location
    )
    values (
      new.id,
      coalesce(
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'New Client'
      ),
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      nullif(new.raw_user_meta_data ->> 'location', '')
    )
    on conflict (user_id) do update
    set
      full_name = excluded.full_name,
      phone = excluded.phone,
      location = excluded.location,
      updated_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_marketplace on auth.users;
create trigger on_auth_user_created_marketplace
after insert on auth.users
for each row execute procedure public.handle_new_marketplace_user();

-- Backfill client profiles for existing client users.
insert into public.client_profiles (user_id, full_name, phone, location)
select
  au.id,
  coalesce(
    nullif(au.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(au.email, ''), '@', 1), ''),
    'Client'
  ),
  nullif(au.raw_user_meta_data ->> 'phone', ''),
  nullif(au.raw_user_meta_data ->> 'location', '')
from auth.users au
where lower(coalesce(au.raw_app_meta_data ->> 'account_type', au.raw_user_meta_data ->> 'account_type', 'client')) <> 'caregiver'
on conflict (user_id) do update
set
  full_name = excluded.full_name,
  phone = excluded.phone,
  location = excluded.location,
  updated_at = timezone('utc', now());

grant select on public.users to authenticated;
grant select on public.users to service_role;

alter table public.user_moderation enable row level security;
alter table public.profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.verification_docs enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reports enable row level security;

drop policy if exists "Service role can manage moderation rows" on public.user_moderation;
create policy "Service role can manage moderation rows"
on public.user_moderation
for all
to service_role
using (true)
with check (true);

drop policy if exists "Clients can read own profile" on public.client_profiles;
create policy "Clients can read own profile"
on public.client_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Clients can create own profile" on public.client_profiles;
create policy "Clients can create own profile"
on public.client_profiles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'client'
  )
);

drop policy if exists "Clients can update own profile" on public.client_profiles;
create policy "Clients can update own profile"
on public.client_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Public can read verified caregiver profiles" on public.profiles;
create policy "Public can read verified caregiver profiles"
on public.profiles
for select
to anon, authenticated
using (is_verified = true);

drop policy if exists "Caregivers can read own profile" on public.profiles;
create policy "Caregivers can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Caregivers can create own profile" on public.profiles;
create policy "Caregivers can create own profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'caregiver'
  )
);

drop policy if exists "Caregivers can update own profile" on public.profiles;
create policy "Caregivers can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles current_row
    where current_row.id = id
      and current_row.user_id = auth.uid()
      and current_row.is_verified = is_verified
      and current_row.is_boosted = is_boosted
      and current_row.boost_expires_at is not distinct from boost_expires_at
      and current_row.created_at = created_at
  )
);

drop policy if exists "Caregivers can read own verification docs" on public.verification_docs;
create policy "Caregivers can read own verification docs"
on public.verification_docs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Caregivers can upload own verification docs" on public.verification_docs;
create policy "Caregivers can upload own verification docs"
on public.verification_docs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Caregivers can update own verification docs" on public.verification_docs;

drop policy if exists "Participants can read chat threads" on public.chat_threads;
create policy "Participants can read chat threads"
on public.chat_threads
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_suspended = false
      and u.is_banned = false
  )
  and (
  auth.uid() = client_user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = caregiver_profile_id
      and p.user_id = auth.uid()
  )
  )
);

drop policy if exists "Clients can create chat threads" on public.chat_threads;
create policy "Clients can create chat threads"
on public.chat_threads
for insert
to authenticated
with check (
  auth.uid() = client_user_id
  and exists (
    select 1
    from public.users active
    where active.id = auth.uid()
      and active.is_suspended = false
      and active.is_banned = false
  )
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'client'
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = caregiver_profile_id
      and p.is_verified = true
  )
);

drop policy if exists "Participants can read chat messages" on public.chat_messages;
create policy "Participants can read chat messages"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.users active
    where active.id = auth.uid()
      and active.is_suspended = false
      and active.is_banned = false
  )
  and exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and (
        t.client_user_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = t.caregiver_profile_id
            and p.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Participants can send chat messages" on public.chat_messages;
create policy "Participants can send chat messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1
    from public.users active
    where active.id = auth.uid()
      and active.is_suspended = false
      and active.is_banned = false
  )
  and length(trim(body)) > 0
  and exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and (
        t.client_user_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = t.caregiver_profile_id
            and p.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Participants can create chat reports" on public.chat_reports;
create policy "Participants can create chat reports"
on public.chat_reports
for insert
to authenticated
with check (
  reporter_user_id = auth.uid()
  and reporter_user_id <> reported_user_id
  and exists (
    select 1
    from public.users active
    where active.id = auth.uid()
      and active.is_suspended = false
      and active.is_banned = false
  )
  and exists (
    select 1
    from public.chat_threads t
    left join public.profiles p on p.id = t.caregiver_profile_id
    where t.id = thread_id
      and (
        (t.client_user_id = auth.uid() and p.user_id = reported_user_id)
        or (p.user_id = auth.uid() and t.client_user_id = reported_user_id)
      )
  )
);

drop policy if exists "Reporters can read own chat reports" on public.chat_reports;
create policy "Reporters can read own chat reports"
on public.chat_reports
for select
to authenticated
using (reporter_user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.chat_threads;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- PRD bucket names
insert into storage.buckets (id, name, public)
values ('caregiver-profile-photos', 'caregiver-profile-photos', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can upload caregiver profile photos" on storage.objects;
create policy "Public can upload caregiver profile photos"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'caregiver-profile-photos'
  and (storage.foldername(name))[1] = 'public'
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
);

drop policy if exists "Public can read caregiver profile photos" on storage.objects;
create policy "Public can read caregiver profile photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'caregiver-profile-photos');

drop policy if exists "Anyone can upload verification documents" on storage.objects;
create policy "Anyone can upload verification documents"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = 'private'
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp', 'pdf'])
);
