# Silver Directory — UI/UX Audit
**Date:** 9 April 2026  
**Scope:** All major user-facing routes, shared components, and design system  
**Status:** In progress — implementation updates are being applied in milestones

---

## Implementation Progress (9 April 2026)

### Completed in this pass
- [x] `D3` — Caregiver dashboard first-save flow no longer hard-blocks when photo is missing (`app/caregiver/dashboard/page.tsx`)
- [x] `E3` / `A6` — Directory now distinguishes no-filter-match vs truly-empty states (`app/directory/page.tsx`)
- [x] `R6` — Mobile inbox now has clear thread navigation with back-to-conversations behavior (`app/chats/page.tsx`)
- [x] `E2` — Empty chat panel now provides clearer guidance and a directory CTA (`app/chats/page.tsx`)
- [x] `L4` — Message loading and empty states now have distinct visuals (`app/chats/page.tsx`)
- [x] `TR7` — Unauthenticated users now see explicit “Sign in to start chat” CTA and guided login path (`components/caregiver-directory-list.tsx`, `app/directory/page.tsx`)
- [x] `SU3` — Signup success copy no longer promises auto-redirect that may not happen (`app/signup-success/page.tsx`)
- [x] `F4` — Login now includes password show/hide control (`app/login/page.tsx`)
- [x] `SU2` — Reset-password success now shows visible redirect countdown (`app/reset-password/page.tsx`)
- [x] `T3` — Header desktop link spacing/typography tuned to reduce mid-width wrapping (`components/site-header.tsx`)
- [x] `HF2` — Filter-tag buttons now include visible hover state polish (`components/directory-filters.tsx`)
- [x] `A5` — FAQ accordion now exposes explicit expanded-state semantics (`components/faq-accordion.tsx`)
- [x] `D1` — Shared caregiver onboarding stepper added across onboarding flow pages (`components/onboarding-stepper.tsx`, `app/for-nurses/page.tsx`, `app/for-nurses/verify-otp/page.tsx`, `app/caregiver/dashboard/page.tsx`, `app/signup-success/page.tsx`)
- [x] `TR4` — OAuth restricted-account state now includes explicit account-review/support path (`app/oauth-complete/page.tsx`)
- [x] `L2` — Caregiver dashboard boot state now uses visual loading skeleton instead of plain text (`app/caregiver/dashboard/page.tsx`)
- [x] `L3` — Chat inbox boot/fallback states now use skeleton layout and avoid content flash (`app/chats/page.tsx`)
- [x] `T1` — Directory cards now provide a clear “read full profile” indicator for truncated bios (`components/caregiver-directory-list.tsx`)

### Intentionally deferred in this pass
- [ ] `TR6` — Session-expiry handling should be centralized across authenticated actions/pages
- [ ] `L5` — Add explicit submit-to-redirect transition state on `/for-nurses`
- [ ] `TR5` — Replace static “Draft changes are saved locally” copy with actual save timestamp/state

---

## Table of Contents

1. [Top 10 Highest-Priority Issues](#1-top-10-highest-priority-issues)
2. [Mobile-Only Issues to Fix First](#2-mobile-only-issues-to-fix-first)
3. [Quick Wins](#3-quick-wins)
4. [Recommended Order of Execution](#4-recommended-order-of-execution)
5. [Full Findings — Phase 2: Layout, Spacing, Forms, CTAs](#5-full-findings--phase-2)
6. [Full Findings — Phase 3: Loading, Errors, Accessibility, Trust](#6-full-findings--phase-3)
7. [Full Findings — Phase 4: Crowding, Desktop Layouts, Images, Onboarding](#7-full-findings--phase-4)

---

## 1. Top 10 Highest-Priority Issues

Ranked by impact on **trust, conversion, and usability**.

---

### #1 — Directory card layout breaks on mobile: `min-w-[220px]` causes horizontal scroll
**File:** `components/caregiver-directory-list.tsx`  
**Element:** `<div className="flex min-w-[220px] flex-col ...">`

**Root cause:** The action column has a hard `min-w-[220px]` inside a `md:grid-cols-[120px_1fr_auto]` grid. On screens narrower than ~680 px the three-column layout tries to hold, forcing overflow. The `auto` column inherits the `min-w-[220px]` floor.

**Fix:**
- Remove `min-w-[220px]` from the action column div
- Add `col-span-full md:col-span-1` to the action div so it spans the full width on mobile
- Make both buttons `w-full md:w-auto`

```tsx
// Before
<div className="flex min-w-[220px] flex-col items-start gap-3 md:items-end">

// After
<div className="col-span-full flex flex-col items-stretch gap-3 md:col-span-1 md:items-end">
```

---

### #2 — Caregiver OTP verify page has no resend button — dead end on code expiry
**File:** `app/for-nurses/verify-otp/page.tsx`

**Root cause:** The page calls `supabase.auth.verifyOtp()` but has no call to `supabase.auth.signInWithOtp({ phone })` after initial submission. Supabase OTP codes expire (60 s default). If the code expires or the user misreads it, there is no recovery path. They must navigate back manually, which clears form state. This blocks caregiver signups entirely.

**Fix:** Add a resend button with a 30-second cooldown:

```tsx
const [resendCooldown, setResendCooldown] = useState(0);

async function handleResend() {
  await supabase.auth.signInWithOtp({ phone });
  setResendCooldown(30);
  const interval = setInterval(() => {
    setResendCooldown((s) => { if (s <= 1) { clearInterval(interval); return 0; } return s - 1; });
  }, 1000);
}

// In JSX:
<button type="button" onClick={handleResend} disabled={resendCooldown > 0}>
  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
</button>
```

---

### #3 — VideoPanel: fixed `h-[500px]` makes video taller than wide on phones
**File:** `components/landing/VideoPanel.tsx`, line 17

**Root cause:** `h-[500px] w-full` on a 375 px phone produces a ~0.75:1 portrait box. The iframe fills it, so YouTube shows the video heavily letterboxed or crops. First impression of the product on mobile.

**Fix** (3-line change):

```tsx
// Before
<div className="relative mx-auto h-[500px] w-full max-w-4xl cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-tr from-purple-400 to-indigo-700 lg:mb-20">
  {/* ... */}
  <iframe className="h-full w-full aspect-video" />

// After
<div className="relative mx-auto aspect-video w-full max-w-4xl cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-tr from-purple-400 to-indigo-700 lg:mb-20">
  {/* ... */}
  <iframe className="absolute inset-0 h-full w-full" />
```

---

### #4 — Login page: 4 simultaneous auth paths with no role separation — causes wrong-role logins
**File:** `app/login/page.tsx`

**Root cause:** A single toggle switches between family and caregiver modes. The toggle affordance is weak (color-only: teal vs indigo — a brand mismatch). Users who pick the wrong mode get silently routed to the wrong dashboard or hit a role-blocked error screen with no warning before submission.

**Fix:** Replace the toggle with two visually separated cards:

```
┌─────────────────────┐  ┌─────────────────────┐
│  👨‍👩‍👧 I'm a Family    │  │  🩺 I'm a Caregiver  │
│  Sign in / Register │  │  Sign in / Register  │
└─────────────────────┘  └─────────────────────┘
```

Each card links to its own form/flow. Eliminates the class of wrong-role error entirely.

---

### #5 — Dashboard form: 13 fields, zero sections, no visual grouping
**File:** `app/caregiver/dashboard/page.tsx`, lines 900–1160

**Root cause:** The form is one flat `space-y-5` list. No `<hr>`, no section heading, no grouping by concern. A caregiver on their first visit sees an infinite settings wall. The completion checklist computes 12 `done: boolean` values but checklist items have no links to their corresponding form fields.

**Fix:** Insert 4–5 `<fieldset>` groups with bold `<legend>` labels:

| Group | Fields |
|---|---|
| Rates & Experience | Full name, Hourly rate, Years experience, Min shift hours |
| Availability & Response | Availability summary, Response time |
| Regions, Languages & Services | Service regions checkboxes, Languages checkboxes, Services checkboxes |
| About you | Credentials summary, Bio |
| Verification | Profile photo upload, Nursing licence upload |

Also: make each incomplete checklist item a button that calls `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })`.

---

### #6 — Directory card photo `object-cover` crops faces — first visual impression is broken
**Files:** `components/caregiver-directory-list.tsx`, `components/profile-avatar.tsx`

**Root cause:** `ProfileAvatar` uses `object-cover` with default CSS `object-position: center`. This crops the bottom half of a portrait photo. The card thumbnail is `h-[120px] w-full` — on mobile `w-full` is ~335 px wide, making a 335×120 landscape strip showing only a forehead band.

**Fix:**
1. Add `object-top` to the `ProfileAvatar` `className` in the card list (one word)
2. Change the card avatar from `h-[120px] w-full md:w-[120px]` to `h-[120px] w-[120px]` (fixed square) so it never stretches to a landscape crop

```tsx
// Before
<ProfileAvatar className="h-[120px] w-full md:w-[120px]" />

// After
<ProfileAvatar className="h-[120px] w-[120px] object-top" />
```

---

### #7 — No `role="alert"` on any error or success message — screen readers are silent
**Files:** Every page that sets `errorMessage` or `successMessage`: `caregiver/dashboard`, `client/profile`, `login`, `for-nurses`, `reset-password`, `chats`

**Root cause:** Error divs are rendered with no ARIA live region. The pattern used everywhere:

```tsx
{errorMessage && (
  <div className="... text-red-700">{errorMessage}</div>
)}
```

Screen readers never announce these messages. For a healthcare-adjacent product potentially used by elderly family members, this is a significant accessibility and regulatory risk.

**Fix:** Apply globally across all pages:

```tsx
// Error messages
{errorMessage && (
  <div role="alert" aria-live="assertive" className="... text-red-700">
    {errorMessage}
  </div>
)}

// Success messages
{successMessage && (
  <div role="status" aria-live="polite" className="... text-emerald-700">
    {successMessage}
  </div>
)}
```

---

### #8 — `successMessage` never auto-dismisses — stale "Profile saved" persists indefinitely
**Files:** `app/caregiver/dashboard/page.tsx`, `app/client/profile/page.tsx`

**Root cause:** `setSuccessMessage("Profile saved successfully.")` is called but there is no corresponding `setTimeout` to clear it. The message persists until the next save attempt or page reload. After multiple saves it loses all meaning and starts looking like a UI bug.

**Fix:** After every `setSuccessMessage(...)` call, immediately add:

```tsx
setSuccessMessage("Profile saved successfully.");
setTimeout(() => setSuccessMessage(null), 5000);
```

Or extract into a shared hook:

```tsx
function useFlashMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const flash = useCallback((msg: string, duration = 5000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, []);
  return { message, flash };
}
```

---

### #9 — Testimonials carousel: `min-w-[220px]` causes silent overflow — extra cards unreachable
**File:** `components/landing/Testimonials.tsx`

**Root cause:** Flex container with no `overflow-x-auto` and no scroll snap. On a 375 px phone, 3 cards at `min-w-[220px]` = 660 px minimum total width. Parent `overflow-hidden` clips the overflow silently. Users see only 1–1.5 cards and don't know more exist. No dots, no arrows, no scroll affordance.

**Fix option A (scroll snap):**
```tsx
// Container
<div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4">
// Each card
<div className="snap-center shrink-0 w-[85vw] md:w-auto">
```

**Fix option B (responsive grid):**
```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
```

---

### #10 — "Boosted" and "Licensed Nurse" badges have no explanation — erodes trust
**File:** `components/caregiver-directory-list.tsx`, badge `<span>` elements inside the card button

**Root cause:** Both badges are plain `<span>` elements with no `title`, no tooltip, and no info link. "Boosted" reads as paid placement — and it is — with zero disclosure. "Licensed Nurse" has no link explaining the verification process. For families comparing caregivers, unexplained paid placement is a dark pattern.

**Minimum fix:**
```tsx
<span title="This listing is a paid promotion" className="...">Boosted</span>
<span title="SNB nursing licence verified by Silver Directory admin" className="...">Licensed Nurse</span>
```

**Better fix:** Add a `?` icon that opens a tooltip, and add a footnote to the directory page: *"★ Boosted listings appear first and are paid promotions."*

---

## 2. Mobile-Only Issues to Fix First

Ordered by frequency of breakage and visibility on phones.

---

### M1 — Directory card 3-column grid doesn't collapse → horizontal scroll on all phones
**File:** `components/caregiver-directory-list.tsx`

`md:grid-cols-[120px_1fr_auto]` with `min-w-[220px]` on the action column. On a 375 px screen: 120 + ~180 + 220 = 520 px minimum in 375 px. Everything overflows.

**Fix:** Remove `min-w-[220px]`, make action column `col-span-full` below `md`. See #1 above.

---

### M2 — "Start chat" button never visible above fold on mobile
**File:** `components/caregiver-directory-list.tsx`

Caused by M1 — the CTA is in the third grid column which is off-screen. Even after M1 is fixed, the action column stacks below the entire bio, tags, and metadata section — placing it 600+ px down on a phone. Families browsing on mobile never see the primary CTA.

**Fix:** After M1 fix, consider a sticky "Start chat" bar that appears at the bottom of each card on mobile, or move the rate + CTA directly below the name on small screens.

---

### M3 — Modal close button overlaps caregiver's name on narrow screens
**File:** `components/caregiver-directory-list.tsx`

`absolute right-4 top-4` close button sits in the same row as `<h2 className="text-3xl ...">`. On a 375 px phone the name has no right margin allowance; the × button physically overlaps long names (e.g. "Maria Santos").

**Fix:** Add `pr-12` to the name's wrapping div, or move the close button to the modal footer on mobile:

```tsx
// Add to the name wrapper div
<div className="flex flex-wrap items-center gap-2 pr-12">
  <h2 className="text-3xl ...">
```

---

### M4 — VideoPanel 500 px tall box on mobile
**File:** `components/landing/VideoPanel.tsx`

See #3 above. 3-line fix with `aspect-video`.

---

### M5 — Mobile nav: no close-on-back-button; link `-ml-4 w-full` bleeds outside boundary
**File:** `components/site-header.tsx`

The open nav drawer doesn't listen for `popstate`. Pressing the Android back button doesn't close it. The `-ml-4 w-full` on nav links causes them to bleed 16 px outside the nav's own padding box on the left.

**Fix:**
```tsx
// Add in the nav open useEffect
useEffect(() => {
  if (!navOpen) return;
  const close = () => setNavOpen(false);
  window.addEventListener('popstate', close);
  return () => window.removeEventListener('popstate', close);
}, [navOpen]);

// Remove -ml-4 from nav links, use px-4 on the nav container instead
```

---

### M6 — Dashboard sidebar stacks below entire form on mobile — "Boost profile" is unreachable
**File:** `app/caregiver/dashboard/page.tsx`

`lg:grid-cols-[1.15fr_0.85fr]` collapses to one column below 1024 px. The `<aside>` is the second DOM child so it renders below the entire 1207-line form. Caregivers on mobile must scroll through the complete form before they can see their license status or boost option.

**Fix:**
```tsx
// Add order classes to the aside
<aside className="order-first space-y-5 lg:order-last">
```

---

### M7 — Profile avatar renders as landscape strip on mobile — faces are cropped
**File:** `components/caregiver-directory-list.tsx`

Card photo is `h-[120px] w-full`. On mobile `w-full` ≈ 335 px → 335×120 px wide landscape strip. All portrait photos show just a forehead band.

**Fix:** Use a fixed square: `h-[120px] w-[120px]` with `object-top`. See #6 above.

---

### M8 — CtaBanner button not full-width on mobile — looks like a desktop leftover
**File:** `components/landing/CtaBanner.tsx`

Button has no `w-full sm:w-auto`. On a 375 px phone it sits at `auto` width in the centre of a full-bleed banner, looking small and untappable.

**Fix:**
```tsx
<button className="primary-btn w-full sm:w-auto">
```

---

## 3. Quick Wins

Each takes under 30 minutes and produces immediately visible improvement.

| # | Fix | File | Effort |
|---|---|---|---|
| QW1 | `h-[500px]` → `aspect-video` on VideoPanel | `VideoPanel.tsx` | 5 min |
| QW2 | Add `object-top` + fix avatar to `w-[120px] h-[120px]` square | `caregiver-directory-list.tsx` | 10 min |
| QW3 | Add `role="alert"` + `aria-live` to all error/success divs | All pages (global find & replace) | 20 min |
| QW4 | Auto-dismiss `successMessage` after 5 s | `dashboard/page.tsx`, `client/profile/page.tsx` | 20 min |
| QW5 | Add `autoComplete` attributes to all auth inputs | `login/page.tsx`, `for-nurses/page.tsx` | 10 min |
| QW6 | Add `type="tel" inputMode="numeric"` to phone input | `for-nurses/page.tsx` | 5 min |
| QW7 | Remove `min-w-[220px]` from directory card action column | `caregiver-directory-list.tsx` | 10 min |
| QW8 | Add `title="Paid promotion"` to Boosted badge | `caregiver-directory-list.tsx` | 2 min |
| QW9 | Add `aria-labelledby` to profile modal (replace `aria-label`) | `caregiver-directory-list.tsx` | 5 min |
| QW10 | Add `w-full sm:w-auto` to CtaBanner button | `CtaBanner.tsx` | 2 min |
| QW11 | Add `order-first lg:order-last` to dashboard aside | `caregiver/dashboard/page.tsx` | 2 min |
| QW12 | Add `pr-12` to modal name wrapper to clear close button | `caregiver-directory-list.tsx` | 2 min |

**autoComplete reference for QW5:**
```tsx
<input autoComplete="email" />           // email fields
<input autoComplete="current-password" /> // login password
<input autoComplete="new-password" />    // registration password
<input autoComplete="tel" />             // phone on for-nurses
```

---

## 4. Recommended Order of Execution

### Batch 1 — Fix First (Conversion & Trust Blockers)
These directly prevent users from completing core flows or cause immediate trust damage.

| Step | Issue | File(s) | Est. Time |
|---|---|---|---|
| 1 | Remove `min-w-[220px]`, collapse action column full-width on mobile | `caregiver-directory-list.tsx` | 20 min |
| 2 | `aspect-video` on VideoPanel (replaces `h-[500px]`) | `VideoPanel.tsx` | 5 min |
| 3 | Fix card avatar to `w-[120px] h-[120px] object-top` | `caregiver-directory-list.tsx` | 10 min |
| 4 | Add `role="alert"` / `role="status"` to all error/success divs | All pages | 20 min |
| 5 | Add OTP resend button with 30 s cooldown | `for-nurses/verify-otp/page.tsx` | 45 min |

---

### Batch 2 — Fix Second (Polish, Accessibility, Mobile UX)
Contained to individual files. All are well-defined, no design decisions needed.

| Step | Issue | File(s) | Est. Time |
|---|---|---|---|
| 6 | Auto-dismiss `successMessage` after 5 s | `dashboard/page.tsx`, `client/profile/page.tsx` | 20 min |
| 7 | Add `autoComplete` attributes to auth forms | `login/page.tsx`, `for-nurses/page.tsx` | 10 min |
| 8 | Add `type="tel" inputMode="numeric"` to phone input | `for-nurses/page.tsx` | 5 min |
| 9 | Fix Testimonials to `overflow-x-auto snap-x` or responsive grid | `Testimonials.tsx` | 30 min |
| 10 | Add `pr-12` to modal name wrapper to clear close button | `caregiver-directory-list.tsx` | 5 min |
| 11 | Add `order-first lg:order-last` to dashboard aside | `caregiver/dashboard/page.tsx` | 5 min |
| 12 | Add `title` attributes to Boosted and Licensed Nurse badges | `caregiver-directory-list.tsx` | 5 min |
| 13 | Add `aria-labelledby` to profile modal, replace `aria-label` | `caregiver-directory-list.tsx` | 5 min |
| 14 | Fix mobile nav: `popstate` close + remove `-ml-4` link bleed | `site-header.tsx` | 30 min |
| 15 | Add `w-full sm:w-auto` to CtaBanner button | `CtaBanner.tsx` | 5 min |
| 16 | Add `sizes` prop to hero `<Image>` for LCP optimization | `HeroSection.tsx` | 10 min |

---

### Batch 3 — Fix Later (Structural & Architecture Changes)
High value but require product/design decisions or touch many files.

| Step | Issue | File(s) | Est. Time |
|---|---|---|---|
| 17 | Split login into family/caregiver cards (remove toggle) | `login/page.tsx` | 2–3 hrs |
| 18 | Section dashboard form with named `<fieldset>` groups | `caregiver/dashboard/page.tsx` | 2 hrs |
| 19 | Add 4-step onboarding stepper across caregiver funnel | New component + 4 pages | 3–4 hrs |
| 20 | Allow photo-less profile saves on first publish | `caregiver/dashboard/page.tsx` | 1 hr |
| 21 | Directory empty state: distinguish "no filter match" vs "no caregivers" | `caregiver-directory-list.tsx`, `directory/page.tsx` | 1 hr |
| 22 | Add illustrated empty state to chats right panel | `chats/page.tsx` | 1 hr |
| 23 | Checklist items scroll to their corresponding form field | `caregiver/dashboard/page.tsx` | 1 hr |
| 24 | Redirect new clients to `/client/profile?setup=1` post-login | `oauth-complete/page.tsx`, `login/page.tsx` | 1 hr |
| 25 | Add "What happens next" list + direct link to signup-success page | `signup-success/page.tsx` | 30 min |
| 26 | Add `aria-expanded` to hamburger button in site header | `site-header.tsx` | 5 min |
| 27 | Add no-sign-out recovery to banned user oauth error | `oauth-complete/page.tsx` | 30 min |

---

## 5. Full Findings — Phase 2

### Responsive Layout

| ID | Finding | File | Severity |
|---|---|---|---|
| R1 | Card grid mobile collapse broken — `min-w-[220px]` causes horizontal scroll | `caregiver-directory-list.tsx` | 🔴 High |
| R2 | Nav `p-8` creates excessive whitespace on desktop at 1024–1280 px | `site-header.tsx` | 🟡 Low |
| R3 | 768–1023 px nav "dead zone" — desktop nav hidden, mobile drawer not triggered | `site-header.tsx` | 🟠 Medium |
| R4 | `Container` padding drops from 16 px to 0 at `max-w` boundary (cliff edge) | `Container.tsx` | 🟠 Medium |
| R5 | Benefits section has mobile gaps with orphaned last card | `Benefits.tsx` | 🟡 Low |
| R6 | Chats page: mobile has no visible scroll navigation between threads | `chats/page.tsx` | 🟠 Medium |
| R7 | Dashboard sidebar buried on mobile (see M6) | `caregiver/dashboard/page.tsx` | 🔴 High |

### Text Overflow

| ID | Finding | File | Severity |
|---|---|---|---|
| T1 | `line-clamp-3` bio has no "…read more" indicator — content silently cut | `caregiver-directory-list.tsx` | 🟠 Medium |
| T2 | Inline "Areas covered + Last active" in one `<p>` — overflows on long location names | `caregiver-directory-list.tsx` | 🟠 Medium |
| T3 | Nav links wrap at 1024–1200 px breakpoint | `site-header.tsx` | 🟡 Low |

### Spacing & Padding

| ID | Finding | File | Severity |
|---|---|---|---|
| S1 | Action column `text-right` misaligned on mobile | `caregiver-directory-list.tsx` | 🟠 Medium |
| S2 | Modal close button overlaps name on mobile (see M3) | `caregiver-directory-list.tsx` | 🔴 High |
| S3 | Dashboard label indentation broken — stray `<span>` wrapping inside `<label>` | `caregiver/dashboard/page.tsx` | 🟠 Medium |
| S4 | Footer `-ml-3` misaligns logo with content column | `site-footer.tsx` | 🟡 Low |
| S5 | CtaBanner button not full-width on mobile (see M8) | `CtaBanner.tsx` | 🟠 Medium |

### Images

| ID | Finding | File | Severity |
|---|---|---|---|
| I1 | Avatar landscape banner crop on mobile (see M7) | `caregiver-directory-list.tsx` | 🔴 High |
| I2 | Benefits icons have no aspect-ratio constraint — can collapse or overflow | `Benefits.tsx` | 🟡 Low |
| I3 | Hero image has no layout space reserved — causes CLS on load | `HeroSection.tsx` | 🟠 Medium |

### Contrast

| ID | Finding | File | Severity |
|---|---|---|---|
| C1 | CtaBanner `text/90` on gradient background — ~3.5:1, fails WCAG AA (4.5:1 required) | `CtaBanner.tsx` | 🔴 High |
| C2 | "Boosted" badge `#8a4c08` on `#fff4e3` — ~4.2:1, marginal pass, risky at small size | `caregiver-directory-list.tsx` | 🟠 Medium |
| C3 | FAQ answer text contrast marginal at `text-[#56677c]` on white | `faq-accordion.tsx` | 🟠 Medium |

### Visual Hierarchy

| ID | Finding | File | Severity |
|---|---|---|---|
| V1 | Card `<h2>` same visual weight as page `<h1>` — no hierarchy differentiation | `caregiver-directory-list.tsx` | 🟠 Medium |
| V2 | Two identical primary CTAs on hero — no visual hierarchy | `HeroSection.tsx` | 🟠 Medium |
| V3 | Success/error messages rendered far from submit button on mobile | Multiple pages | 🟠 Medium |
| V4 | Active nav state is color-only — no underline, no weight change | `site-header.tsx` | 🟡 Low |

### Component Consistency

| ID | Finding | File | Severity |
|---|---|---|---|
| CC1 | `site-header.tsx` uses raw Tailwind, all other components use custom CSS classes — design system split | `site-header.tsx` | 🟠 Medium |
| CC2 | Login toggle uses teal (`#0f766e`) while brand primary is indigo — color mismatch | `login/page.tsx` | 🟠 Medium |

### Mobile Nav

| ID | Finding | File | Severity |
|---|---|---|---|
| MN1 | No `popstate` listener — back button doesn't close nav drawer | `site-header.tsx` | 🟠 Medium |
| MN2 | Nav link `-ml-4 w-full` bleeds outside nav boundary | `site-header.tsx` | 🟠 Medium |
| MN3 | No sign-out option in mobile nav for client users | `site-header.tsx` | 🟠 Medium |

### Forms

| ID | Finding | File | Severity |
|---|---|---|---|
| F1 | 13-field unsectioned dashboard form (see #5) | `caregiver/dashboard/page.tsx` | 🔴 High |
| F2 | 4 auth pathways simultaneously on login page (see #4) | `login/page.tsx` | 🔴 High |
| F3 | Phone input missing `type="tel"` | `for-nurses/page.tsx` | 🟠 Medium |
| F4 | No password show/hide toggle on login | `login/page.tsx` | 🟠 Medium |

### CTAs

| ID | Finding | File | Severity |
|---|---|---|---|
| CTA1 | "Start chat" buried below fold on mobile (see M2) | `caregiver-directory-list.tsx` | 🔴 High |
| CTA2 | Two identical hero CTAs ("Find a Caregiver" × 2) with same styling | `HeroSection.tsx` | 🟠 Medium |
| CTA3 | CtaBanner has no CTA for caregivers — only targets families | `CtaBanner.tsx` | 🟠 Medium |

### Empty States

| ID | Finding | File | Severity |
|---|---|---|---|
| E1 | Chats thread list: text-only, no link to browse caregivers | `chats/page.tsx` | 🟠 Medium |
| E2 | Chats right panel: "Select a conversation" with no illustration or guidance | `chats/page.tsx` | 🟡 Low |
| E3 | Directory empty state doesn't distinguish "no filter match" vs "truly empty" | `directory/page.tsx` | 🟠 Medium |

---

## 6. Full Findings — Phase 3

### Loading States

| ID | Finding | File | Severity |
|---|---|---|---|
| L1 | `oauth-complete` shows plain text during session resolution — no spinner | `oauth-complete/page.tsx` | 🟠 Medium |
| L2 | Dashboard shows "Loading caregiver dashboard..." plain text — no skeleton | `caregiver/dashboard/page.tsx` | 🟡 Low |
| L3 | Chats page has no skeleton — content flash on load | `chats/page.tsx` | 🟡 Low |
| L4 | Messages list: loading state visually identical to empty state | `chats/page.tsx` | 🟠 Medium |
| L5 | `for-nurses` has no transition between submit and OTP redirect | `for-nurses/page.tsx` | 🟡 Low |
| L6 | `reset-password` silently disables form without indication during processing | `reset-password/page.tsx` | 🟠 Medium |

### Error States

| ID | Finding | File | Severity |
|---|---|---|---|
| ER1 | No `role="alert"` on any error message anywhere in the codebase (see #7) | All pages | 🔴 High |
| ER2 | Error message rendered far from submit button — no proximity on mobile | Multiple pages | 🟠 Medium |
| ER3 | `oauth-complete` error has no recovery action (no "Try again" link) | `oauth-complete/page.tsx` | 🟠 Medium |
| ER4 | Directory exposes raw Supabase error strings to users | `directory/page.tsx` | 🟠 Medium |
| ER5 | Modal has no stale-data error handling if profile fetch fails | `caregiver-directory-list.tsx` | 🟡 Low |

### Success States

| ID | Finding | File | Severity |
|---|---|---|---|
| SU1 | `successMessage` never auto-dismisses (see #8) | `dashboard/page.tsx`, `client/profile/page.tsx` | 🟠 Medium |
| SU2 | `reset-password` 900 ms redirect has no countdown copy | `reset-password/page.tsx` | 🟡 Low |
| SU3 | `signup-success` copy promises auto-redirect that never reliably fires | `signup-success/page.tsx` | 🟠 Medium |

### Hover / Focus / Active States

| ID | Finding | File | Severity |
|---|---|---|---|
| HF1 | Card buttons use off-brand teal focus rings (`focus-visible:ring-[#0f766e]`) | `caregiver-directory-list.tsx` | 🟡 Low |
| HF2 | Filter tag buttons have no visible hover state | `directory-filters.tsx` | 🟠 Medium |
| HF3 | FAQAccordion `<summary>` has no hover style | `faq-accordion.tsx` | 🟡 Low |
| HF4 | Mobile nav links: hover is color-only, no background highlight | `site-header.tsx` | 🟡 Low |
| HF5 | `primary-btn` box-shadow jumps on `:active` — no transition | `globals.css` | 🟡 Low |
| HF6 | Dashboard checkboxes use teal accent (`text-[#0f766e]`) — off-brand | `caregiver/dashboard/page.tsx` | 🟡 Low |

### Accessibility

| ID | Finding | File | Severity |
|---|---|---|---|
| A1 | No `role="alert"` anywhere (see ER1) | All pages | 🔴 High |
| A2 | Profile modal uses `aria-label` instead of `aria-labelledby` — less robust | `caregiver-directory-list.tsx` | 🟠 Medium |
| A3 | `<h2>` inside `<button>` — invalid HTML, screen readers treat it unpredictably | `caregiver-directory-list.tsx` | 🔴 High |
| A4 | Two identical `aria-label` per card (photo button + body button) | `caregiver-directory-list.tsx` | 🟠 Medium |
| A5 | `<details>` / `<summary>` FAQ has no `aria-expanded` equivalent | `faq-accordion.tsx` | 🟠 Medium |
| A6 | Profile avatar fallback (initials div) has no accessible name | `profile-avatar.tsx` | 🟠 Medium |
| A7 | Hamburger button has no `aria-expanded` attribute | `site-header.tsx` | 🟠 Medium |
| A8 | No `autocomplete` attributes on email/password fields (see QW5) | `login/page.tsx`, `for-nurses/page.tsx` | 🟠 Medium |

**On A3 specifically** — `<h2>` inside `<button>` is invalid HTML per the spec (interactive content cannot contain heading elements). Replace with a `<span className="text-2xl font-bold ...">`:

```tsx
// Before
<button type="button" ...>
  <div ...>
    <h2 className="text-2xl font-bold ...">
      {profile.full_name}
    </h2>
  </div>

// After
<button type="button" ...>
  <div ...>
    <span className="text-2xl font-bold tracking-tight text-[#10233b]">
      {profile.full_name}
    </span>
  </div>
```

### Trust

| ID | Finding | File | Severity |
|---|---|---|---|
| TR1 | "Boosted" badge — unexplained paid placement (see #10) | `caregiver-directory-list.tsx` | 🔴 High |
| TR2 | "Licensed Nurse" badge — no verification context (see #10) | `caregiver-directory-list.tsx` | 🟠 Medium |
| TR3 | "Sign Up" nav link goes to caregiver-only `/for-nurses` — families are misled | `site-header.tsx` | 🔴 High |
| TR4 | Banned user oauth error has no recovery path or support contact | `oauth-complete/page.tsx` | 🟠 Medium |
| TR5 | "Draft saved" message is always static text — doesn't confirm actual save time | `caregiver/dashboard/page.tsx` | 🟡 Low |
| TR6 | No session expiry handling — expired sessions silently fail on next action | Multiple pages | 🟠 Medium |
| TR7 | "Start chat" link navigates unauthenticated users without warning | `caregiver-directory-list.tsx` | 🟠 Medium |

**On TR3:** The nav "Sign Up" link routes to `/for-nurses` which is caregiver signup only. Families who click it are taken to a phone number entry form with no explanation that it's caregiver-only. Fix: Change to `/login` or a role-selection page.

---

## 7. Full Findings — Phase 4

### A. Crowding & Emptiness

| ID | Finding | File | Severity |
|---|---|---|---|
| A1 | Dashboard form: 13 fields, no visual grouping (see #5) | `caregiver/dashboard/page.tsx` | 🔴 High |
| A2 | Dashboard sidebar sparse while form is crowded; wrong read order on mobile | `caregiver/dashboard/page.tsx` | 🟠 Medium |
| A3 | `for-nurses` has huge vertical whitespace between hero and OTP form on mobile | `for-nurses/page.tsx` | 🟡 Low |
| A4 | `signup-success` page is nearly empty — no progress indicator or next steps | `signup-success/page.tsx` | 🟠 Medium |
| A5 | Chats right panel empty with no illustration or guidance | `chats/page.tsx` | 🟠 Medium |
| A6 | Directory empty state doesn't distinguish filter miss vs truly empty (see E3) | `directory/page.tsx` | 🟠 Medium |

**On A4 — signup-success fix:**
```tsx
// Add after the current spinner/message
<ol className="mt-6 space-y-2 text-sm text-left text-[#4f647e]">
  <li>✅ Step 1: Phone verified</li>
  <li>✅ Step 2: Account created</li>
  <li>→ Step 3: Complete your caregiver profile</li>
  <li>→ Step 4: Go live on the directory</li>
</ol>
<Link href="/caregiver/dashboard?setup=1" className="primary-btn mt-4 w-full">
  Set up my profile now →
</Link>
```

### B. Desktop-Only Layouts That Break on Small Screens

| ID | Finding | File | Severity |
|---|---|---|---|
| B1 | Dashboard `lg:grid-cols-[1.15fr_0.85fr]` has no tablet mid-tier layout | `caregiver/dashboard/page.tsx` | 🔴 High |
| B2 | `HeroSection` absolute-positioned image overlaps text at 768–1023 px | `HeroSection.tsx` | 🔴 High |
| B3 | `VideoPanel` fixed `h-[500px]` breaks aspect ratio on mobile (see #3) | `VideoPanel.tsx` | 🔴 High |
| B4 | Benefits grid orphans last card on tablet with `md:grid-cols-2` | `Benefits.tsx` | 🟡 Low |
| B5 | Testimonials `min-w-[220px]` in flex causes hidden overflow (see #9) | `Testimonials.tsx` | 🔴 High |

**On B1 — add a tablet mid-tier:**
```tsx
// Before
<main className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">

// After
<main className="mt-6 grid gap-5 md:grid-cols-[1fr_280px] lg:grid-cols-[1.15fr_0.85fr]">
```

**On B4 — fix orphan card:**
```tsx
// Add to each benefit item
<div className="last:md:col-span-2 last:lg:col-span-1">
```

### C. Image Containers That Scale Badly

| ID | Finding | File | Severity |
|---|---|---|---|
| C1 | `ProfileAvatar` landscape banner crop on mobile (see #6, M7) | `caregiver-directory-list.tsx` | 🔴 High |
| C2 | Benefits icons have no `shrink-0` — can be compressed by sibling text | `Benefits.tsx` | 🟡 Low |
| C3 | Hero `<Image>` has no `sizes` prop — loads desktop image on mobile | `HeroSection.tsx` | 🟠 Medium |
| C4 | Directory card photos use `object-cover` with no `object-position` — faces cropped | `caregiver-directory-list.tsx` | 🔴 High |

**On C3:**
```tsx
<Image
  src={heroImage}
  alt="Caregiver with elder"
  priority
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**On C2:**
```tsx
// Wrap each benefit icon
<div className="shrink-0 flex h-10 w-10 items-center justify-center" aria-hidden="true">
  {/* icon */}
</div>
```

### D. Signup & Onboarding Friction

| ID | Finding | File | Severity |
|---|---|---|---|
| D1 | Caregiver onboarding: 3 stages, 4 pages, no persistent progress bar | Multiple pages | 🔴 High |
| D2 | `for-nurses` phone input missing `type="tel"` (see QW6, F3) | `for-nurses/page.tsx` | 🟠 Medium |
| D3 | Dashboard requires photo on first save — blocks submission | `caregiver/dashboard/page.tsx` | 🔴 High |
| D4 | `verify-otp` page has no resend code button (see #2) | `for-nurses/verify-otp/page.tsx` | 🔴 High |
| D5 | Login page: 4 simultaneous auth paths, no role guidance (see #4) | `login/page.tsx` | 🔴 High |
| D6 | `/client/profile` not linked from nav or post-login flow | `client/profile/page.tsx` | 🟠 Medium |
| D7 | No `autocomplete` attributes on auth forms (see QW5, A8) | `login/page.tsx`, `for-nurses/page.tsx` | 🟠 Medium |
| D8 | `oauth-complete` has no loading state or explanatory copy | `oauth-complete/page.tsx` | 🟠 Medium |
| D9 | Dashboard checklist items don't link/scroll to their form fields | `caregiver/dashboard/page.tsx` | 🟠 Medium |

**On D1 — add a stepper component:**
```tsx
// components/OnboardingStepper.tsx
type Step = { label: string; done: boolean };
const STEPS: Step[] = [
  { label: "Phone", done: false },
  { label: "Verify", done: false },
  { label: "Profile", done: false },
  { label: "Live", done: false },
];

export function OnboardingStepper({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className={`rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold
            ${i + 1 < currentStep ? "bg-indigo-600 text-white" : ""}
            ${i + 1 === currentStep ? "border-2 border-indigo-600 text-indigo-600" : ""}
            ${i + 1 > currentStep ? "border border-gray-300 text-gray-400" : ""}
          `}>
            {i + 1 < currentStep ? "✓" : i + 1}
          </div>
          <span className="text-xs">{step.label}</span>
          {i < STEPS.length - 1 && <div className="h-px w-6 bg-gray-300" />}
        </div>
      ))}
    </div>
  );
}
```

**On D3 — allow photo-less first save:**
```tsx
// Before
required={requiresProfilePhoto}

// After — change to a warning, not a hard block
// Remove the required attribute, add a warning in the hint text:
<p className="text-xs text-amber-600">
  {requiresProfilePhoto
    ? "⚠ A profile photo is strongly recommended. Your listing will not appear in the directory until a photo is added."
    : ""}
</p>
```

**On D8 — oauth-complete loading state:**
```tsx
return (
  <div className="site-shell">
    <SiteHeader />
    <section className="surface-panel page-enter flex flex-col items-center gap-4 p-12 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      <p className="text-base font-semibold text-[#10233b]">Signing you in…</p>
      <p className="text-sm text-[#56677c]">This usually takes just a moment.</p>
    </section>
  </div>
);
```

---

## Severity Key

| Symbol | Meaning |
|---|---|
| 🔴 High | Breaks a core flow, causes significant trust damage, or fails accessibility in a critical path |
| 🟠 Medium | Degrades usability, polish, or accessibility without fully blocking a flow |
| 🟡 Low | Minor polish issue; fix when time permits |

---

*End of audit. Total findings: 86 across Phases 2, 3, and 4.*
