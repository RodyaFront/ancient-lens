export const EXAMPLE_MATCH_ID = '8961419173'
export const OPENDOTA_API = 'https://api.opendota.com/api'
export const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com'

/** OpenDota item ids used for Aghanim tip encyclopedia. */
export const ITEM_ID_ULTIMATE_SCEPTER = 108
export const ITEM_ID_AGHANIMS_SHARD = 609
export const SAVED_MATCHES_KEY = 'ancient-lens-saved'
export const RECENT_MATCHES_KEY = 'ancient-lens-recent'
export const MATCH_FETCH_TIMEOUT_MS = 25_000
export const MAX_SAVED_MATCHES = 50
export const MAX_RECENT_MATCHES = 8

export const GAME_MODES: Record<number, string> = {
  1: 'All Pick',
  2: 'Captain’s Mode',
  3: 'Random Draft',
  4: 'Single Draft',
  5: 'All Random',
  12: 'Least Played',
  16: 'Captain’s Draft',
  18: 'Ability Draft',
  22: 'All Pick',
  23: 'Turbo',
  24: 'Mutation',
}

export const REGIONS: Record<number, string> = {
  1: 'US West',
  2: 'US East',
  3: 'Europe West',
  5: 'Southeast Asia',
  6: 'Dubai',
  7: 'Australia',
  8: 'Stockholm',
  9: 'Russia',
  10: 'South America',
  11: 'South Africa',
  12: 'China',
  13: 'China',
  14: 'Chile',
  15: 'Peru',
  16: 'India',
  17: 'China',
  18: 'China',
  19: 'Japan',
  20: 'China',
  25: 'Europe East',
}

export const LOBBY_LABELS: Record<number, string> = {
  0: 'Unranked',
  1: 'Practice',
  2: 'Tournament',
  7: 'Ranked',
}
