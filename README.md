# My WU Schedule

Static WU Digital Economy planner with Google sign-in and private, per-semester
course selections in Supabase. The published site is `docs/`; `planner/` is the
older standalone prototype and is not part of this integration.

Without account configuration the application works as a guest planner and saves
the selection on the current device. Google sign-in is visibly unavailable until
the public project settings are configured. No email login or confirmation emails
are implemented.

## Connect Supabase and Google

1. Create a Supabase project, preferably in a European region. Keep the database
   password and all secret keys out of the repository and chat. Get the **Project
   URL** and **publishable key** (`sb_publishable_…`) from the project's Connect
   dialog.
2. Apply these SQL files, in order, in the project's SQL editor:
   - `supabase/migrations/202610070001_google_schedule.sql`
   - `supabase/migrations/202610070002_semester_catalog.sql`
   Alternatively apply them with the Supabase CLI migration workflow. The SQL
   editor files are one-time migrations, not repeatedly executable seed scripts.
   For one copy-and-paste operation, `npm run prepare:setup` creates a combined,
   atomic `supabase/setup.local.sql`. Run that file once instead of the two
   migrations on a new project.
3. In Google Cloud / Google Auth Platform, create or select a project, configure
   the app branding and OAuth consent audience, and create a **Web application**
   OAuth client. Request only basic sign-in information; no Gmail or calendar
   permissions are needed.
4. In Supabase **Authentication → Sign In / Providers → Google**, copy the exact
   callback URL shown by Supabase into Google's **Authorized redirect URIs**.
   It normally looks like `https://PROJECT_REF.supabase.co/auth/v1/callback`.
   Enable Google and enter the OAuth client ID and secret **in Supabase only**.
   If Google asks for an authorized JavaScript origin, use the site's origin
   without its repository path.
5. Disable the Email provider, Phone, Anonymous sign-ins, and any other enabled
   sign-in providers. Allow new Google users if the application is open to others.
   The database also rejects sessions whose provider is not Google.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to the
   site's real production URL and allow its exact callback destination:
   `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/index.html` (or your custom
   domain). Include the repository path. For local testing additionally allow
   `http://127.0.0.1:4173/index.html` and/or `http://localhost:4173/index.html`.
   No `/auth/callback` server route is needed: the static `index.html` consumes
   the PKCE code and clears it before normal navigation.
7. Configure the public browser settings locally:

   ```sh
   npm ci
   npm run configure:auth -- https://PROJECT_REF.supabase.co sb_publishable_YOUR_KEY
   ```

   This updates `docs/auth-config.js` and the CSP in `docs/index.html` to allow
   only the configured project. These settings are public; secret keys are
   explicitly rejected by the script. Commit the public settings on the feature
   branch when ready.
8. Run the checks below and publish the configured branch's `/docs` through your
   existing GitHub Pages workflow. If the Google app is in Testing mode, add the
   intended accounts as test users. Configure the consent audience for public
   access before inviting users outside that list.

Authoritative setup references: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google),
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), and
[API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Enable the owner's Iurii / Anna / Both profiles

Ordinary accounts see **My schedule**. Owner accounts additionally see **Iurii**,
**Anna**, **Both**, and **Custom**. The owner's manual Custom selection is retained
when switching presets. Both shows the union of their classes and separate
metrics, including both groups where their choices differ. There are no time
conflict indicators.

1. Sign in once with the intended owner's Google account.
2. Generate the administrative SQL locally:

   ```sh
   npm run prepare:owner -- OWNER_GOOGLE_EMAIL
   ```

3. Run the contents of `supabase/owner-account.local.sql` in Supabase's trusted
   SQL editor. It finds exactly one confirmed Google identity and grants access
   to that identity's immutable Supabase user UUID. Users cannot grant themselves
   access by editing their display name, email in the browser, or metadata.
4. In the application, use **Settings → Retry** if offered, or reload the page.
   The owner profiles now appear. Existing browser choices from the previous
   version are offered for import if a cloud plan already exists; an existing
   cloud selection is never silently replaced.

The local grant file is excluded from Git, so the owner's personal email is not
included in committed configuration. Do not expose the `private` schema through
Supabase's Data API. Revoking an owner grant removes server access to the presets
on the next successful account refresh. Previously downloaded local data is not
remotely erased; explicit sign-out clears the active account's device cache.

## Data and access rules

- Public WU events remain in `docs/data/schedule.json`. Signing in does not update
  that snapshot or connect to WU's personal registration systems.
- A plan stores selected course IDs, the semester, the display profile, a server
  revision, and an update timestamp with timezone. It does not duplicate events.
- Every selected ID is validated against the semester catalog. Only one group
  per discipline can be selected and required disciplines remain enabled.
- `user_plans` has Row Level Security. Signed-in users can directly read only
  their own rows. They cannot directly insert, update, or delete plans: writes
  go through the validated `save_schedule_plan` function, which derives the
  account from the verified JWT and never accepts a caller-supplied user ID.
- Owner permissions, preset templates, and catalog validation references are in
  the unexposed `private` schema. Only the account context function returns the
  permitted presets.
- A stale revision raises a conflict. The local draft is preserved until the
  user chooses the cloud schedule or explicitly keeps the device's version.
- Failed network saves retain the pending draft in the account's local cache.
  A returning user with a cached session and plan can view and edit that plan
  offline; fresh sign-in needs connectivity. Reconnecting retries verification
  and checks the cloud revision before saving. Devices without a usable cached
  session may need to reconnect before loading an account.
- Signing out cancels queued saves, removes the active account's device cache,
  and resets the planner to a guest selection. It does not delete the cloud plan.
- The service worker caches an allowlist of public app assets. Auth callbacks,
  authenticated requests, and Supabase API responses are not cached by it.

When refreshing the WU catalog or adding a new semester, update the private
catalog through a reviewed migration as well as the public snapshot. Do not
delete or silently replace user selections whose course IDs disappear.

## Development and verification

```sh
npm ci
npm run build:vendor
npm test
npx playwright install chromium
npm run test:browser
```

The checked-in Supabase browser bundle is built from the pinned official SDK, so
the published app has no executable CDN dependency. `npm run build:vendor`
regenerates it. GitHub Pages needs no package installation or build step.
After changes to any published app asset, run `npm run version:assets` so existing
PWA installations receive the update. Vendor rebuilding and auth configuration
also update the cache fingerprint automatically.

On macOS, an installed Chrome can be used instead of downloading Chromium:

```sh
WU_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:browser
```

For a manual preview:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs
```

Unit tests cover account lifecycle, old-choice migration, offline drafts,
conflicting writes, and late responses after sign-out. Database tests execute
the real migrations in embedded PostgreSQL with distinct authenticated roles;
they verify isolation, rejected owner-profile access, invalid course choices,
and optimistic concurrency. Browser tests cover guest and signed-in interfaces,
owner presets, mobile callbacks, and an OAuth request from the real SDK.

Browser account responses are mocked for reproducibility. **A live Google login,
deployed Supabase policies, and installed-PWA return from Google still need to be
checked with the actual configured services before production use.**

## Working branches

The Google integration is developed on `codex/google-auth`. Continue development
on an appropriate separate feature branch; do not make future changes directly
on the published/default branch without the owner's explicit instruction.
