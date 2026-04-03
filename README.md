# Silver Directory MVP (Next.js + Supabase)

Hyper-local eldercare notice board for families and freelance caregivers.

## Product guardrails implemented
- No payment gateway for caregiver wages.
- No algorithmic auto-matching.
- No built-in scheduling calendar.
- Families and caregivers negotiate terms directly off-platform.

## Tech stack
- Next.js App Router
- React + TypeScript
- Supabase (Auth, Postgres, Storage)
- Resend (transactional emails)
- Stripe Checkout (profile boost payment only)

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
STRIPE_SECRET_KEY=...
STRIPE_BOOST_PRICE_ID=...
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is required for admin review and boost confirmation.
- `ADMIN_REVIEW_KEY` gates `/admin/verify`.
- `STRIPE_BOOST_PRICE_ID` is optional. If empty, checkout uses an inline SGD S$5 line item.

## 3) Apply Supabase schema

In Supabase SQL Editor, run:

- `supabase/schema.sql`

Run the full file even if you already ran older versions.  
It includes PRD tables + policies:
- `public.users`
- `public.client_profiles`
- `public.profiles`
- `public.verification_docs`
- `public.chat_threads`
- `public.chat_messages`

It also creates buckets:
- `caregiver-profile-photos` (public)
- `verification-documents` (private)

## 4) Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key routes

- `/for-nurses`:
  - Email/password signup
  - Google OAuth signup (looking-for-care accounts only)
  - Account type choice: `offering care` or `looking for care`
- `/login`: email/password login + Google OAuth login (looking-for-care accounts only) + forgot-password request
- `/oauth-complete`: OAuth role finalization
- `/reset-password`: set a new password after email reset link
- `/directory`: verified caregiver cards + location/max-rate/service filters + start-chat action
- `/chats`: realtime messaging inbox for clients and caregivers
- `/caregiver/dashboard`: caregiver profile CRUD, verification doc upload, link to chat inbox, boost checkout button
- `/admin/verify?key=YOUR_ADMIN_REVIEW_KEY`: approve/reject verification docs and publish caregivers

## Realtime chat flow

1. Family clicks `Start chat` on a caregiver card.
2. If not logged in, they are redirected to `/login` and returned to chat after login.
3. App creates (or reuses) a `chat_threads` row for that client-caregiver pair.
4. Messages are inserted into `public.chat_messages`.
5. Both sides receive updates live via Supabase Realtime subscriptions.

This now behaves as in-app two-way messaging.

## Boost flow

1. Caregiver clicks `Boost profile for 7 days (S$5)` on dashboard.
2. Stripe Checkout opens.
3. On success, app confirms the paid session and updates:
   - `profiles.is_boosted = true`
   - `profiles.boost_expires_at = now + 7 days`
4. Directory sorts active boosted profiles first (randomized among boosted).
