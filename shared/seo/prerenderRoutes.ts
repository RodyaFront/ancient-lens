import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SEO_STATIC_DOCUMENT_PATHS } from './staticRoutes'

type HeroJsonEntry = {
  id: number
  name: string
  localized_name: string
}

function heroSlug(entry: HeroJsonEntry): string {
  const raw = entry.name?.trim() || ''
  const fromName = /^npc_dota_hero_(.+)$/i.exec(raw)?.[1]
  const base = (fromName || entry.localized_name || 'hero')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'hero'
}

export function loadHeroEntries(): HeroJsonEntry[] {
  const raw = readFileSync(
    join(process.cwd(), 'public/data/heroes.json'),
    'utf8',
  )
  const map = JSON.parse(raw) as Record<string, HeroJsonEntry>
  return Object.values(map).sort((a, b) =>
    a.localized_name.localeCompare(b.localized_name, 'en'),
  )
}

/** All document paths that should be prerendered (EN + UK + heroes). */
export function buildPrerenderRoutes(): string[] {
  const heroPaths = loadHeroEntries().flatMap((entry) => {
    const slug = heroSlug(entry)
    return [`/heroes/${slug}`, `/uk/heroes/${slug}`]
  })
  return [...SEO_STATIC_DOCUMENT_PATHS, ...heroPaths]
}

export { heroSlug as prerenderHeroSlug }
