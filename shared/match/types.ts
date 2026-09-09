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
}

export interface ItemEntry {
  id: number
  dname?: string
  img?: string
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

export type ScoreboardView = 'overview' | 'economy' | 'combat'
export type TeamFilter = 'all' | 'radiant' | 'dire'
export type PlayerSort = 'slot' | 'kills' | 'net_worth' | 'hero_damage' | 'kda'
export type MatchLoadPhase = 'idle' | 'resolve' | 'fetch' | 'build'

export type MatchDialogState =
  | { kind: 'sources' }
  | { kind: 'saved' }
  | { kind: 'player'; index: number }
  | { kind: 'item'; id: number }
  | null
