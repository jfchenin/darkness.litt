# Tech Debt Audit — darkness.litt

Generated: 2026-10-10

First run. No previous `TECH_DEBT_AUDIT.md` was on disk (an untracked path showed up in the session snapshot and was already gone).

Scope: application code under `src/`, `scripts/`, Astro/Wrangler config, and CI. Content bodies in the `src/content` submodule were sampled for filenames and frontmatter, not edited. About 7,900 lines of site code. Not large enough to split across subagents.

Tooling actually run: `pnpm audit`, `npx knip`, `npx depcheck`, `npx madge --circular`, `tsc` was not run (`astro check` is coupled to `pnpm build`, which also deploys). `depcheck` does not parse `.astro` imports; its "unused" list for fontsource, Waline, Twikoo, KaTeX, Mermaid, and lite-youtube-embed is wrong and is not treated as findings.

## Executive summary

- 1 Critical, 10 High, 22 Medium, 13 Low. 46 findings.
- The dangerous code is the live edge: an unauthenticated Brevo webhook, a Botpoison check that accepts a public bypass string, and a GitHub Actions script that interpolates a commit message into a shell script holding `MAIN_REPO_PAT`.
- `pnpm build` ends in `wrangler deploy`. `pnpm update-theme` merges upstream with `--allow-unrelated-histories`. Either command can wreck production or the fork.
- Every non-article page advertises the Retypeset demo as its social image, and the meta description is the three characters `...`.
- There is no test file, no test script, and the pre-commit hook prints a skip message. Playwright is installed and unused.
- Architectural debt is a copied pair, not a god file. `src/utils/darkness.ts` and `src/utils/emileMoselly.ts` are the same module twice. Slug pages, collection indexes, and the four prose pages are copies of that split. Largest source file is `ContactForm.astro` at 321 lines. `madge` found no cycles.
- Six months of git history is submodule pointer bumps. Application churn is the contact/newsletter era (`contact.ts`, `formspark-webhook.ts`, `ContactForm.astro`, `newsletter.astro`, `unsubcribe.astro`). That is where the debt sits.
- `pnpm audit` reports 2 critical / 83 high. That is one Astro advisory counted on two paths, plus a pile of eslint, wrangler, and miniflare transitive issues. Do not treat the count as 83 site bugs. The advisory that touches this site's image pipeline is called out as F010.
- The admin/R2 note in `docs/superpowers/specs/2026-10-10-admin-contenu-r2-design.md` will sit on this duplicated collection layer and on a remark pipeline the note wants to replace with Markdoc. Fix the twin modules before that work copies them a third time.

## Architectural mental model

darkness.litt is a French, single-locale fork of the Retypeset Astro theme, deployed as a Cloudflare Worker (`wrangler.jsonc` route `darkness.chenin.fr/*`, adapter `@astrojs/cloudflare` with `imageService: 'compile'`). Pages are static. Two routes are not: `POST /api/contact/` verifies Botpoison and forwards to Formspark, and `POST /api/formspark-webhook/` is supposed to receive that submission and, on newsletter consent, create a Brevo contact.

Texts live in a git submodule, `src/content` → `jfchenin/darkness.litt-content`, gitignored in the parent. Collections are `darkness`, `emileMoselly`, `about`, `blogroll`, `legalNotices`, `privacyPolicy` (`src/content.config.ts`). A push to the content repo's `main` is meant to fire `repository_dispatch` `content-updated`, which `.github/workflows/update-content.yml` turns into a submodule pointer commit on `master`. `pnpm build` then typechecks, builds, post-processes LQIP by re-serializing `dist/**/*.html`, and deploys.

The theme's i18n router is still the page tree (`src/pages/[...lang]/`, `src/i18n/*`). `moreLocales` is empty, so the language switcher is hidden, but every page still computes locales, supported languages, and localized paths. README says i18n was removed. It was reduced to one language, not removed.

Comments, KaTeX, Mermaid, Partytown, Giscus, Twikoo, and Waline are still wired. Comments are off in config. Waline's server URL still points at the upstream demo.

This matches the README's "fork of Retypeset on Cloudflare" claim and contradicts its "i18n removed" and "secure contact form" claims. Those contradictions are findings F026 and F002.

## Findings

| ID | Category | File:Line | Severity | Effort | Description | Recommendation |
|----|----------|-----------|----------|--------|-------------|----------------|
| F001 | Security hygiene | src/pages/api/formspark-webhook.ts:38 | Critical | S | `POST` parses any JSON body and, when `newsletterConsent` is true/`"true"`/`"on"`, creates or updates a Brevo contact with `BREVO_API_KEY`. No shared secret, no Formspark signature, no origin check. The path is guessable. A caller can enroll arbitrary addresses in the newsletter list. Error bodies from Brevo are returned to that caller (`formspark-webhook.ts:143`). | Require a header secret compared in constant time to `FORMSPARK_WEBHOOK_SECRET`. Reject missing or mismatched secrets with 401 and a generic body. Do not echo `errorText`. |
| F002 | Security hygiene | src/pages/api/contact.ts:54 | High | S | The string `SERVICE_UNAVAILABLE` skips Botpoison. The client sets that string on any challenge failure, including a missing public key (`ContactForm.astro:272`). An attacker sends the same string. The honeypot field checked at `contact.ts:32` is not in the form HTML, so it never trips for a normal submit. | Delete the magic string on both sides. If Botpoison is down, return 503 and do not forward to Formspark. Add the honeypot input only if you still want it; a check with no field is not a control. |
| F003 | Security hygiene | src/pages/api/contact.ts:106 | High | S | When the verify `fetch` throws, the handler logs and continues into the Formspark submit. Verification errors fail open. The 403 branch also returns `botpoisonData.message` to the client (`contact.ts:95`). The outer catch returns `error.message` (`contact.ts:183`). | On verify failure or exception, return 403/503 with a fixed French sentence. Log the cause server-side only. |
| F004 | Security hygiene | .github/workflows/update-content.yml:49 | High | S | `client_payload.commit_message`, `repository`, `sha`, and `pusher` are interpolated into a `run:` script. Actions inserts that text before the shell runs. A commit message containing `EOF` or a newline plus shell breaks out of the heredoc and runs as the job that holds `MAIN_REPO_PAT` (`update-content.yml:15`). Write access to the content repo becomes code execution in the site repo. | Pass payload fields through `env:`. Use a quoted heredoc delimiter (`<<'EOF'` is wrong for env expansion; write the file from `"$COMMIT_MESSAGE"`). Do not paste `${{ }}` into `run:`. |
| F005 | Security hygiene | src/layouts/Head.astro:46 | High | S | If `apiflashKey` is empty (it is, `src/config.ts:179`), every page without `postSlug` sets `og:image` to `api.apiflash.com` with access key `02a837b6188f4ba0a7fd9fbeff03a83e` and URL `https://retypeset.radishzz.cc/...`. Home, about, contact, tags, and legal pages share a screenshot of the upstream demo. The key is in the HTML. | Delete the fallback URL. Point `og:image` at a static file in `public/` or at the local OG route. |
| F006 | Documentation drift | src/i18n/ui.ts:27 | High | S | `i18nTitle` is true (`src/config.ts:13`), so `Head.astro:37` uses `ui.fr.description`, which is `'...'`. The real sentence in `src/config.ts:11` is dead. Home-page meta description is three dots. | Set `ui.fr.description` to the config sentence, or stop reading the description from `ui` when you only have one locale. |
| F007 | Dependency & config debt | package.json:9 | High | S | `build` is `astro check && astro build && pnpm apply-lqip && wrangler deploy`. A local build, a docs rebuild, or a CI build publishes the Worker. There is no separate `deploy` script and no workflow that typechecks without deploying. | `build` stops after LQIP. `deploy` is `pnpm build && wrangler deploy`. Point Cloudflare's build command at `pnpm build` only if the platform deploys the artifact itself; do not also call wrangler. |
| F008 | Dependency & config debt | scripts/update-theme.ts:24 | High | S | `pnpm update-theme` adds the Retypeset remote if missing and runs `git merge upstream/master --allow-unrelated-histories`. One invocation can merge the original theme back over the fork, including the contact API. | Delete the script and the npm script. Upstream sync, if it ever happens again, is a manual diff, not a merge. |
| F009 | Test debt | package.json:7 | High | M | No `*.test.*` / `*.spec.*` files, no `test` script. Playwright 1.58 is a devDependency and is never configured. The only dynamic trust boundary (F001–F003) has no test that a forged body is rejected. `astro check` runs only inside the deploy command (F007). | Add a Worker-level test for `/api/contact/` and `/api/formspark-webhook/` that asserts 401/403 on missing secret, magic bypass string, and verify failure. Remove Playwright until a browser test exists. |
| F010 | Dependency & config debt | package.json:30 | High | L | Installed `astro@5.17.1` and `sharp@0.34.5`. `pnpm audit` flags GHSA-26w7-cxv4-gfx2 (Astro AVIF/libheif RCE, stated range `<7.2.8`) on both `astro` and `astro-compress`, which is why the metadata counter says 2 critical. It also flags sharp libvips/libheif issues fixed in `sharp >=0.35.5`. This site optimizes author images at build time (`astro.config.ts:150`, `imageService: 'compile'`), not via a public image endpoint. Exposure is "malicious AVIF in the content repo or a future admin upload", not an anonymous HTTP RCE today. Most other highs are eslint, wrangler, and miniflare. | Confirm the GHSA range actually includes 5.17 before a major upgrade. Bump sharp on the 0.34 line if a backport exists; do not jump to Astro 7 only to silence the counter. Dependabot ignores semver-major (`.github/dependabot.yml:21`), so it will never open that upgrade. |
| F011 | Architectural decay | src/utils/darkness.ts:16 | High | M | `src/utils/emileMoselly.ts` is the same 238-line module with the collection name swapped: reading-time cache, draft filter, pin sort, year group, tag maps, slug duplication. `getPosts`, `getRegularPosts`, `getPostsGroupByTags`, and `getTagSupportedLangs` are exported and unused outside the file (knip). Call sites import both modules and zip the results (`src/pages/[...lang]/index.astro:6`, `src/utils/tags.ts:4`). The admin spec adds Keystatic on top of this split. | One `getPosts(collection, lang)` parameterized by `'darkness' \| 'emileMoselly'`. Keep thin wrappers only where the names are part of a page. Stop exporting the functions that have no callers. |
| F012 | Architectural decay | src/pages/[...lang]/darkness/[slug].astro:17 | Medium | M | `emile-moselly/[slug].astro` repeats the same `getStaticPaths` slug/lang map (lines 17–69). The only content difference is `PostAuthor`, present on Darkness (`darkness/[slug].astro:112`) and absent on Moselly. | One slug route, or one shared path builder. Pass the collection in. |
| F013 | Architectural decay | src/pages/[...lang]/darkness/index.astro:7 | Medium | S | `emile-moselly/index.astro` is the same pinned-plus-by-year list. Home (`index.astro:31`) merges the two maps and sorts again. Collection pages never render the year they grouped by (`darkness/index.astro:30` binds `_year`). | One listing component. Decide whether the year is a heading; if it is not, stop grouping. |
| F014 | Architectural decay | src/pages/[...lang]/about.astro:6 | Medium | S | `about.astro`, `blogroll.astro`, `mentions-legales.astro`, and `politique-de-confidentialite.astro` are the same "find entry by lang, else universal, render" page. `blogroll.astro:14` still says "Get about page content" and names the variables `allAboutEntries` / `aboutEntry` while calling `getCollection('blogroll')`. | One `ProsePage.astro` that takes the collection name. |
| F015 | Architectural decay | src/pages/[...lang]/_darkness-tags/[tag].astro:1 | Medium | S | Astro does not route files under a `_` directory. `_darkness-tags/` and `_emile-moselly-tags/` (four files) never become URLs. knip reports them unused. Live tags are `src/pages/[...lang]/tags/`. `src/utils/page.ts:49` still matches `darkness-tags` and `emile-moselly-tags`, which nothing links to. | Delete the four files and `isDarknessTagPage` / `isEmileMosellyTagPage`. |
| F016 | Consistency rot | src/utils/page.ts:69 | Medium | S | `isLegalNoticesPage` matches the segment `legalNotices`. `isPrivacyPolicyPage` matches `privacyPolicy`. The routes are `/mentions-legales/` and `/politique-de-confidentialite/` (`src/config.ts:207`). knip: those helpers are exported and unused. `getPageInfo` still computes them, and `Navbar.astro` does not read them, so legal pages cannot highlight even if you wire the flags up later. | Match the real segments or delete the helpers. |
| F017 | Consistency rot | scripts/new-post.ts:17 | Medium | S | `pnpm new-post` writes `src/content/posts/<title>.md`. There is no `posts` collection. Collections are `darkness` and `emileMoselly`, and `src/content` is a submodule. The script also omits `author`, which the schema has. | Delete it, or take a collection argument and write into the submodule. |
| F018 | Dependency & config debt | package.json:18 | Medium | S | `check-env` and `test-botpoison` point at `scripts/check-env.cjs` and `scripts/test-botpoison.cjs`. Those files are not in `scripts/` (only `apply-lqip.ts`, `format-posts.ts`, `new-post.ts`, `update-theme.ts`). | Remove the scripts, or add the files. A `check-env` that actually verified `BOTPOISON_SECRET_KEY`, `BREVO_API_KEY`, and the webhook secret would earn its place. |
| F019 | Dependency & config debt | package.json:90 | Medium | S | `pre-commit` is `echo 'Skipping lint-staged due to ESLint jsdoc plugin issue'`. `lint-staged` is configured and knip reports it unused. Nothing runs eslint on commit. The only workflow is the content-pointer job, so PRs are not linted or typechecked either. | Fix the jsdoc plugin or drop that rule, then run `lint-staged`. Add a workflow that runs `pnpm lint` and `astro check` without `wrangler deploy`. |
| F020 | Type & contract debt | src/env.d.ts:4 | Medium | S | `ImportMetaEnv` declares `PUBLIC_BOTPOISON_PUBLIC_KEY` and `BOTPOISON_SECRET_KEY` only. `PUBLIC_FORMSPARK_FORM_ID` (`contact.ts:113`), `BREVO_API_KEY` (`formspark-webhook.ts:77`), and `BREVO_LIST_ID` (`formspark-webhook.ts:93`) are untyped. A rename does not fail the build. The Formspark value is a URL stored under a `PUBLIC_` name, which Astro treats as client-safe. | Declare the three secrets without the `PUBLIC_` prefix. Move the Formspark action URL to `FORMSPARK_FORM_URL`. |
| F021 | Error handling & observability | src/pages/api/contact.ts:183 | Medium | S | Contact and webhook JSON errors include `details` from Botpoison, Formspark, Brevo, or `Error.message` (`contact.ts:95`, `contact.ts:157`, `formspark-webhook.ts:143`, `formspark-webhook.ts:171`). Callers learn upstream status text. `ContactForm.astro:300` then discards that and shows a generic sentence, so the leak buys the UI nothing. | Fixed messages in the response. Keep the upstream body in `console.error` only. Wrangler observability is already on (`wrangler.jsonc:14`); the logs are unstructured `console.*`. |
| F022 | Security hygiene | src/pages/api/contact.ts:43 | Medium | S | Required-field checks are presence only. Email format is validated in the browser (`ContactForm.astro:165`) and not on the Worker. The webhook forwards `formData.email` to Brevo as-is (`formspark-webhook.ts:99`). | Reject addresses that fail a small server-side check before Formspark or Brevo. |
| F023 | Security hygiene | src/pages/api/contact.ts:27 | Medium | M | Neither API route rate-limits. Combined with F002, a client can post as fast as the Worker allows, into the inbox and into Brevo. | A Cloudflare rate-limit rule on `/api/*`, or a short-lived KV counter keyed by IP. Do this after F001 and F002, not instead of them. |
| F024 | Consistency rot | src/config.ts:25 | Medium | S | `faviconPng` is `/icons/favicons/favicon.png`, which is not in `public/icons/favicons/` (svg, ico, 96x96, apple touch, and the two maskable PNGs are). `webManifest` is `icons/favicons/manifest.webmanifest` with no leading slash (`src/config.ts:28`). The file on disk is `site.webmanifest`. `Head.astro:69` emits `href={`${base}${webManifest}`}`, so nested pages request `.../mentions-legales/icons/favicons/manifest.webmanifest`. | Point `webManifest` at `/icons/favicons/site.webmanifest`. Remove the png link or add the file. |
| F025 | Consistency rot | src/pages/unsubcribe.astro:1 | Medium | S | The route is `/unsubcribe/`. `newsletter.astro:7` and `unsubcribe.astro:7` still say "Page Not Found", copied from `404.astro`, and both keep an empty `<div class="" />` (`unsubcribe.astro:17`, `newsletter.astro:18`). `assets/docs/todo.md:2` still lists "unsubscribe page" as unfinished. | Rename to `unsubscribe.astro` only after checking the URL Brevo already sends. Delete the empty div and the 404 comment. |
| F026 | Documentation drift | README.md:23 | Medium | S | README and `assets/docs/README.fr.md:22` say i18n support was removed. `src/i18n/` and `[...lang]` are the router. Line 33 calls the contact API "secure"; F002 and F003 say otherwise. Getting started (`README.md:53`) never runs `git submodule update --init`. `pnpm dev` (`package.json:8`) does not either. `pnpm build` does. `.gitignore:7` ignores `src/content/`, so a clone without the submodule looks empty and git will not show content edits. Lighthouse image alt text still says Retypeset (`README.md:43`). "Last update: 8th January 2026" is stale relative to the October admin note. | Document the submodule in the dev steps. Rewrite the i18n and "secure form" bullets so they match the code. |
| F027 | Documentation drift | .github/workflows/update-content.yml:64 | Medium | S | The job summary says Cloudflare Pages will deploy. The site is a Worker (`wrangler.jsonc:2`, `@astrojs/cloudflare`). The comment in the same file is what a future editor will trust. | Say Worker, and say which command deploys, once F007 splits build from deploy. |
| F028 | Documentation drift | package.json:2 | Low | S | `"name": "astro-theme-retypeset"` and `"repository"` still point at `radishzzz/astro-theme-retypeset`. The fork's identity is only in the README. | Set name and repository to this repo. |
| F029 | Security hygiene | src/config.ts:128 | Medium | S | `comment.enabled` is false, but `waline.serverURL` is `https://retypeset-comment.radishzz.cc`. `Comment/Index.astro:23` shows Waline whenever comments are on and that URL is non-empty. Flipping `enabled` to true posts comments to the upstream demo server. Giscus and Twikoo locale maps in `src/i18n/config.ts:10` exist for the same off switch. | Clear `serverURL` until a server you run is configured. |
| F030 | Performance & resource hygiene | astro.config.ts:83 | Medium | M | `rehype-katex` and `rehype-mermaid` always run. `themeConfig.global.katex` is false, and that flag only gates the CSS (`Head.astro:81`). No content file contains `mermaid` or `$$`. `Layout.astro:15` always imports `comment.css`. `Layout.astro:61` always mounts `SoundEffect`, `GithubCard`, `MediaEmbed`, and `ImageZoom`. `SoundEffect.astro:15` still listens for `#language-switcher` (hidden, `Button.astro:21`) and for Twikoo/Waline inputs that are not rendered. Partytown is registered (`astro.config.ts:58`) with analytics IDs empty, and `robots.txt.ts:10` disallows `/~partytown/`. Mermaid pulls a high lodash advisory into the tree for diagrams this site does not use. | Drop KaTeX and Mermaid from the pipeline until a post needs them. Stop importing comment CSS and comment clients while `enabled` is false. Leave ImageZoom; posts use images. |
| F031 | Consistency rot | src/pages/[...lang]/darkness/[slug].astro:87 | Medium | S | Public URLs use `abbrlink` when set (`darkness/[slug].astro:79`, and `key west.md` has `abbrlink: key-west`). `postSlug` passed to `Head` is `post.id`, the filename. `src/pages/og/[...image].ts:25` keys images the same way. Filenames include spaces, commas, accents, apostrophes, and parentheses (`Nous voilà rencontrés, la terre et nous....md`, `(re)composition - journal 2007-2022.md`). `new URL` percent-encodes the meta tag; the static path has to survive that encoding. Feeds already use `abbrlink \|\| id` (`src/utils/feed.ts:176`). OG does not. | Key the OG route with the same slug as the article. |
| F032 | Consistency rot | src/utils/feed.ts:181 | Medium | M | The site renders posts through Astro's remark/rehype pipeline (directives, heading anchors, image processor, external links). The feed renders the raw body with a second `MarkdownIt` plus `sanitize-html`. Container directives, admonitions, and the image component the admin spec wants will not match the page. `feed.ts:83` still comments `src/content/posts/_images`. Feed author is always `themeConfig.site.author` (`feed.ts:206`), while posts set `author: JFC` and the schema defaults to `JFChenin`. | Run the same rendered HTML the page uses, or accept that the feed is a lossy excerpt and stop pretending it is the post. Use `post.data.author`. |
| F033 | Performance & resource hygiene | src/utils/darkness.ts:26 | Low | M | `addMetaToPost` calls `render(post)` for every post to read `minutes`, then the slug page calls `render(post)` again (`darkness/[slug].astro:81`). `memoize` (`src/utils/cache.ts:7`) caches the enhanced post, not the render. Fine at ~30 posts. It becomes a double render of every body when the admin flow rebuilds on each save. | Cache minutes in the same render the page already does, or accept the cost until builds get slow. Not worth a cache layer today. |
| F034 | Type & contract debt | src/utils/cache.ts:7 | Low | S | `memoize<Args extends any[]>`. `ContactForm.astro:256` builds `Record<string, any>`. `Twikoo.astro:45` declares `twikoo: any`. `MediaEmbed.astro:13` needs `@ts-expect-error` for lite-youtube-embed. These are the only `any` / expect-error sites. Plugins under `src/plugins/*.mjs` are untyped; that matches upstream and is not worth a migration by itself. | Type the form payload as `ContactFormData` (already defined on the server). Leave the plugin files. |
| F035 | Consistency rot | src/utils/darkness.ts:149 | Low | S | Within a year, posts sort by month and day only, so two posts on the same date trade their time order. Home then sorts by full timestamp (`index.astro:52`). Collection pages keep the weaker sort. `getTagSupportedLangs` (`darkness.ts:226`) drops drafts even in dev, unlike `_getPosts`. | Sort with `published.getTime()` everywhere. One draft predicate. |
| F036 | Consistency rot | src/types/index.d.ts:10 | Low | S | The type is `emileMoselyPost` (one l). The collection id is `emileMoselly`. The misspelling is the name every merged list uses (`index.astro:1`). | Rename the type. One mechanical edit. |
| F037 | Security hygiene | src/pages/api/formspark-webhook.ts:92 | Low | S | Comment says the list id defaults to 2. The code defaults to 6. A non-numeric `BREVO_LIST_ID` becomes `NaN` and is sent as `listIds: [NaN]`. | One constant. `Number.isFinite` or 400. |
| F038 | Dependency & config debt | package.json:61 | Low | S | knip reports `@unocss/reset` and `lint-staged` unused. Reset is unused because `injectReset: true` (`astro.config.ts:55`) pulls UnoCSS's own reset. `lint-staged` is unused because of F019. | Remove `@unocss/reset` after a one-page visual check. Keep `lint-staged` only if F019 turns the hook back on. |
| F039 | Performance & resource hygiene | scripts/apply-lqip.ts:167 | Medium | M | The deploy path rewrites `src/assets/lqip-map.json` inside the repo and re-parses every `dist/**/*.html` with `node-html-parser`, then writes the parser's serialization back (`apply-lqip.ts:221`). A second HTML compiler sits between `astro build` and `wrangler deploy`. `node-html-parser` can drop or rewrite attributes it does not model. Failure exits 1 (`apply-lqip.ts:273`), which blocks deploy; silent per-file `continue` (`apply-lqip.ts:225`) can ship a page without placeholders and without failing the build. | Diff one article's HTML before and after LQIP. If the parser rewrites more than the `--lqip` style, apply the style with a narrower edit. Do not commit map churn from production builds; generate the map as a build artifact. |
| F040 | Documentation drift | assets/docs/todo.md:1 | Low | S | The todo still lists SEO, an unsubscribe page, and "finir page newsletter". Both pages exist (F025). They are thin confirmation screens, not unfinished routes. | Delete the file or replace it with the open items in this audit. |
| F041 | Consistency rot | src/config.ts:68 | Low | S | `color.dark.highlights` duplicates `color.light.highlights` value for value. `Navbar.astro:41` always inlines `themeConfig.color.light.highlights`, so dark mode never reads the dark copy. | Read the active mode, or delete `dark.highlights` and document that highlights are shared. |
| F042 | Architectural decay | src/i18n/path.ts:28 | Low | S | `getPostPath` defaults the collection segment to `'posts'`, a collection this fork removed. Callers in `PostList.astro:40` pass the collection, so the default is a trap for the next caller. knip also reports `getNextLangPath` unused. `moreLocales` is empty, so the language-cycle helpers only ever return French. | Default to `'darkness'` or require the argument. Keep `[...lang]` (see below); delete helpers with no caller. |
| F043 | Error handling & observability | src/components/Widgets/GithubCard.astro:70 | Low | S | Fetch failures are `console.error` only. The card stays on its empty state. Same pattern in several widgets. Not a production incident while no post embeds a `gc-container`. | Leave it until a post uses the card. If one does, set the description text in the catch the way the 404 branch already does. |
| F044 | Test debt | .github/workflows/update-content.yml:29 | Medium | S | The only workflow `git reset --hard origin/main` inside the submodule and pushes `master`. There is no job for lint, `astro check`, or the API routes. A bad content push publishes whatever `master` builds, and a bad site commit has no check before the Worker updates. | A second workflow on pull requests: `pnpm lint` and `astro check`, without deploy. |
| F045 | Consistency rot | src/components/Footer.astro:22 | Low | S | RSS links keep the trailing slash in dev and strip the last character in production. `trailingSlash: 'always'` is set globally (`astro.config.ts:36`). The two environments generate different feed URLs. | One URL. If feed readers require no trailing slash, build that URL in both environments. |
| F046 | Documentation drift | src/plugins/remark-container-directives.mjs:21 | Low | M | Admonition titles are interpolated into an HTML string (`<span class="admonition-title">${title}</span>`). Today only the site owner writes markdown, so this is stored XSS for a trusted author. The admin spec moves editing to a browser. A title of `<img onerror=...>` would ship in the static HTML. | Escape the title, or drop raw HTML injection when Markdoc lands. |

Nothing material under a separate "dead commented-out code" hunt beyond the copies already cited: `page.ts:33` and `PostList.astro:51` still carry the old `posts` / pin-icon comments. They go away with F011 and F042.

## Top 5

If you fix nothing else, fix these. They are production hazards, not style.

### 1. F001 — Authenticate the Brevo webhook

Anyone who can POST JSON can write the newsletter list.

```ts
const secret = import.meta.env.FORMSPARK_WEBHOOK_SECRET
const provided = request.headers.get('x-webhook-secret') ?? ''
if (!secret || provided.length !== secret.length || !timingSafeEqual(provided, secret)) {
  return json({ error: 'Unauthorized' }, 401)
}
```

Compare with a constant-time helper that does not throw on length mismatch (hash both sides, or check length first). Configure the same header in Formspark. Delete `details: errorText` from every response in this file.

### 2. F002 and F003 — Botpoison fails closed

The outage fallback is a public password.

In `ContactForm.astro`, delete the catch that assigns `_botpoison = 'SERVICE_UNAVAILABLE'`. Show the existing form error and stop.

In `contact.ts`, delete the `SERVICE_UNAVAILABLE` branch. In the verify `catch`, return 503. Do not call Formspark.

### 3. F004 — Stop interpolating the dispatch payload into `run:`

```yaml
- name: Commit and push changes
  env:
    DISPATCH_REPOSITORY: ${{ github.event.client_payload.repository }}
    DISPATCH_SHA: ${{ github.event.client_payload.sha }}
    DISPATCH_PUSHER: ${{ github.event.client_payload.pusher }}
    DISPATCH_MESSAGE: ${{ github.event.client_payload.commit_message }}
  run: |
    git add src/content
    git diff --staged --quiet && exit 0
    git commit -m "chore: update content submodule" \
      -m "Triggered by: ${DISPATCH_REPOSITORY}" \
      -m "Content commit: ${DISPATCH_SHA}" \
      -m "Pushed by: ${DISPATCH_PUSHER}" \
      -m "Original message: ${DISPATCH_MESSAGE}"
    git push origin master
```

### 4. F007 and F008 — A build must not publish, and update-theme must not exist

```json
"build": "git submodule update --init --recursive && astro check && astro build && pnpm apply-lqip",
"deploy": "pnpm build && wrangler deploy"
```

Delete `scripts/update-theme.ts` and the `update-theme` script. If Cloudflare's Git integration builds the repo, its build command is `pnpm build`, not `pnpm deploy`.

### 5. F005 and F006 — The public site currently describes the wrong site

`src/i18n/ui.ts` `description` becomes the meta description because `i18nTitle` is true. Replace `'...'` with `Parler de la légèreté de l'âme et des gravités du cœur.`

In `Head.astro`, delete both apiflash branches. For pages without a post, use one file you control, for example `/icons/og-logo.png` or a dedicated `public/og-default.png`. Article pages should use the same slug as the canonical URL (F031), not the filename.

## Quick wins

Low effort, Medium or High severity.

- [ ] F001: webhook shared secret, generic errors
- [ ] F002: remove `SERVICE_UNAVAILABLE` on the client and the server
- [ ] F003: return 503 when verify throws
- [ ] F004: move dispatch fields into `env:`
- [ ] F005: delete the hardcoded apiflash URL
- [ ] F006: replace `description: '...'`
- [ ] F007: split `build` and `deploy`
- [ ] F008: delete `update-theme`
- [ ] F015: delete `_darkness-tags/` and `_emile-moselly-tags/`
- [ ] F016: delete or retarget the legal page matchers
- [ ] F017: delete `new-post` or point it at a real collection
- [ ] F018: remove `check-env` and `test-botpoison` until the files exist
- [ ] F020: declare Brevo and Formspark env vars, drop the `PUBLIC_` prefix on the form URL
- [ ] F021: stop returning `details`
- [ ] F022: reject malformed emails on the Worker
- [ ] F024: fix the manifest href and the missing `favicon.png` link
- [ ] F026: README dev steps include the submodule; strike "i18n removed" and "secure"
- [ ] F027: workflow summary says Worker
- [ ] F029: clear the upstream Waline URL
- [ ] F044: PR workflow for lint and `astro check` only

## Things that look bad but are actually fine

- The `[...lang]` route and `src/i18n/` look like a failed deletion. They are how Retypeset keeps the default locale unprefixed (`getLangRouteParam` returns `undefined` for `fr`). `moreLocales` is empty and `Button.astro:21` already hides the switcher. Ripping i18n out is a routing rewrite, not a cleanup. Delete unused helpers (F042). Leave the optional catch-all.
- `src/config.ts` banner comments are long and ugly. They are the theme's configuration manual. Rewriting them does not fix behavior.
- No file is over 500 lines. `ContactForm.astro` at 321 is a form plus its client script, not a god object. Do not split it for sport.
- `madge --circular` on `src/` reported no cycles (17 parse warnings on `.astro`, no cycles).
- `memoize` plus the in-memory reading-time `Map` is appropriate for a static build of a few dozen posts. F033 is a double render, not a broken cache.
- `depcheck` marks `@fontsource-variable/inter`, `@fontsource-variable/bricolage-grotesque`, `@waline/client`, `katex`, `mermaid`, `twikoo`, and `lite-youtube-embed` unused. They are imported from `.astro` files, which depcheck does not see. Do not uninstall them from that report. F030 is about features you have turned off, not about depcheck.
- The CJK excerpt branches in `src/utils/description.ts:39` never run while `lang` is `fr`. They are the theme's excerpt function. Harmless.
- Light and dark palette values being close to each other is the design (low-chroma oklch). The debt is only that `dark.highlights` is unread (F041).
- `pnpm audit`'s 83 highs are mostly ReDoS in eslint's minimatch, wrangler/miniflare's undici, and language-server lodash. They do not run on the public Worker. F010 is the one that touches image optimization.
- Identical light/dark highlight colors are not two competing systems. Navbar hardcoding `.light` is the actual bug, and it is small.
- Comment widgets behind `comment.enabled === false` are the theme's design. The footgun is the live Waline URL (F029), not the existence of `Giscus.astro`.
- `git reset --hard origin/main` inside the content submodule (`update-content.yml:30`) is the right way to move a pointer. The injection is the heredoc above it, not the reset.
- Drafts visible in `import.meta.env.DEV` and hidden in production (`darkness.ts:85`) is what you want for a static literary site.

## Open questions

- The Botpoison fallback was an explicit commit (`b3ad557`, "Add Botpoison fallback and backend challenge"), followed by `debug` / `gfdfgd` commits. Was fail-open meant to be temporary while the service was misconfigured? The magic string is a bypass even when Botpoison is healthy, so F002 stands either way. The question is whether you still want submissions to succeed during an outage.
- Is `/unsubcribe/` the URL already configured in Brevo? Renaming it (F025) without updating that link breaks the confirmation page.
- Does production deploy from `pnpm build` on a laptop, from Cloudflare Workers Builds running that same script, or from both? F007's split is different in each case. If the platform runs the build command and then publishes `dist/`, `wrangler deploy` inside the script double-deploys or fails for lack of a token.
- GHSA-26w7-cxv4-gfx2's patched version is Astro `>=7.2.8`. Is 5.17.1 actually in the vulnerable range, or is the advisory data un-backported? `imageService: 'compile'` means Sharp runs at build on files from the content repo. Confirm before planning an Astro 7 migration.
- Home and collection indexes group posts by year and never print the year. Is that the layout you want, or an unfinished heading?
- `Footer.astro` strips the RSS trailing slash only in production. Was that a feed-reader workaround? If yes, do it in both environments and document it. If no, delete it.
- Who can send `repository_dispatch` `content-updated`? If only the content repo's workflow can, F004 still matters because content authors control the commit message. If the event can be sent by a broader token, it matters more.
- The admin note says post bodies become Markdoc because MDX treats punctuation as code, and images move to R2. Current rendering is remark directives plus `rehype-image-processor.mjs` on local `./_images/`. That is a migration hazard, not a bug. Which directives (`:::note`, `::github`, media embeds) must keep working on day one of the admin?
- `format-posts.ts` runs autocorrect over `src/content/**/*.md`. For a French literary site, automatic CJK punctuation rewriting can touch prose you do not want rewritten. Is this script still used?
- `src/content` is gitignored. Is that so the parent repo only stores the gitlink, or has it also hidden content changes you meant to commit in the parent?
