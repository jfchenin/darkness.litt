# darkness.litt

Version adaptée de Retypeset pour l'usage personnel de JFrançois Chénin

## README en français

**darkness.litt** est une version modifiée de Retypeset, un thème de blog statique basé sur le framework Astro. Le code source de ce site, dérivé du thème Retypeset sous licence MIT, comprend des modifications substantielles.

**Découvrez le blog :** [darkness.chenin.fr](https://darkness.chenin.fr)

---

## Fonctionnalités

- Toutes les fonctionnalités de Retypeset

---

## Modifications apportées

- Renommage du site en **darkness.litt**
- Suppression du support i18n
- Suppression des polices inutilisées : EarlySummer-VF-Split, NotoSansSC (Bold et Regular), STIX (VF et Italic VF), Snell (Black et Bold)
- Ajout de nouvelles polices : `@fontsource-variable/inter`, `@fontsource-variable/bricolage-grotesque`, NotoSans (Bold et Regular)
- Création de deux sections d'articles distinctes : « Darkness » et « Émile Moselly »
- Restructuration de la page d'accueil et du système de tags pour supporter les deux collections
- Ajout de la propriété `author` au schéma partagé pour les deux collections
- Ajout d'une page de contact, d'une blogroll, d'une page newsletter et des pages légales, incluant une politique de confidentialité et des mentions légales
- Mise à jour des couleurs de survol CSS pour supporter des variantes supplémentaires
- Mise à jour du comportement du composant `BackButton.astro`
- Ajout du composant `TopButton.astro`
- Ajout de l'adaptateur `@astrojs/cloudflare` et création d'un fichier de configuration Wrangler
- Conversion du répertoire `./src/content` en sous-module Git, **darkness.litt-content**
- Ajout d'un endpoint API de formulaire de contact sécurisé (compatible Cloudflare Workers) :
  - Gestion des soumissions de formulaire avec Formspark et vérification Botpoison
  - Automatisation des abonnements newsletter via webhook Formspark
  - Gestion du consentement RGPD conforme

---

## Performances

<p align="center">
  <a href="https://pagespeed.web.dev/analysis/https-darkness-chenin-fr/wame74hk2w?form_factor=desktop">
    <img width="710" alt="Score Lighthouse Retypeset" src="assets/images/retypeset-lighthouse-score.svg">
  </a>
</p>

---

## Pour commencer

1. Forkez ce dépôt, ou utilisez ce template pour créer un nouveau dépôt.
2. Exécutez les commandes suivantes dans votre terminal :
```bash
# Cloner le dépôt
git clone <repository-url>

# Naviguer dans le répertoire du projet
cd <repository-name>

# Installer pnpm globalement (si ce n'est pas déjà fait)
npm install -g pnpm

# Installer les dépendances
pnpm install

# Démarrer le serveur de développement
pnpm dev
```

---

## Crédits

### Thème Astro blog

- **Retypeset** — ©2025 Retypeset

### Polices

- **Bricolage Grotesque** — ©2022 The Bricolage Grotesque Project Authors, sous SIL Open Font License
- **Inter** — ©2016 The Inter Project Authors, sous SIL Open Font License 1.1

### Services

- **Formspark** — ©2018 Formspark
- **Botpoison** — ©2021 Botpoison

---

**Dernière mise à jour :** 8 janvier 2026
