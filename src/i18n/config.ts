// Global Language Map
export const langMap = {
  fr: ['fr-FR'],
} as const

// Supported Languages
export type Language = keyof typeof langMap
// Giscus Language Map
// https://giscus.app/
export const giscusLocaleMap: Record<Language, string> = {
  fr: 'fr',
}

// Twikoo Language Map
// https://github.com/twikoojs/twikoo/blob/main/src/client/utils/i18n/index.js
export const twikooLocaleMap: Record<Language, string> = {
  fr: 'fr',
}

// Waline Language Map
// https://waline.js.org/en/guide/features/i18n.html
export const walineLocaleMap: Record<Language, string> = {
  fr: 'fr-FR',
}
