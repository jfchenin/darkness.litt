# darkness.litt

**Tailored version of [Retypeset](https://github.com/radishzzz/astro-theme-retypeset) for the personal use of [JFrançois Chénin](https://www.thebookedition.com/fr/2506_jfrancois-chenin)**

![Cover Image](assets/images/v1/retypeset-en-desktop.webp)
![Cover Image](assets/images/v1/retypeset-en-mobile.webp)

[README en français](assets/docs/README.fr.md)

darkness.litt is a fork of Retypeset, a static blog theme based on the [Astro](https://astro.build/) framework.
The source code of this site, derived from the [Retypeset](https://github.com/radishzzz/astro-theme-retypeset) theme under MIT license, includes substantial modifications.

### Check out the blog

- [darkness.chenin.fr](https://darkness.chenin.fr/)

### Features

- All [Retypeset](https://github.com/radishzzz/astro-theme-retypeset) features

### Changes made

- Rebranded site to darkness.litt
- Removed i18n support
- Removed unused fonts: EarlySummer-VF-Split, NotoSansSC (Bold and Regular), STIX (VF and Italic VF), Snell (Black and Bold)
- Added new fonts: `@fontsource-variable/inter`, `@fontsource-variable/bricolage-grotesque`, NotoSans (Bold and Regular)
- Created two distinct article sections: *“Darkness”* and *“Émile Moselly”*
- Restructured the home page and tag system to support both collections
- Added the `author` property to the shared schema for both collections
- Added contact page, blogroll and legal pages, including a privacy policy, legal notice
- Updated CSS hover highlight colors to support additional variants
- Updated the behavior of the `BackButton.astro` component
- Added a `TopButton.astro` component
- Added the `@astrojs/cloudflare` adapter and created a Wrangler configuration file
- Converted the `./src/content` directory into a Git submodule, [darkness.litt-content](https://github.com/jfchenin/darkness.litt-content)

### Performance

<br>
<p align="center">
  <a href="https://pagespeed.web.dev/analysis/https-darkness-chenin-fr/wame74hk2w?form_factor=desktop">
    <img width="710" alt="Retypeset Lighthouse Score" src="assets/images/retypeset-lighthouse-score.svg">
  <a>
</p>

### Getting Started

1. [Fork](https://github.com/jfchenin/darkness.litt/fork) this repository, or use this template to create a new repository.
2. Run the following commands in your terminal:

   ```bash
   # Clone the repository
   git clone <repository-url>

   # Navigate to the project directory
   cd <repository-name>

   # Install pnpm globally (if not already installed)
   npm install -g pnpm

   # Install dependencies
   pnpm install

   # Start the development server
   pnpm dev
   ```

### Credits

#### Astro blog theme

- **Retypeset** — ©2025 [Retypeset](https://github.com/radishzzz/astro-theme-retypeset)

#### Fonts

- **Bricolage Grotesque** — ©2022 [The Bricolage Grotesque Project Authors](https://github.com/ateliertriay/bricolage), sous SIL Open Font License
- **Inter** — ©2016 [The Inter Project Authors](https://github.com/rsms/inter), sous SIL Open Font License 1.1

#### Services

- **Formspark** — ©2018 [Formspark](https://github.com/formspark)
- **Botpoison** — ©2021 [Botpoison](https://botpoison.com/)
- **Newsletter** — [Service à préciser]

---

***Last update : 28 December 2025***
