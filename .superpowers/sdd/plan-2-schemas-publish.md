# Plan 2 — Modèle de contenu et publication

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner creates and edits a text article in the admin, saves, and the public site shows it through the current chain. A draft save stays off the public site. After a title-only edit of an existing article, its `./_images/` images still render.

**Architecture:** Shared literary/prose contract at repo root (`shared/literary-fields.ts`) is imported by Astro `content.config.ts` and by Keystatic. Admin collections write Markdoc-edited bodies to `.md` files via `fields.markdoc({ extension: 'md' })` on `main` of `jfchenin/darkness.litt-content`. Publish stays the existing notify → submodule bump → Cloudflare Git `pnpm build` chain; Plan 2 only hardens the dispatch payload and aligns OG with the draft rule.

**Tech Stack:** Astro 5 content collections + zod, Keystatic 0.5 (`@keystatic/core` / `@keystatic/astro`), GitHub Actions (`actions/github-script`), `tsx --test` / `node:test`.

**Work from:** `/home/bap/dev/00_Projets_Pro/darkness.litt/.worktrees/feat-admin-access`

## Global Constraints

- Plan 1 in-repo work is done; this plan assumes the OAuth/Access gate on `admin.chenin.fr` already passes. No content save was required to finish Plan 1.
- Admin stays a separate Astro app under `admin/`. Root `pnpm build` stays the public build. Do not put `wrangler deploy` back into the npm `build` script.
- Content branch written by the admin: `main`. Site branch pushed by `update-content.yml`: `master`.
- Literary fields only: `title`, `author`, `published`, `description`, `updated`, `tags`, `draft`, `pin`, `toc`, `lang`, `abbrlink`. Author remains on both collections; public UI still shows it only for Darkness.
- New filenames and new `abbrlink` values match `^[a-z0-9-]*$`. **Do not** put that regex on the Keystatic slug field (existing filenames have spaces/accents and must stay editable). Put the pattern on `abbrlink` only (empty string allowed).
- Prose singletons, paths preserved: `about/A propos`, `blogroll/blogroll-fr`, `legalNotices/fr`, `privacyPolicy/fr`. Field: `lang` + Markdown body. `_templates` is not a collection. No image upload field.
- Body storage: Markdoc editor persisted as `.md` (`fields.markdoc({ label: 'Corps', extension: 'md' })`). After a title-only edit, existing `./_images/` paths must remain valid and their images must still render; byte-identical source is not required.
- Default for a new admin entry: `draft: false`. Draft field visible. Production lists, post routes, and `/og/` omit `draft: true`.
- Local Keystatic (`KEYSTATIC_STORAGE` ≠ `github`) must never write the submodule: collection/singleton paths use a `fixtures/` prefix when local. GitHub mode paths are repo-root relative in `darkness.litt-content`.
- The first save of À propos from the admin may rewrite frontmatter down to `lang`; body text must remain. That rewrite is accepted.
- Do not start Plan 3 in this plan.

---

### Task 1: Shared literary contract + test

**Files:**
- Create: `shared/literary-fields.ts`
- Create: `shared/literary-fields.test.ts`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Produces: `literaryFieldNames`, `abbrlinkPattern`, `defaultAuthor`, `proseEntries` (exact shapes below)
- Consumes: nothing

- [ ] **Step 1: Write the failing test**

```ts
// shared/literary-fields.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  abbrlinkPattern,
  defaultAuthor,
  literaryFieldNames,
  proseEntries,
} from './literary-fields.ts'

describe('literary-fields', () => {
  it('exports the literary field names in order', () => {
    assert.deepEqual([...literaryFieldNames], [
      'title',
      'author',
      'published',
      'description',
      'updated',
      'tags',
      'draft',
      'pin',
      'toc',
      'lang',
      'abbrlink',
    ])
  })

  it('accepts empty and kebab abbrlinks', () => {
    assert.equal(abbrlinkPattern.test(''), true)
    assert.equal(abbrlinkPattern.test('phase1-brouillon'), true)
    assert.equal(abbrlinkPattern.test('A Renoir'), false)
    assert.equal(abbrlinkPattern.test('a_renoir'), false)
  })

  it('keeps the default author and prose paths', () => {
    assert.equal(defaultAuthor, 'JFChenin')
    assert.deepEqual([...proseEntries], [
      { collection: 'about', path: 'about/A propos' },
      { collection: 'blogroll', path: 'blogroll/blogroll-fr' },
      { collection: 'legalNotices', path: 'legalNotices/fr' },
      { collection: 'privacyPolicy', path: 'privacyPolicy/fr' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx --test shared/literary-fields.test.ts`

Expected: FAIL (module not found / cannot resolve `./literary-fields.ts`)

- [ ] **Step 3: Write minimal implementation**

```ts
// shared/literary-fields.ts
export const literaryFieldNames = [
  'title',
  'author',
  'published',
  'description',
  'updated',
  'tags',
  'draft',
  'pin',
  'toc',
  'lang',
  'abbrlink',
] as const

export const abbrlinkPattern = /^[a-z0-9-]*$/

export const defaultAuthor = 'JFChenin'

export const proseEntries = [
  { collection: 'about', path: 'about/A propos' },
  { collection: 'blogroll', path: 'blogroll/blogroll-fr' },
  { collection: 'legalNotices', path: 'legalNotices/fr' },
  { collection: 'privacyPolicy', path: 'privacyPolicy/fr' },
] as const
```

- [ ] **Step 4: Wire the test into `pnpm test`**

In root `package.json`, append `shared/literary-fields.test.ts` to the existing `test` script list (keep the three current files).

- [ ] **Step 5: Run tests and make sure they pass**

Run: `pnpm test`

Expected: PASS, including the new file.

- [ ] **Step 6: Commit**

```bash
git add shared/literary-fields.ts shared/literary-fields.test.ts package.json
git commit -m "$(cat <<'EOF'
feat(content): add shared literary field contract

EOF
)"
```

---

### Task 2: Public zod schema uses the shared contract

**Files:**
- Modify: `src/content.config.ts`

**Interfaces:**
- Consumes: `abbrlinkPattern`, `defaultAuthor` from `shared/literary-fields.ts`
- Produces: same collection exports; zod defaults unchanged (`draft` false, `pin` 0–99, `toc` from `themeConfig.global.toc`, `lang` `'' | …allLocales`, empty or null `updated` → `undefined`)

- [ ] **Step 1: Import shared helpers and use them in `contentSchema`**

Replace the hard-coded default author and abbrlink regex with imports:

```ts
// src/content.config.ts
import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'
import { allLocales, themeConfig } from '@/config'
import { abbrlinkPattern, defaultAuthor } from '../shared/literary-fields'

const contentSchema = z.object({
  title: z.string(),
  author: z.string().optional().default(defaultAuthor),
  published: z.date(),
  description: z.string().optional().default(''),
  updated: z.preprocess(
    val => (val === '' || val === null ? undefined : val),
    z.date().optional(),
  ),
  tags: z.array(z.string()).optional().default([]),
  draft: z.boolean().optional().default(false),
  pin: z.number().int().min(0).max(99).optional().default(0),
  toc: z.boolean().optional().default(themeConfig.global.toc),
  lang: z.enum(['', ...allLocales]).optional().default(''),
  abbrlink: z.string().optional().default('').refine(
    abbrlink => !abbrlink || abbrlinkPattern.test(abbrlink),
    { message: 'Abbrlink ne peut contenir que des lettres minuscules, des chiffres et des traits d\'union.' },
  ),
})
```

Leave the six `defineCollection` blocks and `collections` export as they are (still `**/*.{md,mdx}` globs; Markdoc arrives in Plan 3).

- [ ] **Step 2: Typecheck the public app**

Run: `pnpm exec astro check`

Expected: PASS (no new errors from this file).

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "$(cat <<'EOF'
refactor(content): drive literary zod defaults from shared contract

EOF
)"
```

---

### Task 3: OG routes skip drafts in production

**Files:**
- Modify: `src/pages/og/[...image].ts`

**Interfaces:**
- Consumes: `post.data.draft` (same rule as `src/utils/posts.ts`: include when `import.meta.env.DEV || !data.draft`)
- Produces: `pages` map without draft entries on production builds

- [ ] **Step 1: Filter drafts when building `pages`**

In the `getRoute` async IIFE, after loading both collections, filter before `Object.fromEntries`:

```ts
const posts = [...darknessPosts, ...emileMosellyPosts].filter(
  ({ data }) => import.meta.env.DEV || !data.draft,
)
```

Keep the rest of `OGImageRoute` options unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/pages/og/[...image].ts
git commit -m "$(cat <<'EOF'
fix(og): omit draft posts from social image routes

EOF
)"
```

---

### Task 4: Harden content `notify-main.yml` (content repo)

**Files:**
- Modify (content repo): `src/content/.github/workflows/notify-main.yml`
- Commit lands on `main` of `jfchenin/darkness.litt-content` (submodule), **before** Keystatic saves depend on safe commit messages

**Interfaces:**
- Produces: `repository_dispatch` event type `content-updated` to `jfchenin/darkness.litt` with structured `client_payload` (`ref`, `sha`, `repository`, `pusher`, `commit_message`)
- Consumes: `secrets.MAIN_REPO_PAT`, `context.payload.head_commit.message` (no YAML string interpolation of the message)

- [ ] **Step 1: Replace peter-evans payload string with `actions/github-script`**

Replace the whole workflow body with:

```yaml
name: Notify Main Repository

on:
  push:
    branches:
      - main

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send repository dispatch event
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.MAIN_REPO_PAT }}
          script: |
            await github.rest.repos.createDispatchEvent({
              owner: 'jfchenin',
              repo: 'darkness.litt',
              event_type: 'content-updated',
              client_payload: {
                ref: context.ref,
                sha: context.sha,
                repository: context.payload.repository.full_name,
                pusher: context.actor,
                commit_message: context.payload.head_commit
                  ? context.payload.head_commit.message
                  : '',
              },
            })
```

- [ ] **Step 2: Commit and push on the content repo `main`**

From the worktree, with submodule initialized:

```bash
cd src/content
git status -sb
git add .github/workflows/notify-main.yml
git commit -m "$(cat <<'EOF'
fix(ci): pass commit message as structured dispatch payload

EOF
)"
git push origin main
cd ../..
```

Expected: workflow file on content `main`; this push itself should successfully dispatch `content-updated` (message has no quotes that break JSON, and the new script path is what future Keystatic messages need).

- [ ] **Step 3: Bump submodule pointer on the site branch (optional if Task 5’s chain will catch up)**

If `update-content.yml` already ran from Step 2, the site `master` submodule may already move. On this feature branch, either wait for that or:

```bash
git add src/content
git commit -m "$(cat <<'EOF'
chore: point content submodule at notify-main fix

EOF
)"
```

Do not force-push content `main`.

---

### Task 5: Correct `update-content.yml` summary wording

**Files:**
- Modify: `.github/workflows/update-content.yml`

**Interfaces:**
- Produces: summary text that says the Worker is published by the Git integration running `pnpm build` (not Cloudflare Pages)

- [ ] **Step 1: Fix the Summary step**

Replace the Summary `run` block with:

```yaml
      - name: Summary
        run: |
          echo "✅ Content submodule updated successfully"
          echo "🚀 Cloudflare Git integration publishes the Worker with pnpm build"
```

Leave checkout, submodule reset, and commit/push steps unchanged (still push `master`, still read `client_payload.*` from the environment).

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/update-content.yml
git commit -m "$(cat <<'EOF'
docs(ci): note Worker publish via pnpm build Git integration

EOF
)"
```

---

### Task 6: Keystatic literary collections + prose singletons

**Files:**
- Modify: `admin/keystatic.config.ts`
- Modify: `admin/README.md` (document collections, draft/abbrlink, fixtures paths, publish chain)
- Create as needed under `admin/fixtures/` (empty trees with `.gitkeep` for local mode: `darkness/`, `emileMoselly/`, `about/`, `blogroll/`, `legalNotices/`, `privacyPolicy/`)

**Interfaces:**
- Consumes: `abbrlinkPattern`, `defaultAuthor`, `proseEntries` from `../shared/literary-fields`
- Produces: collections `darkness`, `emileMoselly`; singletons keyed by `proseEntries[].collection`

- [ ] **Step 1: Implement Keystatic config**

Replace `admin/keystatic.config.ts` with a config that:

1. Keeps storage switching (`github` → repo `jfchenin/darkness.litt-content`, else `local`).
2. Sets `const pathPrefix = isGithubStorage ? '' : 'fixtures/'`.
3. Builds a shared literary schema helper (same fields for both collections):
   - `title`: `fields.slug({ name: { label: 'Titre', validation: { isRequired: true } }, slug: { label: 'Nom de fichier', description: 'URL publique = abbrlink si renseigné, sinon ce nom. Nouveaux fichiers: a-z 0-9 tirets uniquement.' } })` as `slugField: 'title'`. **No** `abbrlinkPattern` on the slug (existing names have spaces).
   - `author`: `fields.text({ label: 'Auteur', defaultValue: defaultAuthor })`
   - `published`: `fields.date({ label: 'Publié', validation: { isRequired: true } })`
   - `description`: `fields.text({ label: 'Description', multiline: true })`
   - `updated`: `fields.date({ label: 'Mis à jour' })` (optional)
   - `tags`: `fields.array(fields.text({ label: 'Tag' }), { label: 'Tags', itemLabel: props => props.value })`
   - `draft`: `fields.checkbox({ label: 'Brouillon', defaultValue: false, description: 'Invisible sur le site public et /og/ en production' })`
   - `pin`: `fields.integer({ label: 'Pin', defaultValue: 0, validation: { min: 0, max: 99 } })`
   - `toc`: `fields.checkbox({ label: 'Table des matières', defaultValue: true })`
   - `lang`: `fields.select({ label: 'Langue', options: [{ label: 'Universel', value: '' }, { label: 'fr', value: 'fr' }], defaultValue: '' })`
   - `abbrlink`: `fields.text({ label: 'Abbrlink', description: 'Slug public optionnel', validation: { pattern: { regex: abbrlinkPattern, message: 'a-z, 0-9 et tirets uniquement' } } })`
   - `content`: `fields.markdoc({ label: 'Corps', extension: 'md' })` with `format: { contentField: 'content' }`
4. Collections:
   - `darkness`: label `Darkness`, path `${pathPrefix}darkness/*`
   - `emileMoselly`: label `Émile Moselly`, path `${pathPrefix}emileMoselly/*`
5. Singletons from `proseEntries`: each `path: `${pathPrefix}${entry.path}``, schema `{ lang: same select, content: fields.markdoc({ label: 'Corps', extension: 'md' }) }`, `format: { contentField: 'content' }`. Labels in French matching the page.
6. No `_templates`. No image/file fields.

Import shape:

```ts
import { config, fields, collection, singleton } from '@keystatic/core'
import { abbrlinkPattern, defaultAuthor, proseEntries } from '../shared/literary-fields'
```

Ensure `admin` TypeScript/Vite can resolve `../shared/literary-fields` (plain relative import; no new alias required). If `astro check` in `admin/` fails on the root shared file, add `"../shared/**/*.ts"` to `admin/tsconfig.json` `include` only as needed.

- [ ] **Step 2: Fixtures skeleton for local mode**

Create empty dirs with `.gitkeep` under `admin/fixtures/` for each literary folder and each prose folder used above. Do not copy real articles into fixtures.

- [ ] **Step 3: Update `admin/README.md`**

Add a short section: collections/singletons available; save commits `main` on the content repo; draft behaviour; Cloudflare Git build command must be `pnpm build`; local mode writes `admin/fixtures/` only.

- [ ] **Step 4: Local smoke**

Run: `pnpm --dir admin exec astro check` (or `pnpm --dir admin run build` if check is not scripted)

Expected: PASS. Optional: `pnpm --dir admin dev` and open `/keystatic` — collections visible, no crash.

- [ ] **Step 5: Commit**

```bash
git add admin/keystatic.config.ts admin/README.md admin/fixtures admin/tsconfig.json
git commit -m "$(cat <<'EOF'
feat(admin): add literary and prose Keystatic schemas

EOF
)"
```

---

### Task 7: Owner dashboard check + manual publish checklist

**Files:** none in repo (verification only). Update `.superpowers/sdd/progress.md` when done.

**Prerequisite:** Cloudflare Access + GitHub OAuth gate from Plan 1 already green.

- [ ] **Step 1: Confirm Cloudflare Git integration build command**

In the Cloudflare dashboard for Worker `darkness-litt`, the Git build/deploy command must be exactly `pnpm build` (not `pnpm deploy`, not a script that embeds `wrangler deploy`). If wrong, change the **platform** command only.

- [ ] **Step 2: Draft article path**

In `https://admin.chenin.fr/keystatic`, create Darkness entry:

- filename / slug: `phase1-brouillon` (or title name free, slug `phase1-brouillon`)
- `abbrlink`: `phase1-brouillon`
- `draft`: true
- short Markdown body, no images

Save (**Enregistrer**). Confirm:

1. Commit on content `main`
2. `notify-main.yml` succeeds
3. `update-content.yml` pushes site `master`
4. Worker build runs with `pnpm build`
5. After deploy: `/darkness/phase1-brouillon/` is absent and `/og/phase1-brouillon.png` is absent

- [ ] **Step 3: Publish the same article**

Set `draft: false`, save again. After the chain: page and OG image respond.

- [ ] **Step 4: Title-only edit on an existing article**

Edit one existing Darkness article’s `title` only, save. Confirm every image using a `./_images/` path still renders on the public page after deployment. Source rewriting is acceptable as long as the paths remain valid.

- [ ] **Step 5: À propos**

Open the À propos singleton, save. Frontmatter may shrink to `lang`; body still on `/about/` after deploy.

- [ ] **Step 6: Cleanup**

Delete the test article in Keystatic (text delete allowed). Record results in `.superpowers/sdd/progress.md`.

**Done when:** Steps 1–5 pass. Plan 3 starts only after a text article saved in the admin is live on `darkness.chenin.fr`.

---

## Self-review (author)

1. **Spec coverage:** Shared contract, Keystatic literary + prose, OG draft filter, notify structured payload, update-content wording, Cloudflare `pnpm build` check, draft/publish/manual image-render and À propos checks — all mapped to tasks. R2 / custom image component / feed changes remain in Plan 3.
2. **Placeholders:** None intentional; owner dashboard step is verification, not TBD code.
3. **Type consistency:** `abbrlinkPattern`, `defaultAuthor`, `proseEntries` names match Task 1 → Tasks 2 and 6. Event type remains `content-updated`. Payload keys remain those already read by `update-content.yml`.
