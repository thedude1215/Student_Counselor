# ScholarPath Supabase Email Templates

Paste these into Supabase Dashboard > Authentication > Email Templates.

## Confirm Sign Up

- Subject: `Your ScholarPath verification code`
- Body: use `confirmation.html`

## Reset Password

- Subject: `Your ScholarPath reset code`
- Body: use `recovery.html`

Both templates use `{{ .Token }}` so Supabase sends a 6-digit code instead of a link.
