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

## 6. One web address (needed before wallet passes)

Apple Wallet talks to exactly one address and does **not** follow redirects. Right now
`getbayline.app` redirects to `www.getbayline.app`, so pick the short one as the real address:

1. Vercel → **Bayline → Settings → Domains**. Click **Edit** on `www.getbayline.app` and set it to
   **Redirect to `getbayline.app`** (308). Make sure `getbayline.app` itself shows no redirect.
2. Keep `NEXT_PUBLIC_SITE_URL=https://getbayline.app` in Vercel.
3. Supabase → **Authentication → URL Configuration**: Site URL `https://getbayline.app`; Redirect URLs
   include `https://getbayline.app/**`, `https://www.getbayline.app/**`, `http://localhost:3000/**`.

Check: `https://getbayline.app/api/health` should open without redirecting, and `"ok": true`.

## 7. Apple Wallet

You need a paid Apple Developer Program membership ($99/year, https://developer.apple.com/programs/).
Keep every file below in a private folder **outside** this project (not on the iCloud Desktop):

```bash
mkdir -p ~/bayline-secrets && cd ~/bayline-secrets
```

1. **Make a key and signing request** (Terminal, in `~/bayline-secrets`):
   ```bash
   openssl req -new -newkey rsa:2048 -nodes -keyout pass.key -out pass.csr -subj "/emailAddress=peter@getbayline.app/CN=Bayline Wallet/C=US"
   ```
2. **Pass Type ID**: https://developer.apple.com/account → **Certificates, IDs & Profiles → Identifiers → +**
   → **Pass Type IDs** → Continue. Description `Bayline rewards`, identifier `pass.app.getbayline.rewards`
   → Register.
3. **Certificate**: click the new Pass Type ID → **Create Certificate** → upload `pass.csr` → Continue →
   **Download** (you get `pass.cer`). Move it into `~/bayline-secrets`, then:
   ```bash
   openssl x509 -inform der -in pass.cer -out pass.pem
   ```
4. **Apple's intermediate certificate (WWDR G4)**: from https://www.apple.com/certificateauthority/
   download **Worldwide Developer Relations - G4**, put it in `~/bayline-secrets`, then:
   ```bash
   openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
   ```
5. **Team ID**: https://developer.apple.com/account → **Membership details → Team ID** (10 characters).
6. **Add to Vercel** (Settings → Environment Variables, Production + Preview, tick **Sensitive** for the
   three certificate values). Each `base64` command copies the value to your clipboard; paste it into Vercel:

   | Key | Value |
   | --- | --- |
   | `APPLE_PASS_TYPE_ID` | `pass.app.getbayline.rewards` |
   | `APPLE_TEAM_ID` | your Team ID |
   | `APPLE_PASS_CERT_BASE64` | `base64 -i pass.pem \| pbcopy` |
   | `APPLE_PASS_KEY_BASE64` | `base64 -i pass.key \| pbcopy` |
   | `APPLE_WWDR_CERT_BASE64` | `base64 -i wwdr.pem \| pbcopy` |

   To test locally too, add the same five lines to `.env.local`.
7. **Push updates (APNs)**: nothing extra. Pass updates are pushed with the same Pass Type ID
   certificate.
8. Redeploy, then open `/api/health`: `wallet.apple` should show `certMatchesKey: true`,
   `passTypeIdInCert: true` and an expiry date. The certificate lasts about a year; put a reminder in
   your calendar to renew it (repeat steps 1, 3 and 6).

## 8. Google Wallet

1. **Issuer account**: https://pay.google.com/business/console → sign in → create the business profile
   (Bayline) → **Google Wallet API** → Get started. Copy the **Issuer ID** (a long number).
2. **Cloud project**: https://console.cloud.google.com → project picker → **New project** (`bayline-wallet`)
   → **APIs & Services → Library** → search **Google Wallet API** → **Enable**.
3. **Service account**: **IAM & Admin → Service Accounts → Create service account** (`bayline-wallet`, no
   roles needed) → open it → **Keys → Add key → Create new key → JSON**. Move the downloaded file to
   `~/bayline-secrets/google-wallet.json`.
4. **Link it**: back in the Pay & Wallet Console → **Users** → **Invite a user** → the service account's
   email (ends in `iam.gserviceaccount.com`) → access **Developer**.
5. **Demo mode**: until Google approves your issuer account, passes only work for test accounts. Add your
   own Google account (and any Android phone you'll demo on) as a test user in the Google Wallet API
   section of the console. When you're ready for real customers, click **Request publishing access**.
6. **Add to Vercel** (Production + Preview, **Sensitive** for the key):

   | Key | Value |
   | --- | --- |
   | `GOOGLE_WALLET_ISSUER_ID` | the Issuer ID |
   | `GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64` | `base64 -i ~/bayline-secrets/google-wallet.json \| pbcopy` |

7. Redeploy, then `/api/health` should show `wallet.google.tokenOk: true`.

## 9. Wallet badge artwork

The "Add to Apple Wallet" and "Add to Google Wallet" buttons must use the official artwork. The files in
`public/wallet/` are placeholders. Download the official badges and save them over them, using the same
names (`add-to-apple-wallet.svg`, `add-to-google-wallet.svg`):

- Apple: https://developer.apple.com/wallet/add-to-apple-wallet-guidelines/ (US English, black badge, SVG)
- Google: https://developers.google.com/wallet/generic/resources/brand-guidelines ("Add to Google Wallet"
  button, SVG)

## 10. NFC stand

Each venue's stand link is on the dashboard's **Stand** tab (`https://getbayline.app/t/your-venue`). For each
stand:

1. Buy NTAG215 NFC stickers (NTAG213 or 216 also work) and a 4×6" acrylic sign holder.
2. Install the free **NFC Tools** app (iPhone or Android).
3. **Write → Add a record → URL/URI**, paste the stand link, tap **Write**, hold the phone to the sticker.
4. Test: tap the sticker with a phone. It should open the join page.
5. **Lock it**: NFC Tools → **Other → Lock tag** → hold to the sticker. (Permanent: nobody can overwrite it.)
6. Stick the tag behind the "Hold your phone here" spot, print the 4×6" insert from the Stand tab, and slide it
   into the holder.

The tag always points at the stand link, so what a tap does can change later without touching the tag.

## Testing on real phones

- iPhone (Safari) and Android (Chrome): open the stand link, join, add the card to the wallet.
- Tap again the same day: "You've already earned today's stamp" (normal venues). On **Bayline Demo**
  (`/t/bayline-demo`) every tap adds a stamp, so you can show a card filling up live.
- After a stamp, the wallet card should update within a few seconds (iPhone shows "Stamp added: 2 of 5").
- When the card is full: "Reward ready, show staff". Redeem it from **Add visit** on the dashboard.

## Day-to-day commands

```bash
npm run db:migrate       # apply new files in supabase/migrations
npm run db:seed          # (re)create the two test venues with fake customers
npm run test:security    # prove venue owners can't see each other's data
npm run make-admin -- you@example.com   # give an email platform-admin access
```
