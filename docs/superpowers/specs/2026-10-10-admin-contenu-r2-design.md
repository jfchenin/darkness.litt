# Note de cadrage — admin contenu et images R2

**Projet :** darkness.litt (`darkness.chenin.fr`)

**Date :** 10 octobre 2026

**Mise à jour :** 11 octobre 2026 — constat realigné sur `origin/main` du dépôt de contenu, sur le découpage `build` / `deploy`, et sur la couche de lecture unique des collections.

**Destinataire :** propriétaire du site

**Nature du document :** note de cadrage (périmètre et charge). Sans prix.

---

## 1. Objet

Remplacer l’édition locale du markdown (éditeur sur machine + `git push` du dépôt de contenu) par une interface d’administration web. Les originaux d’images quittent le git et sont stockés sur Cloudflare R2. Le propriétaire met un article en ligne en cliquant sur **Enregistrer**, sans git ni terminal.

---

## 2. Constat actuel

Relevé le 11 octobre 2026. Le dépôt de contenu local est sur `origin/main`, sans avance ni retard.

| Élément | Situation |
| --- | --- |
| Site | Astro 5.17, déployé en Worker Cloudflare (`darkness.chenin.fr`, zone `chenin.fr`, `imageService: 'compile'`) |
| Code du site | Dépôt git du SSG |
| Contenu | Sous-module git `src/content` → dépôt `jfchenin/darkness.litt-content` |
| Schémas | `src/content.config.ts` : un schéma partagé pour Darkness et Émile Moselly ; pages À propos, blogroll, mentions légales, politique de confidentialité |
| Lecture des textes | Une seule couche : `src/utils/posts.ts`, page d’article `CollectionPost.astro`, chemins `collectionSlugPaths.ts`, pages fixes `ProsePage.astro`. Les tags publics sont `/tags/`. L’admin s’appuie sur cette couche |
| Édition | Markdown local, puis push manuel du dépôt de contenu |
| Publication | Push sur `main` de `darkness.litt-content` → `notify-main.yml` envoie `repository_dispatch` `content-updated` → `update-content.yml` aligne le sous-module et pousse `master`. Ce workflow ne build pas et ne déploie pas. Le message du dispatch passe par des variables d’environnement |
| Build et mise en ligne | `pnpm build` enchaîne le sous-module, `astro check`, `astro build` et le LQIP. Il ne publie pas. `pnpm deploy` est `pnpm build` puis `wrangler deploy`. La mise en ligne après le push de `master` dépend de l’intégration Git Cloudflare, pas du workflow |
| Images | Fichiers `./_images/*.jpg` dans le dépôt de contenu, sans Git LFS. Le rendu public passe par `rehype-image-processor.mjs` (préfixes `landscape`, `portrait`, `_` dans le `alt`) |
| Volume (`origin/main`) | 234 JPEG, ~557 Mo, dans 24 textes (229 balises image). Un fichier dépasse 15 Mo : `darkness/_images/everglades_7.jpg` (~17 Mo). Deux `.DS_Store` dans les dossiers d’images, à ne pas migrer |
| Textes | Darkness 20, Émile Moselly 9. Le corps est du markdown image ; aucune directive `:::note`, carte GitHub, formule ou diagramme dans le dépôt de contenu |
| RSS | Second moteur (`MarkdownIt` dans `src/utils/feed.ts`), qui cherche encore `./_images/`. Il ne reprend pas le HTML de la page |
| URL publiques | `abbrlink` si présent, sinon identifiant du fichier. L’image sociale (`/og/`) utilise le même slug |

Le résumé de `update-content.yml` dit encore que Cloudflare Pages déploiera. Le site est un Worker. Cette phrase est fausse ; le lot 5 la corrige.

---

## 3. Objectif pour le propriétaire

1. Ouvrir `admin.chenin.fr`, s’authentifier avec son adresse email (Cloudflare Access).
2. Écrire ou modifier un texte dans l’interface.
3. Uploader une image dans la médiathèque, l’insérer dans l’article via le composant image.
4. Cliquer **Enregistrer** pour écrire le texte sur `main` du dépôt de contenu. Ce push publie le site par la chaîne déjà en place, sans git ni terminal.
5. Marquer un texte **brouillon** avant l’enregistrement s’il ne doit pas apparaître sur le site.

---

## 4. Architecture retenue

Worker admin séparé, code dans le dépôt du site, écriture GitHub sur le dépôt de contenu, originaux sur R2, composant image partagé avec le rendu public.

```text
Propriétaire
    │
    ▼
Cloudflare Access (email)
    │
    ▼
admin.chenin.fr                    ◄── Worker admin (isolé du site public)
 ├── /keystatic                   ◄── édition des textes (Keystatic, mode GitHub)
 └── /media                       ◄── upload / liste, clé R2 pour le composant
    │                    │
    │                    ▼
    │                 Cloudflare R2
    │                 (originaux)
    │                 lecture publique :
    │                 cdn.chenin.fr (CDN public)
    ▼
Git de contenu (darkness.litt-content, branche main)
    │
    │  push → notify-main.yml
    │         repository_dispatch content-updated
    ▼
update-content.yml (dépôt du site)
    │  aligne src/content, commit du pointeur, push master
    │  ne build pas, ne déploie pas
    ▼
Intégration Git Cloudflare
    │  commande de build : pnpm build
    │  (check, Astro, Sharp, LQIP)
    │  la plateforme publie le Worker
    ▼
darkness.chenin.fr                ◄── Worker public (inchangé dans son rôle)
```

### Principes

- L’admin n’est pas exposé sur le domaine public.
- Le git de contenu reste la source des textes. R2 est la source des originaux d’images.
- Le composant image et le rendu public vivent dans le même dépôt : même contrat. Les schémas Keystatic reprennent `content.config.ts` et la couche unique (`posts.ts`, `CollectionPost`, `ProsePage`). Pas une seconde copie Darkness / Émile Moselly.
- **Enregistrer** commit sur `main` du dépôt de contenu et lance la chaîne existante. C’est la mise en ligne.
- Un texte pas prêt se marque brouillon avant l’enregistrement. Pas de bouton **Publier**. L’admin ne lance pas `workflow_dispatch`.
- `pnpm build` ne contient pas `wrangler deploy`. Si l’intégration Cloudflare lance le build puis publie `dist/`, sa commande est `pnpm build`. `pnpm deploy` à cet endroit publierait deux fois.

---

## 5. Modèle de contenu

### Collections littéraires

| Collection | Rôle | Champs (déjà lus par le site) |
| --- | --- | --- |
| Darkness | Articles | titre, auteur, published, updated, description, tags, draft, pin, toc, lang, abbrlink + corps |
| Émile Moselly | Articles | idem |

Le schéma est déjà unique dans `content.config.ts`. L’admin le déclare une fois et l’applique aux deux collections. L’auteur s’affiche sur Darkness seulement (`CollectionPost`, prop `showAuthor`) : l’admin ne fusionne pas cet affichage.

Effectifs sur `origin/main` : Darkness 20 textes, Émile Moselly 9.

### Pages fixes (une entrée chacune)

| Collection | Contenu éditable |
| --- | --- |
| À propos | langue + corps |
| Blogroll | langue + corps |
| Mentions légales | langue + corps |
| Politique de confidentialité | langue + corps |

Le rendu public est `ProsePage.astro` (nom de collection en entrée). L’admin expose les quatre entrées, pas quatre copies de page.

### Hors admin

Le dossier `_templates` du dépôt de contenu n’est pas exposé dans l’interface.

Les plugins du thème (encadrés `:::note`, carte `::github`, KaTeX, Mermaid, embeds) ne sont pas dans le corpus. L’admin ne les propose pas. Le chantier ne les porte pas dans Markdoc.

### Format du corps

- Corps en **Markdoc** (pas MDX) : les textes longs contiennent des caractères que MDX interpréterait comme du code.
- Les noms de fichiers et les `abbrlink` **ne changent pas** : les URL publiques et les images sociales actuelles restent.
- Le corps migré remplace les images markdown. Il ne réintroduit pas de HTML brut. Le plugin d’encadrés qui insère le titre tel quel dans le HTML reste hors du chemin d’édition ; s’il demeure dans le pipeline au moment de l’ouverture de l’admin, son titre est échappé.

### Composant image

Remplace la syntaxe markdown `![légende](./_images/fichier.jpg)`.

```markdoc
{% image
   src="darkness/couvrecomposition.jpg"
   alt="Couverture de (re)composition"
   orientation="portrait"
   hideCaption=false
/%}
```

| Champ | Rôle |
| --- | --- |
| `src` | Clé R2 (`collection/fichier.jpg`), pas l’URL complète — permet de changer de domaine média sans réécrire les articles |
| `alt` | Légende |
| `orientation` | aucune / paysage / portrait (remplace les préfixes `landscape` / `portrait` dans l’ancien `alt`) |
| `hideCaption` | masquer la légende (remplace le préfixe `_` dans l’ancien `alt`) |

Sur `origin/main`, un `alt` commence par `landscape ` et un par `_`. Aucun ne commence par `portrait ` : le champ reste, le cas est couvert par l’essai même s’il est absent du corpus.

Le site rend la même figure qu’aujourd’hui (légende, orientation, zoom). Le visiteur reçoit l’image **optimisée au build**, pas l’URL R2 brute.

---

## 6. Flux de publication

| Action | Effet |
| --- | --- |
| **Enregistrer** | Commit sur `main` du dépôt de contenu via l’API GitHub. Le push déclenche `notify-main.yml`, puis `update-content.yml` (alignement du sous-module, push de `master`). La mise en ligne est le build Cloudflare branché sur ce push. |

`update-content.yml` ne lance pas le build Astro et n’appelle pas `wrangler`. Il avance le pointeur de sous-module. Le Worker bouge si l’intégration Git exécute `pnpm build` et publie l’artefact.

### Règles

- Un seul éditeur. Pas de pull request.
- Un brouillon (`draft: true`) est enregistré dans le git et construit au même passage, sans être affiché (comportement actuel du site).
- Pas de bouton **Publier**, pas de barre de progression. L’admin confirme que l’enregistrement a lancé la publication. Le site bouge à la fin du build.
- Si le build échoue, la version déjà en ligne reste. Le commit de contenu est déjà sur `main` : une correction, puis un nouvel **Enregistrer**, relance la chaîne.
- Une **GitHub App** écrit sur le dépôt de contenu (Keystatic). Les workflows de publication gardent leur jeton actuel (`MAIN_REPO_PAT`). Le message de commit du contenu est une donnée (variables d’environnement), pas un fragment de script. L’admin n’appelle pas le dépôt du site.
- Avant le lot 5, vérifier la commande de build Cloudflare. Si elle compte encore sur `wrangler` à l’intérieur de `pnpm build`, la chaîne est cassée depuis le découpage des scripts : on la rétablit côté plateforme, sans remettre le déploiement dans `build`.

---

## 7. Images et R2

### Stockage

| Point | Choix |
| --- | --- |
| Bucket | Compte Cloudflare déjà utilisé (zone `chenin.fr`) |
| Clé d’objet | `collection/fichier.jpg` (ex. `darkness/couvrecomposition.jpg`) |
| Lecture publique | `cdn.chenin.fr`, sans liste de dossier |
| Upload | Via R2 Manager externe (`media.chenin.fr`, derrière Access) |
| Contenu stocké dans les articles | La clé R2, pas l’URL |
| Suppression de fichiers | Hors de cette intervention |

### Règles d’upload

Refus si :

- le fichier n’est pas un JPEG ;
- la taille dépasse 20 Mo ;
- la clé existe déjà.

JPEG seulement : le corpus l’est, et le build optimise les fichiers avec Astro 5.17 (`imageService: 'compile'`). Cette version est dans le périmètre de l’avis GHSA-26w7 (AVIF / libheif, corrigé à partir d’Astro 7.2.8). Sharp est en `^0.35.5`, ce qui ferme le côté libvips, pas l’avis Astro. Un AVIF déposé par l’admin serait compilé au build. L’AVIF, le WebP et le PNG restent hors admin tant que cet avis n’est pas traité. Ce n’est pas une migration Astro 7.

Le seuil est 20 Mo, pas 15 : `everglades_7.jpg` fait ~17 Mo et doit pouvoir être redéposé.

### Migration (inclus dans le chantier)

1. Partir de `origin/main` (déjà le cas au 11 octobre : 234 JPEG, ~557 Mo, 229 balises, 20 + 9 textes).
2. Envoyer chaque JPEG vers R2 sous la clé `collection/fichier.jpg`. Ignorer `.DS_Store` et tout fichier qui n’est pas un JPEG.
3. Réécrire chaque `![alt](./_images/...)` en balise `{% image ... /%}`, en traduisant `landscape`, `portrait` et le préfixe `_`.
4. Retirer les dossiers `_images` du **HEAD** du dépôt de contenu.
5. **Ne pas** réécrire l’historique git.

### Build public

- Le composant image alimente `getImage` / Sharp : les fichiers servis par `darkness.chenin.fr` restent optimisés.
- Le LQIP actuel (`scripts/apply-lqip.ts`, relecture de `dist/`) reste en place. Il réécrit chaque HTML avec un second parseur. La figure (légende, orientation, zoom) doit ressortir intacte de ce passage.
- Le flux RSS abandonne son `MarkdownIt` et sa recherche de `./_images/`. Il reprend l’URL déjà optimisée pour la page. Un second moteur ne verra pas le composant image.

---

## 8. Erreurs et point de contrôle

### Comportements d’erreur

| Situation | Comportement |
| --- | --- |
| Échec d’enregistrement GitHub | Message dans l’admin ; pas de copie locale de secours ; la chaîne de publication ne part pas |
| Build en échec | `darkness.chenin.fr` conserve la version précédente. L’admin ne montre pas le résultat du build |
| Image absente sur R2 | Le build échoue (pas de page publiée avec un trou) |
| Fichier non JPEG, ou au-dessus de 20 Mo, ou clé déjà prise | Refus dans l’admin ; rien n’est écrit sur R2 |
| Admin inaccessible | Le site public n’est pas touché |
| Commande Cloudflare encore couplée à l’ancien `pnpm build` (avec `wrangler`) | Le push de `master` ne publie plus. À trancher avant le reste du lot 5 |

### Essai bloquant (premier jour)

Prouver que Keystatic en mode GitHub tourne sur un Worker Cloudflare. Le site public a déjà le flag `nodejs_compat`.

**Si cet essai échoue : arrêt du chantier et nouvel échange avant le reste.**

Le même premier jour constate la commande de build Cloudflare (lot 5). Un échec ici ne bloque pas les lots 2 à 4 ; il bloque l’affirmation « Enregistrer met en ligne ».

---

## 9. Essais de validation

- Migration sur une copie : plus aucun `./_images/` dans les articles ; chaque JPEG présent sur R2 ; les `.DS_Store` absents du bucket.
- Une page par cas de composant : légende affichée, légende masquée, paysage, portrait.
- HTML d’un article avant et après LQIP : la figure, la légende et les attributs de zoom sont les mêmes, hors style `--lqip`.
- Un brouillon enregistré reste absent de la liste publique après le déploiement lancé par cet enregistrement.
- **Enregistrer** sur `main` du contenu lance `notify-main.yml`, puis `update-content.yml`, puis un build Worker (pas Pages). La commande de plateforme est `pnpm build`.
- Les URL fondées sur `abbrlink` répondent comme avant, y compris `/og/<slug>.png`.
- Le RSS contient l’URL d’image optimisée et ne référence plus `./_images/`.
- Un JPEG de 17 Mo est accepté ; un AVIF et un fichier de plus de 20 Mo sont refusés.
- Une requête anonyme vers l’admin est refusée.

Livrable complémentaire : un mode d’emploi court pour le propriétaire (ouvrir l’admin, écrire, uploader, marquer brouillon si besoin, enregistrer).

---

## 10. Charge estimée

Sans prix. Fourchette en jours, recalée sur le corpus `origin/main` du 11 octobre (234 JPEG, ~557 Mo, 229 réécritures).

| # | Lot | Charge |
| --- | ---: | --- |
| 1 | Worker admin, Keystatic, GitHub App, Cloudflare Access, schémas des collections et pages sur la couche unique, essai Worker | 3 à 4 j |
| 2 | Médiathèque R2, domaine `media`, liste, upload JPEG ≤ 20 Mo, insertion de la clé | 1,5 à 2 j |
| 3 | Rendu public (Markdoc, composant image, Sharp, RSS aligné sur la page, LQIP qui conserve la figure) | 2 à 2,5 j |
| 4 | Migration des 229 balises et des 234 JPEG (~557 Mo), relecture, retrait des `_images` du HEAD | 3 à 4 j |
| 5 | Vérifier la commande Cloudflare (`pnpm build`, Worker) ; corriger le résumé « Pages » du workflow ; confirmer dans l’admin que l’enregistrement lance la chaîne | 0,5 à 1 j |
| 6 | Essais listés et mode d’emploi court | 1 à 1,5 j |
| | **Total** | **11 à 15 jours** |

Si l’essai Keystatic sur Worker échoue, la charge des lots 2 à 6 n’est pas engagée tant qu’une nouvelle approche n’est pas validée.

---

## 11. Hors périmètre

- Prix / devis commercial chiffré en euros
- Réécriture de l’historique git (purge des binaries dans le passé du dépôt de contenu)
- Suppression de médias depuis l’admin
- Barre de progression live du build, statut ou résultat du build dans l’admin
- Bouton **Publier** distinct, enregistrement sans mise en ligne, `workflow_dispatch` lancé par l’admin
- Plusieurs éditeurs / workflow de relecture
- Environnement de prévisualisation séparé
- SEO, newsletter, i18n (sujets déjà listés ailleurs, hors de cette intervention)
- Migration Astro 7, et tout format d’image autre que le JPEG
- Portage Markdoc des encadrés, cartes GitHub, KaTeX, Mermaid et embeds : absents du corpus

---

## 12. À fournir par le propriétaire

1. Accès au compte Cloudflare déjà utilisé pour `darkness.chenin.fr`, y compris la commande de build de l’intégration Git.
2. Droit de créer une GitHub App et de l’installer sur le dépôt de contenu. Le jeton déjà utilisé par `notify-main.yml` et `update-content.yml` reste en place.
3. DNS :
   - `admin.chenin.fr` → worker admin
   - `cdn.chenin.fr` → lecture publique R2
4. Adresse email à autoriser dans Cloudflare Access.

---

## 13. Critères de succès

Le chantier est réussi lorsque :

1. Le propriétaire édite un article depuis l’admin et le met en ligne par **Enregistrer**, sans git ni terminal.
2. Aucune image d’article ne reste dans le HEAD du dépôt de contenu.
3. Les pages publiques affichent des images optimisées, avec légendes et orientations correctes, y compris après le passage LQIP.
4. Les URL existantes (`abbrlink`) restent valides, ainsi que l’image sociale du même slug.
5. L’admin n’est accessible qu’à l’email autorisé, et n’accepte que des JPEG d’au plus 20 Mo.
6. Un échec de build laisse le site public intact.
7. Le push de `master` publie le Worker via `pnpm build`, sans `wrangler` dans cette commande.
