// shared/literary-fields.ts
export const literaryFieldNames = [
  'title',
  'author',
  'published',
  'description',
  'updated',
  'tags',
  'draft',
  'pin',
  'toc',
  'lang',
  'abbrlink',
] as const

export const abbrlinkPattern = /^[a-z0-9-]*$/

export const defaultAuthor = 'JFChenin'

export const proseEntries = [
  { collection: 'about', path: 'about/A propos' },
  { collection: 'blogroll', path: 'blogroll/blogroll-fr' },
  { collection: 'legalNotices', path: 'legalNotices/fr' },
  { collection: 'privacyPolicy', path: 'privacyPolicy/fr' },
] as const
