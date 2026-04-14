# Bug: Logged-in family users see "Sign in to start chat" on directory cards

**Reported:** 10 April 2026  
**Severity:** 🔴 High — breaks the primary conversion CTA for authenticated family users  
**Status:** ✅ Fixed (implemented 10 April 2026)

---

## Implementation plan

### Summary

Move the auth check from the server (where it always fails) to the client (where the real session lives). Two files, ~10 minutes.

### Checklist

| # | Task | File | Est. |
|---|---|---|---|
| 1 | Add `getSupabaseBrowserClient` import | `components/caregiver-directory-list.tsx` | 1 min |
| 2 | Remove `viewerAuthenticated` prop from component signature | `components/caregiver-directory-list.tsx` | 2 min |
| 3 | Add `useState(false)` + `useEffect` that calls `getSession()` and sets `viewerAuthenticated` | `components/caregiver-directory-list.tsx` | 3 min |
| 4 | Delete `supabase.auth.getUser()` call and `isAuthenticated` variable | `app/directory/page.tsx` | 1 min |
| 5 | Remove `viewerAuthenticated={isAuthenticated}` prop from `<CaregiverDirectoryList>` | `app/directory/page.tsx` | 1 min |
| 6 | Run verification tests (see Step 3 below) | Browser | 5 min |

### Order of execution

1. **Start with `components/caregiver-directory-list.tsx`** — make all three changes (import, remove prop, add state + effect) in one pass
2. **Then update `app/directory/page.tsx`** — delete the two dead lines and remove the prop from the JSX
3. **Restart dev server** (`npm run dev`) — env/cache won't affect this, but good practice
4. **Run all 5 verification tests** in the table below

### What NOT to change

- Do **not** touch `lib/supabase/server.ts` — it's still used correctly for the public profile data fetch
- Do **not** install `@supabase/ssr` — that's a larger migration for another day
- Do **not** change any other references to `viewerAuthenticated` inside `caregiver-directory-list.tsx` — they all read the same variable, which is now state instead of a prop

---

## What the user sees

After signing in as a family member and navigating to `/directory`, every caregiver card shows:

- **"Sign in to start chat"** instead of **"Start chat"**
- Clicking it redirects through `/login?role=client&next=...` instead of going straight to `/chats?caregiver=...`

---

## Root cause

`app/directory/page.tsx` is a **Server Component**. On line ~186 it does:

```tsx
const { data: authState } = await supabase.auth.getUser();
const isAuthenticated = !!authState.user;
```

But `supabase` comes from `getSupabaseServerClient()` (`lib/supabase/server.ts`), which creates a plain anon client with `persistSession: false` and **no cookie forwarding**:

```tsx
// lib/supabase/server.ts
return createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,     // ← no session storage
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
```

This server client has zero knowledge of the logged-in user's session (which lives in `localStorage` on the browser). `supabase.auth.getUser()` always returns `null`, so `isAuthenticated` is always `false`, and `viewerAuthenticated={false}` is passed to `<CaregiverDirectoryList>`.

---

## Why this is hard to fix server-side

The project uses `@supabase/supabase-js` v2 directly — there's no `@supabase/ssr` package installed, and no middleware sets auth cookies. Adding server-side session reading would require either:

- Installing `@supabase/ssr` and adding a Next.js middleware to manage cookie-based sessions, **or**
- Manually reading Supabase cookies and passing the access token to the server client

Both are significant changes that touch the entire auth architecture.

---

## Recommended fix — detect auth client-side instead

`CaregiverDirectoryList` is already a `"use client"` component. Instead of accepting `viewerAuthenticated` as a prop from the server, have it check the session itself using the **browser** Supabase client (which has the real session in `localStorage`).

---

### Step 1 — `components/caregiver-directory-list.tsx`

**1a. Add the browser client import:**

```tsx
// Add to the import block at the top of the file:
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
```

**1b. Replace the `viewerAuthenticated` prop with internal state.**

Change the component signature and add a `useEffect`:

```tsx
// ── BEFORE ──
export default function CaregiverDirectoryList({
  profiles,
  viewerAuthenticated,
}: {
  profiles: DirectoryListProfile[];
  viewerAuthenticated: boolean;
}) {
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);


// ── AFTER ──
export default function CaregiverDirectoryList({
  profiles,
}: {
  profiles: DirectoryListProfile[];
}) {
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [viewerAuthenticated, setViewerAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setViewerAuthenticated(!!data.session?.user);
    });
  }, []);
```

**1c.** No other changes needed inside this file — all the existing `viewerAuthenticated` references will now read from the local state instead of the deleted prop.

---

### Step 2 — `app/directory/page.tsx`

**2a. Remove the server-side auth check** (lines ~186–187):

```tsx
// DELETE these two lines:
const { data: authState } = await supabase.auth.getUser();
const isAuthenticated = !!authState.user;
```

**2b. Remove the `viewerAuthenticated` prop** from the component call (around line ~280):

```tsx
// BEFORE:
<CaregiverDirectoryList profiles={orderedProfiles} viewerAuthenticated={isAuthenticated} />

// AFTER:
<CaregiverDirectoryList profiles={orderedProfiles} />
```

---

### Step 3 — Verify

| # | Test | Expected |
|---|---|---|
| 1 | Sign in as the test family account → navigate to `/directory` | Cards show **"Start chat"** |
| 2 | Click **"Start chat"** on any card | Goes directly to `/chats?caregiver=...` (no login redirect) |
| 3 | Open an incognito/private window (not signed in) → visit `/directory` | Cards show **"Sign in to start chat"** |
| 4 | Click **"Sign in to start chat"** in incognito | Redirects to `/login?role=client&next=...` |
| 5 | Sign in during that redirect flow | Lands on the correct `/chats?caregiver=...` page |

---

## Files changed

| File | Change |
|---|---|
| `components/caregiver-directory-list.tsx` | Remove `viewerAuthenticated` prop; add `useState` + `useEffect` that reads session from browser Supabase client |
| `app/directory/page.tsx` | Remove `supabase.auth.getUser()` call and `isAuthenticated` variable; remove `viewerAuthenticated` prop from `<CaregiverDirectoryList>` |

---

## Risk

**Low.** The profile data fetch still happens server-side (public data, no auth needed). Only the auth check moves to the client.

**Minor cosmetic note:** The "Start chat" button text may briefly show "Sign in to start chat" on initial page load before `getSession()` resolves on the client. This is the same pattern used by the rest of the app (login, signup, client profile pages all read auth state client-side). If the flash is noticeable, you can default the initial state to match the more common case:

```tsx
// Optional: default to true to avoid flash for logged-in users
// (unauthenticated users get corrected on the next render frame)
const [viewerAuthenticated, setViewerAuthenticated] = useState(true);
```

This trades a brief flash for unauthenticated users instead of authenticated ones — pick whichever audience is larger on the directory page.
