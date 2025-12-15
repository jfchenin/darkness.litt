import { base, moreLocales } from '@/config'
import { getLangFromPath } from '@/i18n/lang'
import { getLocalizedPath } from '@/i18n/path'

// Determine if the path matches a specific page type
function matchPageType(path: string, prefix: string = '') {
  // Remove base path if configured
  const pathWithoutBase = base && path.startsWith(base)
    ? path.slice(base.length)
    : path

  // Remove leading and trailing slashes from the path
  const normalizedPath = pathWithoutBase.replace(/^\/|\/$/g, '')

  // Homepage check: matches root path ('') or language code ('en', 'zh-tw')
  if (prefix === '') {
    return normalizedPath === '' || (moreLocales as readonly string[]).includes(normalizedPath)
  }

  // Ensure strict segment boundary matching to prevent partial matches
  const startsWithSegment = (target: string, segment: string) =>
    target === segment || target.startsWith(`${segment}/`)

  // Match both default language paths and localized paths
  return startsWithSegment(normalizedPath, prefix)
    || moreLocales.some(lang => startsWithSegment(normalizedPath, `${lang}/${prefix}`))
}

export function isHomePage(path: string) {
  return matchPageType(path)
}

// export function isPostPage(path: string) {
//   return matchPageType(path, 'posts')
// }

export function isTagPage(path: string) {
  return matchPageType(path, 'tags')
}

export function isDarknessPage(path: string) {
  return matchPageType(path, 'darkness')
}

export function isEmileMosellyPage(path: string) {
  return matchPageType(path, 'emile-moselly')
}

export function isDarknessTagPage(path: string) {
  return matchPageType(path, 'darkness-tags')
}

export function isEmileMosellyTagPage(path: string) {
  return matchPageType(path, 'emile-moselly-tags')
}

export function isAboutPage(path: string) {
  return matchPageType(path, 'about')
}

export function isBlogRollPage(path: string) {
  return matchPageType(path, 'blogroll')
}

export function isContactPage(path: string) {
  return matchPageType(path, 'contact')
}

export function isLegalNoticesPage(path: string) {
  return matchPageType(path, 'legalNotices')
}

export function isPrivacyPolicyPage(path: string) {
  return matchPageType(path, 'privacyPolicy')
}

// Returns page context with language, page types and localization helper
export function getPageInfo(path: string) {
  const currentLang = getLangFromPath(path)
  const isHome = isHomePage(path)
  // const isPost = isPostPage(path)
  const isTag = isTagPage(path)
  const isDarkness = isDarknessPage(path)
  const isEmileMoselly = isEmileMosellyPage(path)
  const isDarknessTag = isDarknessTagPage(path)
  const isEmileMosellyTag = isEmileMosellyTagPage(path)
  const isAbout = isAboutPage(path)
  const isBlogRoll = isBlogRollPage(path)
  const isContact = isContactPage(path)
  const isLegalNotices = isLegalNoticesPage(path)
  const isPrivacyPolicy = isPrivacyPolicyPage(path)

  return {
    currentLang,
    isHome,
    isDarkness,
    isEmileMoselly,
    isDarknessTag,
    isEmileMosellyTag,
    // isPost,
    isTag,
    isAbout,
    isBlogRoll,
    isContact,
    isLegalNotices,
    isPrivacyPolicy,
    getLocalizedPath: (targetPath: string) =>
      getLocalizedPath(targetPath, currentLang),
  }
}
