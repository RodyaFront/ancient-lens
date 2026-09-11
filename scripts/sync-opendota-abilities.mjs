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
  const talent = isTalentName(name)

  return {
    id,
    name,
    ...(dname ? { dname } : {}),
    ...(img ? { img } : {}),
    ...(talent ? { isTalent: true } : {}),
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
