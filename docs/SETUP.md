# Bayline setup: Supabase + Vercel

Do these once. Takes about 20 minutes. Never paste keys into chat, email or GitHub: they only go in
`.env.local` (on your Mac) and in Vercel's Environment Variables.

## 1. Create the Supabase project

1. Go to https://supabase.com and sign in (Continue with GitHub is fine).
2. Click **New project**.
   - Organization: your personal one
   - Name: `bayline`
   - Database password: click **Generate a password**, then save it in your password manager. You need it in step 3.
   - Region: **East US (North Virginia)** (or whichever is closest to your venues)
   - Plan: Free
3. Click **Create new project** and wait 1–2 minutes until the dashboard loads.

## 2. Copy the keys into `.env.local`

Open `.env.local` in this project folder (it's already created and is ignored by git).

| Line in `.env.local` | Where to find it in Supabase |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Project Settings → Data API → Project URL** (looks like `https://abcd1234.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Project Settings → API Keys → Publishable key** (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | **Project Settings → API Keys → Secret keys** → reveal and copy (`sb_secret_…`) |
| `SUPABASE_DB_URL` | Click **Connect** (top of the dashboard) → **Session pooler** → copy the URI, and replace `[YOUR-PASSWORD]` with the database password from step 1 |

If you only see "anon" and "service_role" keys (Legacy API Keys tab), those work too: anon goes in the
publishable line, service_role in the secret line.

Leave `NEXT_PUBLIC_SITE_URL=http://localhost:3000` as it is. Save the file.

**Then tell Claude "keys are in".** Claude will create the tables, run the security test and seed the test venues.

## 3. Auth settings in Supabase

1. **Authentication → Sign In / Providers**
   - Turn **off** "Allow new users to sign up". (Owners only get in by invite.)
   - Make sure **Email** is enabled.
2. **Authentication → URL Configuration**
   - Site URL: `https://getbayline.app`
   - Redirect URLs, add both:
     - `http://localhost:3000/**`
     - `https://getbayline.app/**`
3. **Authentication → Emails → Templates**. Replace two templates so login links work even when an
   owner opens the email on a different device:

   **Magic link** template, Message body:
   ```html
   <h2>Your Bayline login link</h2>
   <p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Log in to Bayline</a></p>
   <p>This link works once and expires in 1 hour. If you didn't ask for it, ignore this email.</p>
   ```

   **Invite user** template, Message body:
   ```html
   <h2>You're invited to Bayline</h2>
   <p>You've been set up to see your venue's customers and rewards on Bayline.</p>
   <p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">Accept the invite and log in</a></p>
   ```

## 4. Email delivery (before inviting a real owner)

Supabase's built-in email only delivers to addresses on your Supabase team, a few per hour. That's fine
for testing with your own email, but real owners won't receive invites until you connect your own sender:

1. Sign up at https://resend.com (free tier is plenty).
2. **Domains → Add domain** → `getbayline.app`, then add the DNS records it shows at your domain
   registrar. Wait until Resend shows the domain as verified.
3. **API Keys → Create API key** (sending access). Copy it.
4. In Supabase: **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   - Sender email: `peter@getbayline.app`, sender name: `Bayline`
   - Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: the Resend API key
5. Save. Optionally raise **Authentication → Rate Limits → emails per hour**.

## 5. Vercel environment variables

In Vercel: open the **Bayline** project → **Settings → Environment Variables**. Add each of these for
**Production** and **Preview**:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | same as in `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same as in `.env.local` |
| `SUPABASE_SECRET_KEY` | same as in `.env.local`, and tick **Sensitive** |
| `NEXT_PUBLIC_SITE_URL` | `https://getbayline.app` |

Do **not** add `SUPABASE_DB_URL` to Vercel; only local scripts use it.

Environment variables only apply to new builds, so after adding them go to **Deployments**, open the
latest one, click **⋯ → Redeploy**.

If getbayline.app isn't connected yet: **Settings → Domains → Add** `getbayline.app`, then add the DNS
records Vercel shows at your registrar.

## Day-to-day commands

```bash
npm run db:migrate       # apply new files in supabase/migrations
npm run db:seed          # (re)create the two test venues with fake customers
npm run test:security    # prove venue owners can't see each other's data
npm run make-admin -- you@example.com   # give an email platform-admin access
```
