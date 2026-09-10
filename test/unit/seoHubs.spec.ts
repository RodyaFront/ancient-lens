import { describe, expect, it } from 'vitest'
import {
  findHeroBySlug,
  heroSlug,
  listHeroesSorted,
  type HeroEntry,
} from '../../shared/match'
import { SEO_STATIC_DOCUMENT_PATHS } from '../../shared/seo/staticRoutes'
import { isKnownSpaShellPath } from '../../workers/match-seo.js'

describe('heroSlug', () => {
  it('builds slug from npc_dota_hero name', () => {
    expect(
      heroSlug({
        name: 'npc_dota_hero_queen_of_pain',
        localized_name: 'Queen of Pain',
      }),
    ).toBe('queen-of-pain')
  })

  it('finds hero by slug', () => {
    const heroes: Record<string, HeroEntry> = {
      '1': {
        id: 1,
        name: 'npc_dota_hero_antimage',
        localized_name: 'Anti-Mage',
      },
    }
    expect(findHeroBySlug(heroes, 'antimage')?.id).toBe(1)
    expect(listHeroesSorted(heroes)).toHaveLength(1)
  })
})

describe('SEO static paths', () => {
  it('allowlists hub documents in the Worker', () => {
    for (const path of SEO_STATIC_DOCUMENT_PATHS) {
      expect(isKnownSpaShellPath(path)).toBe(true)
    }
    expect(isKnownSpaShellPath('/heroes/antimage')).toBe(true)
    expect(isKnownSpaShellPath('/uk/heroes/queen-of-pain')).toBe(true)
    expect(isKnownSpaShellPath('/nope')).toBe(false)
  })
})
