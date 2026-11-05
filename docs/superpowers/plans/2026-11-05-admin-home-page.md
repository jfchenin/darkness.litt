# Admin Home Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `admin.chenin.fr/` so it matches darkness.litt’s look and clearly offers Keystatic plus the médiathèque.

**Architecture:** Keep a self-contained Astro page in the admin app. Copy the public oklch palette and load the same variable font packages locally in `admin/`. Do not import the public site’s UnoCSS theme or layout.

**Tech Stack:** Astro 5, `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/inter`, inline CSS in `admin/src/pages/index.astro`

## Global Constraints

- Scope is only the admin landing page and its font deps in `admin/`
- Brand title must be `Darkness` (hero-level)
- Actions: Keystatic → `/keystatic`; Médiathèque → `https://media.chenin.fr` with `target="_blank"` and `rel="noopener"`
- French copy only
- No cards, stats, or third action
- No content submodule changes
- Light colors: background `oklch(96% 0.005 298)`, primary `oklch(25% 0.005 298)`, secondary `oklch(40% 0.005 298)`
- Dark colors (`prefers-color-scheme: dark`): background `oklch(22% 0.005 298)`, primary `oklch(92% 0.005 298)`, secondary `oklch(77% 0.005 298)`

## File map

| File | Responsibility |
| --- | --- |
| `admin/package.json` | Declare font packages |
| `admin/src/pages/index.astro` | Full landing page markup + styles |

---

### Task 1: Install fonts and rewrite the admin home page

**Files:**
- Modify: `admin/package.json`
- Modify: `admin/src/pages/index.astro`
- Test: visual check via `pnpm --dir admin run build` and open `/` in local admin (or inspect built HTML)

**Interfaces:**
- Consumes: none
- Produces: landing page at `/` with two action links and site-matched colors/fonts

- [ ] **Step 1: Add the font packages to the admin app**

From the repo root:

```bash
pnpm --dir admin add @fontsource-variable/bricolage-grotesque@^5.3.0 @fontsource-variable/inter@^5.3.0
```

Expected: both packages appear under `admin/package.json` → `dependencies`, and `admin/pnpm-lock.yaml` updates if present (or the workspace lockfile).

- [ ] **Step 2: Rewrite `admin/src/pages/index.astro`**

Replace the full file with:

```astro
---
// admin/src/pages/index.astro
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter'
---
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Administration — Darkness</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: oklch(96% 0.005 298);
        --fg: oklch(25% 0.005 298);
        --muted: oklch(40% 0.005 298);
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: oklch(22% 0.005 298);
          --fg: oklch(92% 0.005 298);
          --muted: oklch(77% 0.005 298);
        }
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: var(--bg);
        color: var(--fg);
        font-family: 'Inter Variable', Inter, system-ui, sans-serif;
        line-height: 1.5;
      }
      main {
        width: min(100%, 36rem);
      }
      .brand {
        margin: 0 0 0.35rem;
        font-family: 'Bricolage Grotesque Variable', BricolageGrotesque, system-ui, sans-serif;
        font-size: clamp(2.5rem, 8vw, 3.5rem);
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.05;
      }
      .lede {
        margin: 0 0 2rem;
        color: var(--muted);
        font-size: 1.05rem;
      }
      .actions {
        display: grid;
        gap: 1rem;
        margin: 0 0 2rem;
        padding: 0;
        list-style: none;
      }
      .actions a {
        color: var(--fg);
        font-size: 1.2rem;
        font-weight: 600;
        text-decoration: underline;
        text-decoration-thickness: 0.08em;
        text-underline-offset: 0.18em;
        text-decoration-color: color-mix(in oklch, var(--fg) 25%, transparent);
        transition: text-decoration-color 0.2s ease, color 0.2s ease;
      }
      .actions a:hover,
      .actions a:focus-visible {
        text-decoration-color: var(--fg);
      }
      .actions span {
        display: block;
        margin-top: 0.25rem;
        color: var(--muted);
        font-size: 0.95rem;
        font-weight: 400;
      }
      .notes {
        margin: 0;
        padding: 0;
        list-style: none;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .notes li + li {
        margin-top: 0.5rem;
      }
      code {
        font-size: 0.9em;
      }
    </style>
  </head>
  <body>
    <main>
      <h1 class="brand">Darkness</h1>
      <p class="lede">Administration du site</p>
      <ul class="actions">
        <li>
          <a href="/keystatic">Keystatic</a>
          <span>Éditer le contenu</span>
        </li>
        <li>
          <a href="https://media.chenin.fr" target="_blank" rel="noopener">Médiathèque</a>
          <span>Téléverser les JPEG</span>
        </li>
      </ul>
      <ul class="notes">
        <li>Restez sur la branche <code>main</code>.</li>
        <li>
          Le bouton <strong>Enregistrer</strong> écrit dans
          <code>jfchenin/darkness.litt-content</code>.
        </li>
      </ul>
    </main>
  </body>
</html>
```

- [ ] **Step 3: Verify the page builds**

```bash
pnpm --dir admin run build
```

Expected: build succeeds. In the built HTML for `/` (under `admin/dist/` or the Cloudflare adapter output), confirm:
- `Darkness` appears as the `h1`
- `/keystatic` link exists
- `https://media.chenin.fr` link exists with `target="_blank"` and `rel="noopener"`
- font CSS or font files are referenced in the build output

Optional local check:

```bash
pnpm --dir admin run dev
```

Open `http://localhost:4321/` (or the printed port). Confirm brand-first layout, two actions, notes, light/dark via OS theme.

- [ ] **Step 4: Commit**

```bash
git add admin/package.json admin/pnpm-lock.yaml admin/src/pages/index.astro
# If the lockfile lives at the repo root instead:
# git add package.json pnpm-lock.yaml admin/package.json admin/src/pages/index.astro

git commit -m "$(cat <<'EOF'
feat(admin): redesign the home page around Keystatic and the médiathèque

EOF
)"
```

Do not push unless the user asks.
