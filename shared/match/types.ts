export interface MatchPlayer {
  account_id?: number
  player_slot?: number
  team_number?: number
  isRadiant?: boolean
  hero_id?: number
  personaname?: string
  name?: string
  level?: number
  kills?: number
  deaths?: number
  assists?: number
  net_worth?: number
  gold_per_min?: number
  xp_per_min?: number
  last_hits?: number
  denies?: number
  hero_damage?: number
  tower_damage?: number
  hero_healing?: number
  item_0?: number
  item_1?: number
  item_2?: number
  item_3?: number
  item_4?: number
  item_5?: number
  item_neutral?: number
  item_neutral2?: number
  backpack_0?: number
  backpack_1?: number
  backpack_2?: number
  obs_placed?: number
  sen_placed?: number
  buyback_count?: number
  aghanims_scepter?: number
  aghanims_shard?: number
  party_id?: number
  party_size?: number
  /** Ability IDs in level-up order (index 0 = level 1). Talents included. */
  ability_upgrades_arr?: number[]
  [key: string]: unknown
}

export interface MatchTeam {
  name?: string
}

export interface MatchData {
  match_id: number | string
  radiant_win?: boolean
  duration?: number
  start_time?: number
  radiant_score?: number
  dire_score?: number
  game_mode?: number
  lobby_type?: number
  region?: number
  version?: number
  radiant_team?: MatchTeam
  dire_team?: MatchTeam
  players: MatchPlayer[]
  [key: string]: unknown
}

export interface HeroEntry {
  id: number
  name: string
  localized_name: string
  img?: string
  icon?: string
  /** OpenDota: `str` | `agi` | `int` | `all` (universal). */
  primary_attr?: string
  attack_type?: string
  roles?: string[]
  base_str?: number
  base_agi?: number
  base_int?: number
  str_gain?: number
  agi_gain?: number
  int_gain?: number
  move_speed?: number
  base_armor?: number
  base_health?: number
  base_health_regen?: number
  base_mana?: number
  base_mana_regen?: number
  base_attack_min?: number
  base_attack_max?: number
  /** OpenDota BAT / attack interval (seconds). Prefer over `base_attack_time`. */
  attack_rate?: number
  attack_range?: number
  /** Base magic resistance percent (typically 25). */
  base_mr?: number
}

/** Live pub meta from OpenDota `/heroStats` (not in static heroes.json). */
export interface HeroMetaEntry {
  id: number
  pub_pick: number
  pub_win: number
}

export interface HeroMetaSnapshot {
  fetched_at: string
  byId: Record<string, HeroMetaEntry>
}

/** UI-agnostic profile DTO for hover, dialog, draft, etc. */
export interface HeroProfile {
  id: number
  name: string
  img?: string
  icon?: string
  primaryAttr?: string
  /** i18n key suffix under `heroHover.attr.*` / `heroHover.primary.*`. */
  primaryAttrKey?: 'str' | 'agi' | 'int' | 'all'
  attackType: string | null
  attrs: {
    str: { base: number; gain: number }
    agi: { base: number; gain: number }
    int: { base: number; gain: number }
  } | null
  moveSpeed: number | null
  /** Derived armor at base stats (base_armor + agi * ARMOR_PER_AGI). */
  armor: number | null
  damage: { min: number; max: number } | null
  attackRate: number | null
  attackRange: number | null
  magicResist: number | null
  health: { value: number; regen: number } | null
  mana: { value: number; regen: number } | null
  /** Role tags only (attack type is separate). */
  roles: string[]
  matchLevel: number | null
  meta: {
    popularityRank: number | null
    winRate: number | null
    pubPick: number
    pubWin: number
  } | null
}

export interface ItemAttrib {
  key?: string
  value?: string
  display?: string
}

export interface ItemAbility {
  type?: string
  title?: string
  description?: string
}

export interface ItemEntry {
  id: number
  dname?: string
  img?: string
  cost?: number
  /** Neutral item tier (1–5) when present in OpenDota constants. */
  tier?: number
  behavior?: string[]
  target_team?: string
  target_type?: string
  attrib?: ItemAttrib[]
  abilities?: ItemAbility[]
  mc?: number
  /** Health cost when present (e.g. Soul Ring). */
  hc?: number
  cd?: number
  lore?: string
  notes?: string
  hint?: string[]
  components?: string[]
}

/** Static ability / talent dictionary (synced to public/data/abilities.json). */
export interface AbilityAttrib {
  key?: string
  header?: string
  /** One value, or one per ability level. */
  value?: string[]
  generated?: boolean
}

export interface AbilityEntry {
  id: number
  name: string
  dname?: string
  img?: string
  /** True when OpenDota name starts with `special_bonus_`. */
  isTalent?: boolean
  desc?: string
  lore?: string
  behavior?: string[]
  dmg_type?: string
  bkbpierce?: string
  dispellable?: string
  target_team?: string
  target_type?: string[]
  attrib?: AbilityAttrib[]
  mc?: string[]
  cd?: string[]
}

export interface SnapshotMeta {
  provider: string
  url: string
  fetched_at: string
  match_id: number
}

export interface SavedMatch {
  id: string
  radiant_win?: boolean
  duration?: number
  start_time?: number
}

export interface RecentMatch {
  id: string
  radiant_win?: boolean
  duration?: number
  openedAt: number
}

export type MatchSourceKind = 'live' | 'example'

export interface MatchSource {
  kind: MatchSourceKind
  label: string
  fetchedAt: string
}

export type ScoreboardView = 'overview' | 'economy' | 'combat' | 'skills'
export type TeamFilter = 'all' | 'radiant' | 'dire'
export type PlayerSort = 'slot' | 'kills' | 'net_worth' | 'hero_damage' | 'kda'
export type MatchLoadPhase = 'idle' | 'resolve' | 'fetch' | 'build'

export type MatchDialogState =
  { kind: 'sources' } | { kind: 'player'; index: number } | null
