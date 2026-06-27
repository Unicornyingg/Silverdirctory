# Silver Directory User Guide

## 1. What this platform does
Silver Directory helps families connect directly with independent caregivers.

Platform guardrails:
- No wage commission taken from caregiver earnings.
- No auto-matching algorithm.
- No built-in wage payment flow.
- Families and caregivers agree scope, rates, and schedule directly.

## 2. Account types
- Family account: browse directory and chat with caregivers.
- Caregiver account: create public listing, receive chats, optionally request licensed nurse review.

## 3. Family guide
### 3.1 Create a family account
1. Open `/signup`.
2. In "I'm a Family", create an account with email + password.
3. After success, continue to `/client/profile?setup=1`.

Notes:
- If email confirmation is enabled in Supabase, you must confirm your email before login is fully active.

### 3.2 Sign in as family
1. Open `/login` (or `/login?role=client`).
2. Use SMS code or email/password.
3. After sign-in you are sent to `/directory` (or to your `next` URL if present).

### 3.3 Browse caregivers
1. Open `/directory`.
2. Filter by location, service, language, max rate, and sort order.
3. Open profile details using "View full profile".

### 3.4 Start a chat
1. On a caregiver card, click `Start chat`.
2. If signed in, you go directly to `/chats?caregiver=<profile-id>`.
3. If signed out, you are redirected to `/login?role=client&next=...` and returned after login.

### 3.5 Manage family profile
1. Open `/client/profile`.
2. Update full name, phone, and location.
3. Save changes.

### 3.6 Reset password (families and caregivers)
1. Open `/login`.
2. Click "Forgot password?" below the password field.
3. Enter your account email and click "Send password reset link".
4. Check your email inbox (and spam folder) for the reset link.
5. The link opens `/reset-password` where you set a new password.
6. After success you are redirected to `/login` with a confirmation message.

## 4. Caregiver guide
### 4.1 Create a caregiver account
1. Open `/for-nurses`.
2. Enter name, email, phone, password, and confirm password.
3. Submit and verify your OTP at `/for-nurses/verify-otp`.
4. Continue to dashboard setup.

### 4.2 Sign in as caregiver
1. Open `/login?role=caregiver` (recommended).
2. Use phone OTP or email/password.
3. You are redirected to `/caregiver/dashboard`.

### 4.3 Complete caregiver profile
1. Open `/caregiver/dashboard`.
2. Fill profile details:
- full name
- hourly rate
- experience
- credentials summary
- availability summary
- response time summary
- minimum shift hours
- service regions
- languages
- services
- bio
3. Upload profile photo (optional).
4. Upload verification document (optional).
5. Click `Save caregiver profile`.

Important:
- Saving profile publishes a basic caregiver listing.
- Uploading verification docs enables licensed nurse review; basic listing remains available.

## 5. Messaging guide (both roles)
- Route: `/chats`
- Families: see caregiver threads.
- Caregivers: see family threads.
- Real-time updates are enabled for incoming and outgoing messages.

## 6. Admin guide
### 6.1 Access admin panel
1. Open `/admin/verify?key=<ADMIN_REVIEW_KEY>`.
2. Valid key creates an admin session cookie and redirects to `/admin/verify`.

### 6.2 Admin actions
- Review and approve/reject verification documents.
- Moderate user accounts (suspend/ban).
- Review and resolve report tickets.

## 7. Common issues and fixes
### "I still can't log in"
Check these in order:
1. Ensure `NEXT_PUBLIC_SUPABASE_URL` uses your Supabase project URL (`https://<project-ref>.supabase.co`), not a DB connection string.
2. Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches the same Supabase project.
3. Restart dev server after `.env.local` changes.
4. If deployed, update hosting environment variables and redeploy.
5. Hard refresh browser (`Cmd+Shift+R` / `Ctrl+Shift+R`).

### "Why did pushing code not fix env issues?"
- `.env*` files are gitignored in this repo.
- Pushing code does not push local env values.

### "Caregiver not visible in directory"
Check:
1. Profile exists and is saved.
2. `is_verified` is true.
3. Directory filters are not excluding the profile.

## 8. Quick route reference
- Home: `/`
- Sign up selector: `/signup`
- Caregiver signup: `/for-nurses`
- Login: `/login`
- Directory: `/directory`
- Chats: `/chats`
- Family profile: `/client/profile`
- Caregiver dashboard: `/caregiver/dashboard`
- FAQ: `/faq`, `/faq/families`, `/faq/caregivers`
- Admin: `/admin/verify`
