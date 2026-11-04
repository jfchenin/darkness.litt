// admin/keystatic.config.ts
import { collection, config, fields, singleton } from '@keystatic/core'
import { block } from '@keystatic/core/content-components'
import { abbrlinkPattern, defaultAuthor, proseEntries } from '../shared/literary-fields'

const isGithubStorage = import.meta.env.KEYSTATIC_STORAGE === 'github'
const pathPrefix = isGithubStorage ? '' : 'fixtures/'

const proseLabels = {
  about: 'À propos',
  blogroll: 'Blogroll',
  legalNotices: 'Mentions légales',
  privacyPolicy: 'Politique de confidentialité',
} as const

// Creates the language selector shared by literary entries and prose pages.
function createLanguageField() {
  return fields.select({
    label: 'Langue',
    options: [
      { label: 'Universel', value: '' },
      { label: 'fr', value: 'fr' },
    ],
    defaultValue: '',
  })
}

// Creates the schema shared by the literary collections.
// Title is plain text so edits never rename the Git file; filename is a separate slugField.
function createLiterarySchema() {
  return {
    title: fields.text({
      label: 'Titre',
      description: 'Affiché sur le site.',
      validation: { isRequired: true },
    }),
    filename: fields.slug({
      name: {
        label: 'Aide fichier',
        description: 'Sert seulement à proposer le nom de fichier à la création.',
        validation: { isRequired: true },
      },
      slug: {
        label: 'Nom de fichier',
        description: 'Ne pas changer sur un article déjà publié.',
      },
    }),
    author: fields.text({
      label: 'Auteur',
      defaultValue: defaultAuthor,
    }),
    published: fields.date({
      label: 'Publié',
      validation: { isRequired: true },
    }),
    description: fields.text({
      label: 'Description',
      multiline: true,
    }),
    updated: fields.date({
      label: 'Mis à jour',
    }),
    tags: fields.array(fields.text({ label: 'Tag' }), {
      label: 'Tags',
      itemLabel: props => props.value,
    }),
    draft: fields.checkbox({
      label: 'Brouillon',
      defaultValue: false,
      description: 'Invisible sur le site public et /og/ en production',
    }),
    pin: fields.integer({
      label: 'Pin',
      defaultValue: 0,
      validation: { min: 0, max: 99 },
    }),
    toc: fields.checkbox({
      label: 'Table des matières',
      defaultValue: true,
    }),
    lang: createLanguageField(),
    abbrlink: fields.text({
      label: 'Abbrlink',
      description: 'Adresse publique (a-z, chiffres, tirets). Si vide : nom de fichier.',
      validation: {
        pattern: {
          regex: abbrlinkPattern,
          message: 'a-z, 0-9 et tirets uniquement',
        },
      },
    }),
    content: fields.markdoc({
      label: 'Corps',
      extension: 'md',
    }),
  }
}

// Markdoc block rendering a bucket image (src is an R2 key, not a file path).
const articleImageBlock = block({
  label: 'Image',
  schema: {
    src: fields.text({
      label: 'Clé R2',
      description:
        'darkness/fichier.jpg, darkness/dossier/fichier.jpg, ou emile-moselly/…. Téléversez d’abord le JPEG sur media.chenin.fr.',
      validation: { isRequired: true },
    }),
    alt: fields.text({ label: 'Légende / alt', validation: { isRequired: true } }),
    orientation: fields.select({
      label: 'Orientation',
      options: [
        { label: 'none', value: 'none' },
        { label: 'landscape', value: 'landscape' },
        { label: 'portrait', value: 'portrait' },
      ],
      defaultValue: 'none',
    }),
    hideCaption: fields.checkbox({ label: 'Masquer la légende', defaultValue: false }),
  },
})

// Creates the literary schema with a `.mdoc` body supporting the image block.
function createMarkdocLiterarySchema() {
  return {
    ...createLiterarySchema(),
    content: fields.markdoc({
      label: 'Corps',
      extension: 'mdoc',
      options: { image: false },
      components: { articleImage: articleImageBlock },
    }),
  }
}

const proseSingletons = Object.fromEntries(
  proseEntries.map(entry => [
    entry.collection,
    singleton({
      label: proseLabels[entry.collection],
      path: `${pathPrefix}${entry.path}`,
      format: { contentField: 'content' },
      schema: {
        lang: createLanguageField(),
        content: fields.markdoc({
          label: 'Corps',
          extension: 'md',
        }),
      },
    }),
  ]),
)

export default config({
  storage: isGithubStorage
    ? { kind: 'github', repo: 'jfchenin/darkness.litt-content' }
    : { kind: 'local' },
  collections: {
    darkness: collection({
      label: 'Darkness',
      path: `${pathPrefix}darkness/*`,
      slugField: 'filename',
      format: { contentField: 'content' },
      schema: createLiterarySchema(),
    }),
    emileMoselly: collection({
      label: 'Émile Moselly',
      path: `${pathPrefix}emileMoselly/*`,
      slugField: 'filename',
      format: { contentField: 'content' },
      schema: createLiterarySchema(),
    }),
    darknessMarkdoc: collection({
      label: 'Darkness (Markdoc)',
      path: `${pathPrefix}darkness/*`,
      slugField: 'filename',
      format: { contentField: 'content' },
      schema: createMarkdocLiterarySchema(),
    }),
    emileMosellyMarkdoc: collection({
      label: 'Émile Moselly (Markdoc)',
      path: `${pathPrefix}emileMoselly/*`,
      slugField: 'filename',
      format: { contentField: 'content' },
      schema: createMarkdocLiterarySchema(),
    }),
  },
  singletons: proseSingletons,
})
