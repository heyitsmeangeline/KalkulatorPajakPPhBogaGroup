# Sign Up / Login setup

The calculator is now protected by Supabase Authentication. Users must sign up or log in before the calculator is rendered. Sessions are persisted in the browser and refreshed automatically.

## 1. Create a Supabase project

Create a project at https://supabase.com/ and open **Authentication → Providers → Email**. Keep Email provider enabled.

For a first internal deployment, you can choose whether email confirmation is required. If confirmation is enabled, a new user must click the confirmation email before logging in.

## 2. Get the browser credentials

From the Supabase project settings/API page, copy:

- Project URL
- Publishable/anon key

Never use or expose the `service_role` key in this frontend.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

`.env.local` is ignored by Git.

## 4. Run locally

```bash
pnpm install
pnpm run dev
```

## 5. Deploy

Add the same two environment variables to the hosting provider (for example Vercel, Netlify, or Cloudflare Pages), then build with `pnpm run build`.

## What was added

- Sign Up with name, email, password and password confirmation
- Login with email/password
- Supabase Auth session persistence
- Automatic token refresh
- Logout
- Calculator is blocked until authenticated
- Existing tax calculator UI and calculation code are kept intact
