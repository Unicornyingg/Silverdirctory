# Silver Directory Technical Documentation

## 1. Overview
Silver Directory is a Next.js App Router application backed by Supabase.

Core capabilities:
- Family and caregiver account flows.
- Public caregiver directory with filtering.
- In-app chat between families and caregivers.
- Caregiver profile management and verification-doc workflow.
- Admin moderation and verification review.
- Optional Stripe profile-boost checkout and confirmation.

## 2. Tech stack
- Next.js `16.1.6` (App Router)
- React `19`
- TypeScript
- Supabase (`@supabase/supabase-js` v2)
- Stripe Checkout API (manual fetch integration)
- Resend (email delivery via raw `fetch` to Resend API — no SDK)

## 3. Repository structure
- `app/`: routes and API handlers
- `components/`: reusable UI
- `lib/`: auth, security, formatting, email, Supabase helpers
- `supabase/schema.sql`: database schema + policies + migrations
- `middleware.ts`: Next.js middleware — admin key bootstrap for `/admin/verify`

## 4. Environment variables
Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_REVIEW_KEY`

Optional/feature-gated:
- `RESEND_API_KEY`
- `VERIFICATION_FROM_EMAIL`
- `VERIFICATION_REPLY_TO_EMAIL`
- `STRIPE_SECRET_KEY`
- `STRIPE_BOOST_PRICE_ID`

Important:
- `.env*` is gitignored. Environment changes must be set in deployment platform settings as well.
- `NEXT_PUBLIC_SUPABASE_URL` must be the project URL, not the Postgres connection string.

## 5. Auth model
### 5.1 Browser auth
- Browser client: `lib/supabase/client.ts`
- Uses Supabase Auth session in browser context.
- Session-dependent UI should be resolved client-side.

### 5.2 Server auth
- Server anon client: `lib/supabase/server.ts`
- Built with `persistSession: false`, no cookie/session forwarding.
- Suitable for public/read server queries, not browser-session identity detection.

### 5.3 API auth with bearer token
- `lib/supabase/auth-session.ts` reads `Authorization: Bearer <token>`.
- API routes that require logged-in user call `getAuthenticatedUserFromRequest`.

### 5.4 Admin (service-role) client
- `lib/supabase/admin.ts` creates a Supabase client using `SUPABASE_SERVICE_ROLE_KEY`.
- Used by boost API routes (`/api/boost/*`) and the admin verify page (`/admin/verify`).
- Bypasses RLS — must only be used in trusted server-side contexts.

### 5.5 Directory auth behavior
- Directory profile data is fetched server-side.
- Directory card CTA auth state is detected client-side in `components/caregiver-directory-list.tsx`.
- This avoids false signed-out state caused by server anon client not having browser session context.

## 6. Routes and responsibilities
### Public
- `/`: landing page
- `/directory`: caregiver listing and filters
- `/faq`, `/faq/families`, `/faq/caregivers`
- `/signup`: account type selector and family signup

### Auth + onboarding
- `/login`: email/password and phone OTP
- `/reset-password`: password reset completion
- `/for-nurses`: caregiver signup via phone OTP
- `/for-nurses/verify-otp`: caregiver OTP verification
- `/signup-success`: post-signup messaging

### Authenticated user areas
- `/client/profile`: family profile management
- `/caregiver/dashboard`: caregiver profile setup/edit, doc upload, boost controls
- `/chats`: threaded real-time messaging

### Legacy redirects
- `/caregiver/inquiries`: redirects to `/directory` (legacy route)

### Admin
- `/admin/verify`: verification review, moderation, reports
- `middleware.ts` intercepts `/admin/verify?key=<ADMIN_REVIEW_KEY>`, strips the key from the URL, sets an `httpOnly` admin session cookie, and redirects to `/admin/verify`.

## 7. API endpoints
### `POST /api/auth/attempt`
Purpose:
- Rate-limit guard for auth actions before expensive auth calls.

Input:
- JSON `{ "route": "<allowed-route-key>" }`

Behavior:
- Validates JSON size and route key.
- Enforces per-IP per-route limits.
- Returns `429` with retry metadata when exceeded.

### `POST /api/boost/checkout`
Purpose:
- Create Stripe Checkout session for caregiver profile boost.

Requirements:
- Valid bearer token.
- Existing caregiver profile.
- `STRIPE_SECRET_KEY` set.

Output:
- JSON `{ url }` on success.

### `POST /api/boost/confirm`
Purpose:
- Confirm paid Stripe checkout session and activate boost.

Requirements:
- Valid bearer token.
- JSON content type.
- Valid `sessionId`.
- Stripe session belongs to caller and is `paid`.

Output:
- JSON `{ success: true, expiresAt }` on success.

## 8. Security and abuse controls
- Rate limiting utilities in `lib/security/*`.
- Auth-attempt rate limiting for signup/login actions.
- Input size and format checks in API routes.
- Role restrictions and moderation checks in critical user flows.
- Suspended/banned users are blocked from app functionality.

## 9. Data model (high level)
Main entities in `supabase/schema.sql`:
- `public.users` — **read-only view** joining `auth.users` with `user_moderation` (not a table; cannot be inserted/updated directly)
- `public.user_moderation`
- `public.profiles` (caregiver listings)
- `public.client_profiles`
- `public.verification_docs`
- `public.chat_threads`
- `public.chat_messages`
- `public.chat_reports`

Storage buckets:
- `caregiver-profile-photos` (public)
- `verification-documents` (private)

Realtime:
- `chat_threads` and `chat_messages` are added to the `supabase_realtime` publication for live message updates.

## 10. Local development workflow
1. Install dependencies:
```bash
npm install
```
2. Create `.env.local` from `.env.example`.
3. Apply `supabase/schema.sql` in Supabase SQL editor.
4. Start dev server:
```bash
npm run dev
```
5. Validate before shipping:
```bash
npm run lint
npm run build
```

## 11. Troubleshooting checklist
### Login/network errors
- Verify Supabase URL + anon key pair.
- Restart server after env changes.
- Confirm deployment env vars and redeploy.

### Directory chat CTA incorrect for signed-in family
- Confirm client-side auth detection in `components/caregiver-directory-list.tsx` is intact.
- Do not reintroduce server-side `supabase.auth.getUser()` check in `app/directory/page.tsx`.

### Admin page inaccessible
- Confirm `ADMIN_REVIEW_KEY` is set.
- Access once with `/admin/verify?key=...` to establish admin session cookie (requires `middleware.ts` to be deployed).

## 12. Current limitations
- No automated test suite in repo yet (lint/build only).
- Server-side Supabase session bridging (`@supabase/ssr`) is not implemented.
- Some flows rely on client-side session checks by design.
