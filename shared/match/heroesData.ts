import type { HeroEntry } from './types'
import heroesJson from '../../public/data/heroes.json'

/** Static hero dictionary (synced to public/data/heroes.json). */
export const HEROES_BY_ID = heroesJson as Record<string, HeroEntry>
