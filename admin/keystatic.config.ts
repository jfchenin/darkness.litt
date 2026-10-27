// admin/keystatic.config.ts
import { config } from '@keystatic/core'

const isGithubStorage = import.meta.env.KEYSTATIC_STORAGE === 'github'

// Local mode reads and writes relative to the process cwd (admin/), so dev never touches the content submodule.
// TODO: Keystatic 0.5 has no `local.projectRoot` option; point future collection paths at `fixtures/` for local dev.
export default config({
  storage: isGithubStorage
    ? { kind: 'github', repo: 'jfchenin/darkness.litt-content' }
    : { kind: 'local' },
  collections: {},
})
