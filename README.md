# Caregiver SaaS (Next.js + Supabase)

This app allows:
- Registered Nurses (RNs) to sign up.
- Nurses to upload a public profile photo shown in directory cards.
- Nurses to upload a photo of their license for manual verification.
- Admins to review pending profiles and mark them verified.
- Clients to browse only verified nurses in `/directory`.

## Tech Stack
- Next.js App Router
- React + TypeScript
- Supabase Auth + Postgres + Storage

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_REVIEW_KEY=...
RESEND_API_KEY=...
VERIFICATION_FROM_EMAIL=...
VERIFICATION_REPLY_TO_EMAIL=...
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is only used on server routes/pages (admin review).
- `ADMIN_REVIEW_KEY` is a simple gate for `/admin/verify`.
- Auto email uses [Resend](https://resend.com). `VERIFICATION_FROM_EMAIL` must be a verified sender/domain in Resend.

## 3) Apply database + storage schema

In Supabase SQL Editor, run:

- `supabase/schema.sql`

Run this even if you already ran an earlier version. It now includes:
- `profile_photo_url` on `public.nurse_profiles`
- `license_photo_url` on `public.nurse_profiles`
- storage bucket `nurse-profile-photos`
- storage bucket `nurse-license-photos`
- storage upload/read policies for both image types

## 4) Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Current Flows

### Nurse signup
- Route: `/for-nurses`
- Nurse uploads profile image (public).
- Nurse uploads license image.
- App uploads profile image to bucket `nurse-profile-photos`.
- App uploads license image to bucket `nurse-license-photos`.
- App calls `supabase.auth.signUp(...)` with metadata including `profile_photo_url` and `license_photo_url`.
- Trigger `handle_new_nurse_profile` writes to `public.nurse_profiles` with `verified = false`.

### Admin verification
- Route: `/admin/verify?key=YOUR_ADMIN_REVIEW_KEY`
- Shows pending nurses (`verified = false`) with profile + license photos.
- Click `Mark as verified` to publish them in the directory and automatically send a verification email.
- Click `Email nurse` to open a prefilled email draft.

### Directory listing
- Route: `/directory`
- Reads only verified profiles (`verified = true`).
