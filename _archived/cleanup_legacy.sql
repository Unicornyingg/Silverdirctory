-- One-time cleanup for legacy schema objects that are no longer used.
-- WARNING: This is destructive for old nurse profile data.

begin;

drop trigger if exists on_auth_user_created_nurse_profile on auth.users;
drop function if exists public.handle_new_nurse_profile();
drop function if exists public.set_nurse_profiles_updated_at();

drop table if exists public.nurse_profiles cascade;

delete from storage.objects
where bucket_id in ('nurse-profile-photos', 'nurse-license-photos');

delete from storage.buckets
where id in ('nurse-profile-photos', 'nurse-license-photos');

commit;
