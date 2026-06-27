# Silver Directory MVP (Next.js + Supabase)

Hyper-local eldercare notice board for families and freelance caregivers.

## Documentation
- User guide: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)
- Technical documentation: [`docs/TECHNICAL_DOCUMENTATION.md`](docs/TECHNICAL_DOCUMENTATION.md)

## Product guardrails implemented
- No payment gateway.
- No algorithmic auto-matching.
- No built-in scheduling calendar.
- Families and caregivers negotiate terms directly off-platform.

## Tech stack
- Next.js App Router
- React + TypeScript
- Supabase (Auth, Postgres, Storage)
- Resend (transactional emails)

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
OPENAI_API_KEY=...
OPENAI_CARE_HELPER_MODEL=...
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is required for admin review.
- `ADMIN_REVIEW_KEY` gates `/admin/verify`.
- `OPENAI_API_KEY` and `OPENAI_CARE_HELPER_MODEL` power the AI care request helper on `/directory`.

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

- `/signup`:
  - Family signup (email/password)
  - Entry point to caregiver onboarding
- `/for-nurses`:
  - Caregiver account creation (phone OTP flow)
- `/for-nurses/verify-otp`:
  - Caregiver OTP verification
- `/login`: email/password login + phone OTP login + forgot-password request
- `/reset-password`: set a new password after email reset link
- `/directory`: verified caregiver cards + location/max-rate/service filters + start-chat action
- `/api/care-request/parse`: server-side AI parser that converts freeform family care requests into directory filters
- `/chats`: realtime messaging inbox for clients and caregivers
- `/caregiver/dashboard`: caregiver profile CRUD, verification doc upload, link to chat inbox
- `/admin/verify?key=YOUR_ADMIN_REVIEW_KEY`: approve/reject verification docs and publish caregivers

## Realtime chat flow

1. Family clicks `Start chat` on a caregiver card.
2. If not logged in, they are redirected to `/login` and returned to chat after login.
3. App creates (or reuses) a `chat_threads` row for that client-caregiver pair.
4. Messages are inserted into `public.chat_messages`.
5. Both sides receive updates live via Supabase Realtime subscriptions.

This now behaves as in-app two-way messaging.
