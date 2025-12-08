import type { Language } from '@/i18n/config'

interface Translation {
  title: string
  subtitle: string
  description: string
  posts: string
  tags: string
  about: string
  toc: string
}

export const ui: Record<Language, Translation> = {
  fr: {
    title: 'Retypographie',
    subtitle: 'Raviver la beauté de la typographie',
    description: 'Retypeset est un thème de blog statique basé sur le framework Astro, connu en français sous le nom de "Retypographie". Ce thème, inspiré par la typographie traditionnelle, établit une nouvelle norme visuelle et réorganise toutes les pages pour créer une expérience de lecture semblable à celle des livres imprimés, ravivant ainsi la beauté de la mise en page. Chaque élément est soigné dans les moindres détails, l\'élégance se manifeste dans les plus petits espaces.',
    posts: 'Articles',
    tags: 'Étiquettes',
    about: 'À propos',
    toc: 'Table des matières',
  },
}
