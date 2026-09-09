/**
 * Fetch OpenDota item constants and write a trimmed dictionary to public/data/items.json.
 * Usage: node scripts/sync-opendota-items.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'data', 'items.json')
const URL = 'https://api.opendota.com/api/constants/items'

function asStringArray(value) {
  if (value == null || value === false || value === '') {
    return undefined
  }
  if (Array.isArray(value)) {
    const list = value.map(String).filter((part) => part.trim().length > 0)
    return list.length ? list : undefined
  }
  return [String(value)]
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
      const value =
        row.value === undefined || row.value === null
          ? undefined
          : String(row.value)
      const display = typeof row.display === 'string' ? row.display : undefined
      if (!key && !value && !display) {
        return null
      }
      return {
        ...(key ? { key } : {}),
        ...(value !== undefined ? { value } : {}),
        ...(display ? { display } : {}),
      }
    })
    .filter(Boolean)
  return attrib.length ? attrib : undefined
}

function normalizeAbilities(list) {
  if (!Array.isArray(list)) {
    return undefined
  }
  const abilities = list
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null
      }
      const type = typeof row.type === 'string' ? row.type : undefined
      const title = typeof row.title === 'string' ? row.title : undefined
      const description =
        typeof row.description === 'string' ? row.description : undefined
      if (!type && !title && !description) {
        return null
      }
      return {
        ...(type ? { type } : {}),
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
      }
    })
    .filter(Boolean)
  return abilities.length ? abilities : undefined
}

function normalizeComponents(list) {
  if (!Array.isArray(list)) {
    return undefined
  }
  const components = list.map(String).filter((part) => part.trim().length > 0)
  return components.length ? components : undefined
}

function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'number') {
    return null
  }
  const mc =
    raw.mc === false || raw.mc === null || raw.mc === undefined
      ? undefined
      : Number(raw.mc)
  const cd =
    raw.cd === false || raw.cd === null || raw.cd === undefined
      ? undefined
      : Number(raw.cd)
  const notes =
    typeof raw.notes === 'string' && raw.notes.trim()
      ? raw.notes.trim()
      : undefined
  const lore =
    typeof raw.lore === 'string' && raw.lore.trim()
      ? raw.lore.trim()
      : undefined
  const hint = asStringArray(raw.hint)

  return {
    id: raw.id,
    ...(typeof raw.dname === 'string' ? { dname: raw.dname } : {}),
    ...(typeof raw.img === 'string' ? { img: raw.img } : {}),
    ...(typeof raw.cost === 'number' ? { cost: raw.cost } : {}),
    ...(typeof raw.tier === 'number' &&
    Number.isInteger(raw.tier) &&
    raw.tier >= 1 &&
    raw.tier <= 5
      ? { tier: raw.tier }
      : {}),
    ...(asStringArray(raw.behavior)
      ? { behavior: asStringArray(raw.behavior) }
      : {}),
    ...(typeof raw.target_team === 'string'
      ? { target_team: raw.target_team }
      : {}),
    ...(typeof raw.target_type === 'string'
      ? { target_type: raw.target_type }
      : {}),
    ...(normalizeAttrib(raw.attrib)
      ? { attrib: normalizeAttrib(raw.attrib) }
      : {}),
    ...(normalizeAbilities(raw.abilities)
      ? { abilities: normalizeAbilities(raw.abilities) }
      : {}),
    ...(Number.isFinite(mc) ? { mc } : {}),
    ...(Number.isFinite(cd) ? { cd } : {}),
    ...(lore ? { lore } : {}),
    ...(notes ? { notes } : {}),
    ...(hint ? { hint } : {}),
    ...(normalizeComponents(raw.components)
      ? { components: normalizeComponents(raw.components) }
      : {}),
  }
}

const response = await fetch(URL)
if (!response.ok) {
  throw new Error(`OpenDota constants/items failed: ${response.status}`)
}
const payload = await response.json()
const out = {}
for (const [slug, raw] of Object.entries(payload)) {
  const item = normalizeItem(raw)
  if (item) {
    out[slug] = item
  }
}

writeFileSync(OUT, `${JSON.stringify(out)}\n`, 'utf8')
console.log(`Wrote ${Object.keys(out).length} items → ${OUT}`)
