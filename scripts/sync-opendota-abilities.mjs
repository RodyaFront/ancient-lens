/**
 * Fetch OpenDota ability constants and write a trimmed dictionary to public/data/abilities.json.
 * Joins constants/ability_ids (id -> name) with constants/abilities (name -> meta).
 * Usage: node scripts/sync-opendota-abilities.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'data', 'abilities.json')
const IDS_URL = 'https://api.opendota.com/api/constants/ability_ids'
const ABILITIES_URL = 'https://api.opendota.com/api/constants/abilities'

function isTalentName(name) {
  return name.startsWith('special_bonus_')
}

function asStringArray(value) {
  if (value == null || value === false || value === '') {
    return undefined
  }
  if (Array.isArray(value)) {
    const list = value.map(String).filter((part) => part.trim().length > 0)
    return list.length ? list : undefined
  }
  const text = String(value).trim()
  return text ? [text] : undefined
}

/** Scalar or per-level list as strings for UI. */
function asLevelValues(value) {
  if (value == null || value === false || value === '') {
    return undefined
  }
  if (Array.isArray(value)) {
    const list = value.map(String).filter((part) => part.trim().length > 0)
    return list.length ? list : undefined
  }
  const text = String(value).trim()
  return text ? [text] : undefined
}

function normalizeAttrib(list) {
  if (!Array.isArray(list)) {
    return undefined
  }
  const attrib = list
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null
      }
      const key = typeof row.key === 'string' ? row.key : undefined
      const header = typeof row.header === 'string' ? row.header.trim() : ''
      const values = asLevelValues(row.value)
      const generated = row.generated === true
      if (!header && !values) {
        return null
      }
      return {
        ...(key ? { key } : {}),
        ...(header ? { header } : {}),
        ...(values ? { value: values } : {}),
        ...(generated ? { generated: true } : {}),
      }
    })
    .filter(Boolean)
  return attrib.length ? attrib : undefined
}

/**
 * @param {unknown} raw
 * @param {number} id
 * @param {string} name
 */
function normalizeAbility(raw, id, name) {
  if (!raw || typeof raw !== 'object') {
    return {
      id,
      name,
      ...(isTalentName(name) ? { isTalent: true } : {}),
    }
  }

  const entry = /** @type {Record<string, unknown>} */ (raw)
  const dname = typeof entry.dname === 'string' ? entry.dname.trim() : ''
  const img = typeof entry.img === 'string' ? entry.img : undefined
  const desc = typeof entry.desc === 'string' ? entry.desc.trim() : ''
  const lore = typeof entry.lore === 'string' ? entry.lore.trim() : ''
  const dmgType =
    typeof entry.dmg_type === 'string' ? entry.dmg_type.trim() : ''
  const bkbpierce =
    typeof entry.bkbpierce === 'string' ? entry.bkbpierce.trim() : ''
  const dispellable =
    typeof entry.dispellable === 'string' ? entry.dispellable.trim() : ''
  const targetTeam =
    typeof entry.target_team === 'string' ? entry.target_team.trim() : ''
  const behavior = asStringArray(entry.behavior)
  const targetType = asStringArray(entry.target_type)
  const attrib = normalizeAttrib(entry.attrib)
  const mc = asLevelValues(entry.mc)
  const cd = asLevelValues(entry.cd)
  const talent = isTalentName(name)

  return {
    id,
    name,
    ...(dname ? { dname } : {}),
    ...(img ? { img } : {}),
    ...(talent ? { isTalent: true } : {}),
    ...(desc ? { desc } : {}),
    ...(lore ? { lore } : {}),
    ...(behavior ? { behavior } : {}),
    ...(dmgType ? { dmg_type: dmgType } : {}),
    ...(bkbpierce ? { bkbpierce } : {}),
    ...(dispellable ? { dispellable } : {}),
    ...(targetTeam ? { target_team: targetTeam } : {}),
    ...(targetType ? { target_type: targetType } : {}),
    ...(attrib ? { attrib } : {}),
    ...(mc ? { mc } : {}),
    ...(cd ? { cd } : {}),
  }
}

const [idsResponse, abilitiesResponse] = await Promise.all([
  fetch(IDS_URL),
  fetch(ABILITIES_URL),
])

if (!idsResponse.ok) {
  throw new Error(
    `OpenDota constants/ability_ids failed: ${idsResponse.status}`,
  )
}
if (!abilitiesResponse.ok) {
  throw new Error(
    `OpenDota constants/abilities failed: ${abilitiesResponse.status}`,
  )
}

const abilityIds = /** @type {Record<string, string>} */ (
  await idsResponse.json()
)
const abilities = /** @type {Record<string, unknown>} */ (
  await abilitiesResponse.json()
)

/** @type {Record<string, ReturnType<typeof normalizeAbility>>} */
const out = {}

for (const [idRaw, nameRaw] of Object.entries(abilityIds)) {
  const id = Number(idRaw)
  if (!Number.isInteger(id) || id < 0) {
    continue
  }
  if (typeof nameRaw !== 'string' || !nameRaw.trim()) {
    continue
  }
  const name = nameRaw.trim()
  out[String(id)] = normalizeAbility(abilities[name], id, name)
}

writeFileSync(OUT, `${JSON.stringify(out)}\n`, 'utf8')
console.log(`Wrote ${Object.keys(out).length} abilities → ${OUT}`)
