import {
  OPENDOTA_API,
  buildHeroMetaSnapshot,
  type HeroMetaEntry,
  type HeroMetaSnapshot,
} from '#shared/match'

const META_STATE_KEY = 'ancient-lens-hero-meta'
const META_PENDING_KEY = 'ancient-lens-hero-meta-pending'
let metaLoad: Promise<HeroMetaSnapshot | null> | null = null

/**
 * Client-side OpenDota `/heroStats` cache (session lifetime).
 * Fail-soft: returns null when offline / API errors.
 */
export function useHeroMeta() {
  const snapshot = useState<HeroMetaSnapshot | null>(META_STATE_KEY, () => null)
  const pending = useState(META_PENDING_KEY, () => false)

  function metaById(id: number | undefined): HeroMetaEntry | undefined {
    if (id == null || !snapshot.value) {
      return undefined
    }
    return snapshot.value.byId[String(id)]
  }

  async function ensureHeroMeta(): Promise<HeroMetaSnapshot | null> {
    if (import.meta.server) {
      return null
    }
    if (snapshot.value) {
      pending.value = false
      return snapshot.value
    }
    if (metaLoad) {
      pending.value = true
      return metaLoad
    }
    pending.value = true
    metaLoad = fetch(`${OPENDOTA_API}/heroStats`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`heroStats ${response.status}`)
        }
        const rows = (await response.json()) as unknown[]
        if (!Array.isArray(rows)) {
          throw new Error('heroStats: expected array')
        }
        const next = buildHeroMetaSnapshot(rows)
        snapshot.value = next
        return next
      })
      .catch(() => {
        metaLoad = null
        return null
      })
      .finally(() => {
        pending.value = false
      })
    return metaLoad
  }

  return {
    snapshot,
    pending,
    metaById,
    ensureHeroMeta,
  }
}
