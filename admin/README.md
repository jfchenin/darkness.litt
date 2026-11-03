# Darkness.litt admin (Keystatic)

Separate Astro 5 + Keystatic app deployed as the Worker `darkness-litt-admin` on `https://admin.chenin.fr`. It edits the content repo `jfchenin/darkness.litt-content` through a GitHub App. It is not part of the public Worker.

> Live deploy, GitHub App creation and the Cloudflare Access policy (Tasks 4–5 of the plan) are **owner actions outside the repo**. This README only documents them.

## Environment variables

| Name | When | Where |
| --- | --- | --- |
| `KEYSTATIC_STORAGE` | build time | Set to `github` by `pnpm --dir admin run deploy`. Unset or anything else = local mode. |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | build time | `admin/.env` or shell env when deploying (slug of the GitHub App). |
| `KEYSTATIC_GITHUB_CLIENT_ID` | runtime | Wrangler secret |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | runtime | Wrangler secret |
| `KEYSTATIC_SECRET` | runtime | Wrangler secret (random string, e.g. `openssl rand -hex 32`) |

See `.env.example`. Never commit real values (`admin/.env` is git-ignored).

## Owner setup (one-time)

### 1. Create the GitHub App

GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.

- Callback URL: `https://admin.chenin.fr/api/keystatic/github/oauth/callback` (Keystatic sends this origin; if the App already lists another callback, replace it)
- Request user authorization (OAuth) during installation: enabled
- Expire user authorization tokens: enabled is fine
- Webhook: disabled
- Repository permissions: **Contents: Read & write** (Metadata: Read is implied)
- Where can it be installed: only on your account

Then:

- Note the **App slug** (`PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`) and the **Client ID**.
- Generate a **Client secret**.
- **Install the App on `darkness.litt-content` only** (not "All repositories").

### 2. Cloudflare Access (before the first deploy)

Configure this **before** deploying so the hostname is never reachable without Access in front of it.

Zero Trust → Access → Applications → Add an application → Self-hosted.

- Application domain: `admin.chenin.fr`
- Policy: **Allow**, include **Emails** = the owner email
- Session duration: browser session (expires when the browser closes)

Without Access, the Keystatic UI is only protected by GitHub OAuth. Do not skip this step, and do not deploy until it is in place.

### 3. Set Wrangler secrets

All commands below run from the **repo root**. Wrangler creates the Worker on the first `secret put` if it does not exist yet:

```bash
pnpm --dir admin install
pnpm --dir admin exec wrangler secret put KEYSTATIC_GITHUB_CLIENT_ID
pnpm --dir admin exec wrangler secret put KEYSTATIC_GITHUB_CLIENT_SECRET
pnpm --dir admin exec wrangler secret put KEYSTATIC_SECRET
```

Each command prompts for the value. `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` is **not** a secret: it is inlined at build time, so put it in `admin/.env` (or export it) before deploying:

```bash
echo 'PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=<app-slug>' >> admin/.env
```

### 4. Deploy

```bash
pnpm --dir admin run deploy
```

This runs `KEYSTATIC_STORAGE=github pnpm build && wrangler deploy` and publishes to `admin.chenin.fr/*` (zone `chenin.fr`).

The Worker binds Cloudflare KV as `SESSION` (Astro Cloudflare sessions). The namespace id is in `admin/wrangler.jsonc`. `KEYSTATIC_STORAGE` in that file is a runtime copy; the bundle reads the value inlined by this deploy command.

Do **not** run `wrangler deploy` directly (e.g. from a stale `dist/`): the build would not have `KEYSTATIC_STORAGE=github` set. Always use `pnpm --dir admin run deploy`.

## JPEG media (R2 Manager)

Article images are JPEG files stored in the R2 bucket `darkness-litt-media`. They are uploaded with the external R2 Manager at `https://media.chenin.fr` (behind Cloudflare Access), never through Keystatic or this Worker. The admin Worker has **no R2 binding**.

Originals are served publicly on the CDN hostname `https://cdn.chenin.fr` (custom domain on the bucket; do not enable the `r2.dev` URL). `media.chenin.fr` (manager UI) and `cdn.chenin.fr` (public originals) are two different hostnames.

Owner setup (outside this repo, once):

1. Deploy the R2 Manager Worker on `media.chenin.fr`, bound to the bucket `darkness-litt-media`, with a Cloudflare Access policy for the owner email.
2. Attach the custom domain `cdn.chenin.fr` to the bucket (Cloudflare dashboard → R2 → `darkness-litt-media` → Settings → Custom Domains).

Key convention: `<collection>/<filename>.jpg` with `<collection>` = `darkness` or `emileMoselly` and `<filename>` matching `[a-z0-9-]+` (e.g. `darkness/couverture-1.jpg`). Max 15 MiB per file. Do not delete or overwrite keys that live articles already use.

Editorial flow:

1. From the admin home page, open the médiathèque (`https://media.chenin.fr`) and upload the JPEG under the key above.
2. In Keystatic, edit a `Darkness (Markdoc)` or `Émile Moselly (Markdoc)` entry and insert the `Image` block (fill the R2 key, alt text, orientation, caption option). Or paste the tag directly into the `.mdoc` body:

   ```markdoc
   {% articleImage
      src="darkness/couverture-1.jpg"
      alt="…"
      orientation="none"
      hideCaption=false
   /%}
   ```

Warnings:

- Never reuse an existing `.md` filename when creating a Markdoc (`.mdoc`) entry on the same path: the `.md` and `.mdoc` collections share the same folder, so the two files would collide.
- A public build failure after saving often means a bad R2 key or an incomplete `{% articleImage %}` tag (the build fetches `cdn.chenin.fr` at compile time).

## OAuth gate (verify after deploy)

1. In a **private window**, `GET https://admin.chenin.fr/keystatic` → Cloudflare Access login page.
2. Log in with the owner email, then complete the GitHub authorization.
3. `/keystatic` renders and requests to `/api/keystatic/*` are **not 401**.

### If the OAuth callback returns 401

Retry **once**:

1. Add a `pnpm.patchedDependencies` patch in `admin/` (`pnpm patch` on the Keystatic Astro/core package that performs the GitHub token exchange) so the token exchange sends the **same `redirect_uri`** as the authorize redirect.
2. Re-deploy once with `pnpm --dir admin run deploy` and repeat the gate checks.

If it still fails, **stop**. Do not upgrade Astro (the app is pinned to Astro 5 / `@astrojs/cloudflare` 12).

## Content editing

Keystatic provides the `Darkness` and `Émile Moselly` literary collections, plus the `À propos`, `Blogroll`, `Mentions légales` and `Politique de confidentialité` prose pages.

- Literary and prose bodies use Keystatic's Markdoc editor and remain stored as `.md` files. After editing existing content, verify that images using `./_images/` paths still render; the serialized Markdown does not need to remain byte-identical.
- Saving in GitHub mode commits directly to `main` on `jfchenin/darkness.litt-content`. The content repository then dispatches the public-site update, which advances the content submodule and publishes the site.
- `Brouillon` defaults to disabled and remains visible in the editor. When enabled, the entry is excluded from the public site and `/og/` in production.
- Literary identity for editors: `Titre` = display text (does not rename the file); `Nom de fichier` = on-disk name (leave alone on existing entries); `Abbrlink` = public URL (when empty, the filename is used). `Aide fichier` only helps suggest the filename on create. A Keystatic save may add a `filename` frontmatter key; Zod accepts it and the site ignores it (URL stays `abbrlink || id`).
- New literary filenames and `abbrlink` values must match `^[a-z0-9-]+$`. Legacy files with spaces or accents are renamed to `<abbrlink>.md` with `pnpm exec tsx scripts/normalize-content-filenames.ts --collection darkness|emileMoselly --apply` (dry-run by default), then committed on content `main`. Do not rename files by hand inside Keystatic during the transition.
- The Cloudflare Git build command for the public site must remain `pnpm build`.
- Local mode reads and writes only under `admin/fixtures/`; fixture content is never published.
- The `Darkness (Markdoc)` and `Émile Moselly (Markdoc)` collections share the same paths as the `.md` collections (`darkness/*`, `emileMoselly/*`) but read and write `.mdoc` files with an `articleImage` block (`src` = R2 key). Local fixtures under `admin/fixtures/darkness/` and `admin/fixtures/emileMoselly/` can hold `.mdoc` entries.

## Local development

```bash
pnpm --dir admin install
pnpm --dir admin dev
```

With `KEYSTATIC_STORAGE` unset (or not `github`), Keystatic runs in local mode: no GitHub App, no secrets. The process cwd is `admin/`, and all collection paths live under `fixtures/` to avoid touching the content submodule.
