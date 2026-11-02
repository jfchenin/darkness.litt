// scripts/normalize-content-filenames.ts
/**
 * Rename literary markdown files to <abbrlink>.md so Keystatic can save them.
 * Public URLs stay stable because the site already prefers abbrlink over the filename.
 *
 * Usage:
 *   pnpm exec tsx scripts/normalize-content-filenames.ts --collection darkness
 *   pnpm exec tsx scripts/normalize-content-filenames.ts --collection darkness --apply
 *   pnpm exec tsx scripts/normalize-content-filenames.ts --collection emileMoselly --apply
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { abbrlinkPattern } from '../shared/literary-fields.ts'

const COLLECTIONS = ['darkness', 'emileMoselly'] as const
type Collection = (typeof COLLECTIONS)[number]

const STEM_OK = /^[a-z0-9-]+$/

interface RenamePlan {
  collection: Collection
  fromName: string
  toName: string
  /** Path relative to src/content (submodule root). */
  fromRel: string
  toRel: string
}

function parseArgs(argv: string[]) {
  let collection: Collection | 'all' = 'all'
  let apply = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--apply') {
      apply = true
      continue
    }
    if (arg === '--dry-run') {
      apply = false
      continue
    }
    if (arg === '--collection') {
      const value = argv[++i]
      if (value !== 'darkness' && value !== 'emileMoselly' && value !== 'all') {
        throw new Error(`Invalid --collection ${value}. Use darkness | emileMoselly | all`)
      }
      collection = value
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return { collection, apply }
}

/** Reads abbrlink from YAML frontmatter without a full YAML parser. */
function readAbbrlink(filePath: string): string | null {
  const text = readFileSync(filePath, 'utf8')
  if (!text.startsWith('---')) {
    return null
  }
  const end = text.indexOf('\n---', 3)
  if (end === -1) {
    return null
  }
  const frontmatter = text.slice(4, end)
  const match = frontmatter.match(/^abbrlink:\s*(.*)$/m)
  if (!match) {
    return null
  }
  let value = match[1].trim()
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  return value
}

function planCollection(collection: Collection): RenamePlan[] {
  const dir = join('src/content', collection)
  const names = readdirSync(dir).filter(name => name.endsWith('.md'))
  const plans: RenamePlan[] = []
  const reserved = new Set(names)

  for (const fromName of names) {
    const stem = fromName.slice(0, -3)
    if (STEM_OK.test(stem)) {
      continue
    }

    const fromPath = join(dir, fromName)
    const abbrlink = readAbbrlink(fromPath)
    if (!abbrlink) {
      throw new Error(`${fromPath}: missing abbrlink; refuse rename`)
    }
    if (!abbrlinkPattern.test(abbrlink) || abbrlink.length === 0) {
      throw new Error(`${fromPath}: invalid abbrlink ${JSON.stringify(abbrlink)}`)
    }

    const toName = `${abbrlink}.md`
    if (fromName === toName) {
      continue
    }
    if (reserved.has(toName)) {
      throw new Error(`${fromPath}: target already exists: ${toName}`)
    }

    plans.push({
      collection,
      fromName,
      toName,
      fromRel: join(collection, fromName),
      toRel: join(collection, toName),
    })
    reserved.add(toName)
    reserved.delete(fromName)
  }

  return plans
}

function main() {
  const { collection, apply } = parseArgs(process.argv.slice(2))
  const collections: Collection[] = collection === 'all'
    ? [...COLLECTIONS]
    : [collection]

  const plans = collections.flatMap(planCollection)

  if (plans.length === 0) {
    console.log('Nothing to rename.')
    return
  }

  console.log(apply ? 'APPLY' : 'DRY-RUN')
  for (const plan of plans) {
    console.log(`  ${plan.collection}: ${plan.fromName} → ${plan.toName}`)
  }
  console.log(`${plans.length} rename(s)`)

  if (!apply) {
    return
  }

  const contentRoot = join(process.cwd(), 'src/content')
  for (const plan of plans) {
    execFileSync('git', ['mv', '--', plan.fromRel, plan.toRel], {
      cwd: contentRoot,
      stdio: 'inherit',
    })
  }

  console.log('Done. Commit inside src/content and push origin main.')
}

try {
  main()
}
catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
