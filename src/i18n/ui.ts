import type { Language } from '@/i18n/config'

interface Translation {
  title: string
  subtitle: string
  description: string
  home: string
  darkness: string
  emileMoselly: string
  // posts: string
  // darknessTags: string
  // emileMosellyTags: string
  tags: string
  about: string
  blogRoll: string
  contact: string
  legalNotices: string
  privacyPolicy: string
  toc: string
  footnotes: string
}

export const ui: Record<Language, Translation> = {
  fr: {
    title: 'Darkness',
    subtitle: 'La nuit au coin d\'une table',
    description: '...',
    home: 'Accueil',
    darkness: 'Darkness',
    emileMoselly: 'Emile Moselly',
    // posts: 'Articles',
    // darknessTags: 'Étiquettes de Darkness',
    // emileMosellyTags: 'Étiquettes de Emile Moselly',
    tags: 'Catégories',
    about: 'À propos',
    blogRoll: 'Ressources',
    contact: 'Contact',
    legalNotices: 'Mentions légales',
    privacyPolicy: 'Politique de confidentialité',
    toc: 'Table des matières',
    footnotes: 'Notes de bas de page',
  },
}
