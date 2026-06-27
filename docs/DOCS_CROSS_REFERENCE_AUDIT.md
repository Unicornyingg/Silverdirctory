# Documentation vs. Codebase Cross-Reference Audit

This document records the latest content consistency pass across the public app
copy, FAQ pages, README, and technical docs.

## Current Findings

### Resolved in this pass

1. Caregiver FAQ registration wording
   - Previous issue: the FAQ said caregivers register with an email/password
     account.
   - Current code: caregiver onboarding starts with phone OTP, then stores email
     and password details.
   - Fix: FAQ now says caregivers register through phone OTP, provide an email
     and password, then complete their profile.

2. Homepage verification wording
   - Previous issue: "Verified profile cues" could sound like every profile or
     credential is verified.
   - Current code: basic caregiver listings can be published, while only
     approved nursing licence uploads show the public Licensed Nurse tag.
   - Fix: homepage chip now says "Clear profile cues."

3. README directory wording
   - Previous issue: README described `/directory` as showing "verified
     caregiver cards."
   - Current code: the directory shows published caregiver profiles where
     `is_verified = true`; nursing licence approval is represented separately
     by the Licensed Nurse tag.
   - Fix: README now says "published caregiver cards."

### Checked and currently aligned

- Google login: no Google sign-in copy or route remains, apart from
  `next/font/google`, which is unrelated to authentication.
- Boosted profiles: no public boost or paid visibility flow remains. The
  schema explicitly drops old boost columns.
- Payments: public FAQ, homepage copy, README, and footer consistently state
  that Silver Directory does not process wages or provide a payment gateway.
- Matching: public copy consistently says there is no auto-matching or
  auto-assignment.
- Scheduling: public copy consistently says scheduling is arranged directly
  between families and caregivers.
- Phone OTP: login, caregiver onboarding, README, and user guide consistently
  describe SMS OTP support.
- Licensed Nurse review: caregiver dashboard, admin page, FAQ, and docs now
  consistently frame document upload as optional review for a public Licensed
  Nurse tag, not as full platform-wide credential verification.

## Remaining Notes

- The project still has no automated test suite beyond lint/build validation.
- The app uses `middleware.ts` for admin key bootstrap. Next.js 16 warns that
  the middleware convention is deprecated in favor of proxy, but the current
  code and documentation are aligned around the existing file.
- `public.users` is a read-only view in the schema, not an insertable table.
  This is already reflected in the technical documentation.
