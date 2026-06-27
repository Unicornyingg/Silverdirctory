Place the caregiver replacement portraits in this folder before running:

```bash
node scripts/update-caregiver-photos.mjs
```

The script reads [caregiver-photo-manifest.json](/Users/wenn/Silverdirctory/supabase/caregiver-photo-manifest.json) and uploads each image to the live Supabase `caregiver-profile-photos` bucket, then updates `profiles.profile_photo_url`.

Requirements for every portrait:

- Match the caregiver's implied race/ethnicity and gender presentation from their name.
- Asian-presenting overall, including Chinese, Malay, Indian, Indonesian, and Filipina appearances where appropriate.
- Modest plain T-shirt or simple crew-neck top only.
- Solo portrait, chest-up or shoulders-up.
- Neutral background, no text, no logos, no uniforms, no low-cut tops.
- Natural lighting and realistic expression.

Recommended filenames are already listed in the manifest.
