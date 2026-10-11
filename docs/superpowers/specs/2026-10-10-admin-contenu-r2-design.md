# Note de cadrage — admin contenu et images R2

**Projet :** darkness.litt (`darkness.chenin.fr`)  
**Date :** 10 octobre 2026  
**Destinataire :** propriétaire du site  
**Nature du document :** note de cadrage (périmètre et charge). Sans prix.

---

## 1. Objet

Remplacer l’édition locale du markdown (éditeur sur machine + `git push` du dépôt de contenu) par une interface d’administration web. Les originaux d’images quittent le git et sont stockés sur Cloudflare R2. Le propriétaire met un article en ligne en cliquant sur **Enregistrer**, sans git ni terminal.

---

## 2. Constat actuel

| Élément | Situation |
| --- | --- |
| Site | Astro 5, déployé en Worker Cloudflare (`darkness.chenin.fr`, zone `chenin.fr`) |
| Code du site | Dépôt git du SSG |
| Contenu | Sous-module git `src/content` → dépôt `jfchenin/darkness.litt-content` |
| Schémas | `src/content.config.ts` : collections Darkness, Émile Moselly, À propos, blogroll, mentions légales, politique de confidentialité |
| Édition | Markdown local, puis push manuel du dépôt de contenu |
| Publication | Push sur `main` de `darkness.litt-content` → `notify-main.yml` envoie `repository_dispatch` `content-updated` → `update-content.yml` (dépôt du site) aligne le sous-module et pousse `master` → déploiement |
| Images | Fichiers `./_images/*.jpg` dans le dépôt de contenu, sans Git LFS |
| Volume (copie locale au moment du cadrage) | 95 JPEG, ~15 Mo ; le dépôt de contenu était 45 commits derrière `origin/main` — à recompter au démarrage sur `origin/main` |
| Build | Astro + Sharp optimisent les images locales ; LQIP via `scripts/apply-lqip.ts` ; RSS via `src/utils/feed.ts` |
| URL publiques | Champ `abbrlink` si présent, sinon identifiant du fichier |

---

## 3. Objectif pour le propriétaire

1. Ouvrir `admin.darkness.chenin.fr`, s’authentifier avec son adresse email (Cloudflare Access).
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
admin.darkness.chenin.fr          ◄── Worker admin (isolé du site public)
 ├── /keystatic                   ◄── édition des textes (Keystatic, mode GitHub)
 └── /media                       ◄── upload / liste, clé R2 pour le composant
    │                    │
    │                    ▼
    │                 Cloudflare R2
    │                 (originaux)
    │                 lecture publique :
    │                 media.darkness.chenin.fr
    ▼
Git de contenu (darkness.litt-content, branche main)
    │
    │  push → notify-main.yml
    │         repository_dispatch content-updated
    ▼
update-content.yml (dépôt du site)
    │  aligne src/content, commit du pointeur, push master
    ▼
Build Astro (Sharp, LQIP) et déploiement
    │
    ▼
darkness.chenin.fr                ◄── Worker public (inchangé dans son rôle)
```

### Principes

- L’admin n’est pas exposé sur le domaine public.
- Le git de contenu reste la source des textes. R2 est la source des originaux d’images.
- Le composant image et le rendu public vivent dans le même dépôt : même contrat.
- **Enregistrer** commit sur `main` du dépôt de contenu et lance la chaîne existante. C’est la mise en ligne.
- Un texte pas prêt se marque brouillon avant l’enregistrement. Pas de bouton **Publier**. L’admin ne lance pas `workflow_dispatch`.

---

## 5. Modèle de contenu

### Collections littéraires

| Collection | Rôle | Champs (déjà lus par le site) |
| --- | --- | --- |
| Darkness | Articles | titre, auteur, published, updated, description, tags, draft, pin, toc, lang, abbrlink + corps |
| Émile Moselly | Articles | idem |

Effectifs au moment du cadrage (copie locale) : Darkness 13 textes, Émile Moselly 6. À vérifier sur `origin/main` au démarrage.

### Pages fixes (une entrée chacune)

| Collection | Contenu éditable |
| --- | --- |
| À propos | langue + corps |
| Blogroll | langue + corps |
| Mentions légales | langue + corps |
| Politique de confidentialité | langue + corps |

### Hors admin

Le dossier `_templates` du dépôt de contenu n’est pas exposé dans l’interface.

### Format du corps

- Corps en **Markdoc** (pas MDX) : les textes longs contiennent des caractères que MDX interpréterait comme du code.
- Les noms de fichiers et les `abbrlink` **ne changent pas** : les URL publiques actuelles restent.

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

Le site rend la même figure qu’aujourd’hui (légende, orientation, zoom). Le visiteur reçoit l’image **optimisée au build**, pas l’URL R2 brute.

---

## 6. Flux de publication

| Action | Effet |
| --- | --- |
| **Enregistrer** | Commit sur `main` du dépôt de contenu via l’API GitHub. Le push déclenche `notify-main.yml`, puis `update-content.yml` (alignement du sous-module, push de `master`), puis le build et le déploiement déjà branchés sur ce push. |

`update-content.yml` ne lance pas le build Astro. Il avance le pointeur de sous-module. Le déploiement suit le push de `master`, comme aujourd’hui.

### Règles

- Un seul éditeur. Pas de pull request.
- Un brouillon (`draft: true`) est enregistré dans le git et construit au même passage, sans être affiché (comportement actuel du site).
- Pas de bouton **Publier**, pas de barre de progression. L’admin confirme que l’enregistrement a lancé la publication. Le site bouge à la fin du build.
- Si le build échoue, la version déjà en ligne reste. Le commit de contenu est déjà sur `main` : une correction, puis un nouvel **Enregistrer**, relance la chaîne.
- Une **GitHub App** écrit sur le dépôt de contenu (Keystatic). Les workflows de publication gardent leur jeton actuel (`MAIN_REPO_PAT`). L’admin n’appelle pas le dépôt du site.

---

## 7. Images et R2

### Stockage

| Point | Choix |
| --- | --- |
| Bucket | Compte Cloudflare déjà utilisé (zone `chenin.fr`) |
| Clé d’objet | `collection/fichier.jpg` (ex. `darkness/couvrecomposition.jpg`) |
| Lecture publique | `media.darkness.chenin.fr`, sans liste de dossier |
| Upload | Uniquement via l’admin authentifié |
| Contenu stocké dans les articles | La clé R2, pas l’URL |
| Suppression de fichiers | Hors de cette intervention |

### Règles d’upload

Refus si :

- le fichier n’est pas une image ;
- la taille dépasse 15 Mo ;
- la clé existe déjà.

### Migration (inclus dans le chantier)

1. Recompter les images et les articles sur `origin/main` du dépôt de contenu.
2. Envoyer chaque JPEG vers R2 sous la clé `collection/fichier.jpg`.
3. Réécrire chaque `![alt](./_images/...)` en balise `{% image ... /%}`, en traduisant `landscape`, `portrait` et le préfixe `_`.
4. Retirer les dossiers `_images` du **HEAD** du dépôt de contenu.
5. **Ne pas** réécrire l’historique git.

### Build public

- Le composant image alimente `getImage` / Sharp : les fichiers servis par `darkness.chenin.fr` restent optimisés.
- Le LQIP actuel (lecture de `dist/`) reste en place.
- Le flux RSS cesse de chercher `./_images/` et reprend l’URL déjà optimisée.

---

## 8. Erreurs et point de contrôle

### Comportements d’erreur

| Situation | Comportement |
| --- | --- |
| Échec d’enregistrement GitHub | Message dans l’admin ; pas de copie locale de secours ; la chaîne de publication ne part pas |
| Build en échec | `darkness.chenin.fr` conserve la version précédente. L’admin ne montre pas le résultat du build |
| Image absente sur R2 | Le build échoue (pas de page publiée avec un trou) |
| Admin inaccessible | Le site public n’est pas touché |

### Essai bloquant (premier jour)

Prouver que Keystatic en mode GitHub tourne sur un Worker Cloudflare. Le site public a déjà le flag `nodejs_compat`.

**Si cet essai échoue : arrêt du chantier et nouvel échange avant le reste.**

---

## 9. Essais de validation

- Migration sur une copie : plus aucun `./_images/` dans les articles ; chaque JPEG présent sur R2.
- Une page par cas de composant : légende affichée, légende masquée, paysage, portrait.
- Un brouillon enregistré reste absent de la liste publique après le déploiement lancé par cet enregistrement.
- **Enregistrer** sur `main` du contenu lance `notify-main.yml`, puis `update-content.yml`.
- Les URL fondées sur `abbrlink` répondent comme avant.
- Le RSS contient l’URL d’image optimisée.
- Une requête anonyme vers l’admin est refusée.

Livrable complémentaire : un mode d’emploi court pour le propriétaire (ouvrir l’admin, écrire, uploader, marquer brouillon si besoin, enregistrer).

---

## 10. Charge estimée

Sans prix. Fourchette en jours, à affiner selon le corpus réel sur `origin/main`.

| # | Lot | Charge |
| --- | ---: | --- |
| 1 | Worker admin, Keystatic, GitHub App, Cloudflare Access, schémas des collections et pages, essai Worker | 3 à 4 j |
| 2 | Médiathèque R2, domaine `media`, liste, upload, insertion de la clé | 1,5 à 2 j |
| 3 | Rendu public (Markdoc, composant image, Sharp, RSS, LQIP) | 2 à 2,5 j |
| 4 | Migration des articles et des JPEG, relecture, retrait des `_images` du HEAD | 2 à 3 j |
| 5 | Vérifier que l’enregistrement Keystatic déclenche `notify-main.yml` puis `update-content.yml` ; confirmation dans l’admin | 0,5 à 1 j |
| 6 | Essais listés et mode d’emploi court | 1 à 1,5 j |
| | **Total** | **10 à 14 jours** |

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

---

## 12. À fournir par le propriétaire

1. Accès au compte Cloudflare déjà utilisé pour `darkness.chenin.fr`.
2. Droit de créer une GitHub App et de l’installer sur le dépôt de contenu. Le jeton déjà utilisé par `notify-main.yml` et `update-content.yml` reste en place.
3. DNS :
   - `admin.darkness.chenin.fr` → worker admin
   - `media.darkness.chenin.fr` → lecture publique R2
4. Adresse email à autoriser dans Cloudflare Access.

---

## 13. Critères de succès

Le chantier est réussi lorsque :

1. Le propriétaire édite un article depuis l’admin et le met en ligne par **Enregistrer**, sans git ni terminal.
2. Aucune image d’article ne reste dans le HEAD du dépôt de contenu.
3. Les pages publiques affichent des images optimisées, avec légendes et orientations correctes.
4. Les URL existantes (`abbrlink`) restent valides.
5. L’admin n’est accessible qu’à l’email autorisé.
6. Un échec de build laisse le site public intact.
