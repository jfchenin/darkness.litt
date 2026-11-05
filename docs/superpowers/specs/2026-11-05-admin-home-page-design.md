# Admin home page redesign

Date: 2026-11-05  
Scope: `admin.chenin.fr/` landing page only

## Goal

Make the admin home page clearer and closer to the public darkness.litt look, while keeping two primary actions: open Keystatic and open the médiathèque.

## Approach

Self-contained page in `admin/src/pages/index.astro`. Echo the public site palette and typefaces without importing the public UnoCSS theme or layout.

## Structure

Centered single composition, max width ~36rem:

1. Brand title: **Darkness**
2. One short support line: administration du site
3. Two primary actions, equal weight:
   - **Keystatic** → `/keystatic` (éditer le contenu)
   - **Médiathèque** → `https://media.chenin.fr` (téléverser les JPEG), `target="_blank"` `rel="noopener"`
4. Two quiet notes:
   - rester sur la branche `main`
   - Enregistrer écrit dans `jfchenin/darkness.litt-content`

No cards, stats, or third action.

## Look

- Colors from the public light theme (`oklch`):
  - background `96% 0.005 298`
  - primary `25% 0.005 298`
  - secondary `40% 0.005 298`
- Dark mode via `prefers-color-scheme` with the matching public dark tokens
- Fonts: Bricolage Grotesque for the brand title, Inter for body and actions
- Fonts installed as `@fontsource-variable` packages in `admin/`, not loaded from the public Worker
- Light hover on action links only

## Out of scope

- Keystatic editor UI
- R2 Manager / `media.chenin.fr` itself
- Public site layout or theme package sharing
- Admin Worker config beyond what the page needs

## Files

- Rewrite `admin/src/pages/index.astro`
- Add font packages to `admin/package.json` if missing
- No content submodule changes
