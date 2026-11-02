// admin/keystatic.config.ts
import { collection, config, fields, singleton } from '@keystatic/core'
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
const createLanguageField = () =>
  fields.select({
    label: 'Langue',
    options: [
      { label: 'Universel', value: '' },
      { label: 'fr', value: 'fr' },
    ],
    defaultValue: '',
  })

// Creates the schema shared by the two literary collections.
const createLiterarySchema = () => ({
  title: fields.slug({
    name: {
      label: 'Titre',
      validation: { isRequired: true },
    },
    slug: {
      label: 'Nom de fichier',
      description:
        'URL publique = abbrlink si renseigné, sinon ce nom. Nouveaux fichiers: a-z 0-9 tirets uniquement.',
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
    description: 'Slug public optionnel',
    validation: {
      pattern: {
        regex: abbrlinkPattern,
        message: 'a-z, 0-9 et tirets uniquement',
      },
    },
  }),
  content: fields.text({
    label: 'Corps',
    multiline: true,
  }),
})

const proseSingletons = Object.fromEntries(
  proseEntries.map(entry => [
    entry.collection,
    singleton({
      label: proseLabels[entry.collection],
      path: `${pathPrefix}${entry.path}`,
      format: { contentField: 'content' },
      schema: {
        lang: createLanguageField(),
        content: fields.text({
          label: 'Corps',
          multiline: true,
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
      slugField: 'title',
      format: { contentField: 'content' },
      schema: createLiterarySchema(),
    }),
    emileMoselly: collection({
      label: 'Émile Moselly',
      path: `${pathPrefix}emileMoselly/*`,
      slugField: 'title',
      format: { contentField: 'content' },
      schema: createLiterarySchema(),
    }),
  },
  singletons: proseSingletons,
})
