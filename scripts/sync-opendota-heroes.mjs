/**
 * Fetch OpenDota hero constants and write a trimmed dictionary to public/data/heroes.json.
 * Usage: node scripts/sync-opendota-heroes.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'data', 'heroes.json')
const URL = 'https://api.opendota.com/api/constants/heroes'

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return undefined
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return undefined
  }
  const list = value.map(String).filter((part) => part.trim().length > 0)
  return list.length ? list : undefined
}

function normalizeHero(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'number') {
    return null
  }
  if (typeof raw.name !== 'string' || typeof raw.localized_name !== 'string') {
    return null
  }

  const roles = asStringArray(raw.roles)
  const primary =
    typeof raw.primary_attr === 'string' && raw.primary_attr.trim()
      ? raw.primary_attr.trim()
      : undefined
  const attackType =
    typeof raw.attack_type === 'string' && raw.attack_type.trim()
      ? raw.attack_type.trim()
      : undefined

  return {
    id: raw.id,
    name: raw.name,
    localized_name: raw.localized_name,
    ...(typeof raw.img === 'string' ? { img: raw.img } : {}),
    ...(typeof raw.icon === 'string' ? { icon: raw.icon } : {}),
    ...(primary ? { primary_attr: primary } : {}),
    ...(attackType ? { attack_type: attackType } : {}),
    ...(roles ? { roles } : {}),
    ...(asNumber(raw.base_str) !== undefined
      ? { base_str: asNumber(raw.base_str) }
      : {}),
    ...(asNumber(raw.base_agi) !== undefined
      ? { base_agi: asNumber(raw.base_agi) }
      : {}),
    ...(asNumber(raw.base_int) !== undefined
      ? { base_int: asNumber(raw.base_int) }
      : {}),
    ...(asNumber(raw.str_gain) !== undefined
      ? { str_gain: asNumber(raw.str_gain) }
      : {}),
    ...(asNumber(raw.agi_gain) !== undefined
      ? { agi_gain: asNumber(raw.agi_gain) }
      : {}),
    ...(asNumber(raw.int_gain) !== undefined
      ? { int_gain: asNumber(raw.int_gain) }
      : {}),
    ...(asNumber(raw.move_speed) !== undefined
      ? { move_speed: asNumber(raw.move_speed) }
      : {}),
    ...(asNumber(raw.base_armor) !== undefined
      ? { base_armor: asNumber(raw.base_armor) }
      : {}),
    ...(asNumber(raw.base_health) !== undefined
      ? { base_health: asNumber(raw.base_health) }
      : {}),
    ...(asNumber(raw.base_health_regen) !== undefined
      ? { base_health_regen: asNumber(raw.base_health_regen) }
      : {}),
    ...(asNumber(raw.base_mana) !== undefined
      ? { base_mana: asNumber(raw.base_mana) }
      : {}),
    ...(asNumber(raw.base_mana_regen) !== undefined
      ? { base_mana_regen: asNumber(raw.base_mana_regen) }
      : {}),
    ...(asNumber(raw.base_attack_min) !== undefined
      ? { base_attack_min: asNumber(raw.base_attack_min) }
      : {}),
    ...(asNumber(raw.base_attack_max) !== undefined
      ? { base_attack_max: asNumber(raw.base_attack_max) }
      : {}),
    ...(asNumber(raw.attack_rate) !== undefined
      ? { attack_rate: asNumber(raw.attack_rate) }
      : {}),
    ...(asNumber(raw.attack_range) !== undefined
      ? { attack_range: asNumber(raw.attack_range) }
      : {}),
    ...(asNumber(raw.base_mr) !== undefined
      ? { base_mr: asNumber(raw.base_mr) }
      : {}),
  }
}

const response = await fetch(URL)
if (!response.ok) {
  throw new Error(`OpenDota constants/heroes failed: ${response.status}`)
}
const payload = await response.json()
const out = {}
for (const [key, raw] of Object.entries(payload)) {
  const hero = normalizeHero(raw)
  if (hero) {
    // Prefer numeric id keys (match store looks up String(id)).
    out[String(hero.id)] = hero
  } else if (key) {
    // keep shape stable if normalize fails
  }
}

writeFileSync(OUT, `${JSON.stringify(out)}\n`, 'utf8')
console.log(`Wrote ${Object.keys(out).length} heroes → ${OUT}`)
