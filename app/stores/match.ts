import {
  EXAMPLE_MATCH_ID,
  MATCH_FETCH_TIMEOUT_MS,
  MAX_RECENT_MATCHES,
  MAX_SAVED_MATCHES,
  OPENDOTA_API,
  RECENT_MATCHES_KEY,
  SAVED_MATCHES_KEY,
} from '#shared/match/constants'
import { buildHeroProfile } from '#shared/match/heroCatalog'
import { parseMatchId, ParseMatchIdError } from '#shared/match/parseMatchId'
import { upsertRecentMatch } from '#shared/match/recent'
import {
  refreshSavedMatchMeta,
  sanitizeRecentMatches,
  sanitizeSavedMatches,
  upsertSavedMatch,
} from '#shared/match/localLists'
import { radiant, validateMatch, ValidateMatchError } from '#shared/match/stats'
import type {
  AbilityEntry,
  HeroEntry,
  ItemEntry,
  MatchData,
  MatchPlayer,
  MatchSource,
  PlayerSort,
  RecentMatch,
  SavedMatch,
  ScoreboardView,
  SnapshotMeta,
  TeamFilter,
  MatchLoadPhase,
} from '#shared/match/types'

class HttpError extends Error {
  status?: number
  retry?: string | null

  constructor(message: string, status?: number, retry?: string | null) {
    super(message)
    this.status = status
    this.retry = retry
  }
}

export const useMatchStore = defineStore('match', () => {
  const match = ref<MatchData | null>(null)
  const source = ref<MatchSource | null>(null)
  /** Additive scoreboard column groups (not exclusive tabs). */
  const columnSets = ref<Record<ScoreboardView, boolean>>({
    overview: true,
    economy: false,
    combat: false,
  })
  const filter = ref<TeamFilter>('all')
  const sort = ref<PlayerSort>('slot')
  const loading = ref(false)
  const loadPhase = ref<MatchLoadPhase>('idle')
  const error = ref<{
    title: string
    body: string
    id: string | null
    actions: boolean
  } | null>(null)
  const toast = ref('')
  const lastInput = ref('')
  const inputInvalid = ref(false)
  const heroes = ref<Record<string, HeroEntry>>({})
  const items = ref<Record<string, ItemEntry>>({})
  const abilities = ref<Record<string, AbilityEntry>>({})
  const snapshotMeta = ref<SnapshotMeta | null>(null)
  const saved = ref<SavedMatch[]>([])
  const recent = ref<RecentMatch[]>([])
  const requestNo = ref(0)
  const revealNonce = ref(0)
  const revealWithSound = ref(false)
  let controller: AbortController | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  let buildPhaseTimer: ReturnType<typeof setTimeout> | null = null

  const BUILD_PHASE_AFTER_MS = 400

  const itemMap = computed(() => {
    const map: Record<number, ItemEntry> = {}
    for (const item of Object.values(items.value)) {
      map[item.id] = item
    }
    return map
  })

  const abilityMap = computed(() => {
    const map: Record<number, AbilityEntry> = {}
    for (const ability of Object.values(abilities.value)) {
      map[ability.id] = ability
    }
    return map
  })

  const radiantPlayers = computed(
    () => match.value?.players.filter(radiant) ?? [],
  )
  const direPlayers = computed(
    () => match.value?.players.filter((player) => !radiant(player)) ?? [],
  )
  const isSaved = computed(() =>
    Boolean(
      match.value &&
      saved.value.some(
        (entry) => String(entry.id) === String(match.value?.match_id),
      ),
    ),
  )

  function showToast(text: string) {
    toast.value = text
    if (toastTimer) {
      clearTimeout(toastTimer)
    }
    toastTimer = setTimeout(() => {
      toast.value = ''
    }, 3000)
  }

  function loadSaved() {
    if (!import.meta.client) {
      return
    }

    try {
      const parsed = JSON.parse(
        localStorage.getItem(SAVED_MATCHES_KEY) || '[]',
      ) as unknown
      saved.value = sanitizeSavedMatches(parsed, MAX_SAVED_MATCHES)
    } catch {
      saved.value = []
    }
  }

  function persistSaved(next: SavedMatch[]) {
    localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(next))
    saved.value = next
  }

  function loadRecent() {
    if (!import.meta.client) {
      return
    }

    try {
      const parsed = JSON.parse(
        localStorage.getItem(RECENT_MATCHES_KEY) || '[]',
      ) as unknown
      recent.value = sanitizeRecentMatches(parsed, MAX_RECENT_MATCHES)
    } catch {
      recent.value = []
    }
  }

  function persistRecent(next: RecentMatch[]) {
    localStorage.setItem(RECENT_MATCHES_KEY, JSON.stringify(next))
    recent.value = next
  }

  function hydrateLocalLists() {
    loadSaved()
    loadRecent()
  }

  if (import.meta.client) {
    window.addEventListener('storage', (event) => {
      if (event.key === SAVED_MATCHES_KEY) {
        loadSaved()
      } else if (event.key === RECENT_MATCHES_KEY) {
        loadRecent()
      }
    })
  }

  function rememberRecent(data: MatchData) {
    if (!import.meta.client) {
      return
    }

    const entry: RecentMatch = {
      id: String(data.match_id),
      radiant_win: data.radiant_win,
      duration: data.duration,
      openedAt: Date.now(),
    }

    try {
      persistRecent(upsertRecentMatch(recent.value, entry, MAX_RECENT_MATCHES))
    } catch {
      // Ignore quota / private-mode write failures.
    }
  }

  function refreshSavedFromMatch(data: MatchData) {
    if (!import.meta.client) {
      return
    }

    const next = refreshSavedMatchMeta(saved.value, String(data.match_id), {
      radiant_win: data.radiant_win,
      duration: data.duration,
      start_time: data.start_time,
    })
    if (!next) {
      return
    }

    try {
      persistSaved(next)
    } catch {
      // Ignore quota / private-mode write failures.
    }
  }

  function t(key: string, params?: Record<string, unknown>) {
    return useNuxtApp().$i18n.t(key, params ?? {}) as string
  }

  function removeRecent(id: string) {
    const target = String(id)
    try {
      persistRecent(recent.value.filter((entry) => String(entry.id) !== target))
    } catch {
      showToast(t('errors.recentUpdateFailed'))
    }
  }

  function heroById(id: number | undefined) {
    return id == null ? undefined : heroes.value[String(id)]
  }

  function itemById(id: number | undefined) {
    return id == null ? undefined : itemMap.value[id]
  }

  function abilityById(id: number | undefined) {
    return id == null ? undefined : abilityMap.value[id]
  }

  function heroName(player: MatchPlayer) {
    return (
      heroById(player.hero_id)?.localized_name ||
      t('format.heroFallback', { id: player.hero_id ?? '?' })
    )
  }

  function heroProfile(id: number | undefined, matchLevel?: number | null) {
    const entry = heroById(id)
    if (!entry) {
      return null
    }
    const { metaById, snapshot } = useHeroMeta()
    const meta = metaById(id)
    return buildHeroProfile(entry, meta, matchLevel, snapshot.value?.byId)
  }

  function prepareHome() {
    hydrateLocalLists()
    match.value = null
    source.value = null
    error.value = null
    setLoading(false)
    inputInvalid.value = false
    resetColumnSets()
    filter.value = 'all'
    sort.value = 'slot'
  }

  function matchPath(id: string) {
    return useLocalePath()({ name: 'match-id', params: { id } })
  }

  function isCurrentMatchRoute(id: string, snapshot = false) {
    const route = useRoute()
    return (
      route.path === matchPath(id) &&
      (route.query.snapshot === '1') === snapshot
    )
  }

  async function openMatchInput(
    input: string,
    options: { snapshot?: boolean } = {},
  ) {
    // User gesture: unlock so reveal whoosh can play after the async fetch.
    useScoreAudio().unlock()
    inputInvalid.value = false
    error.value = null
    try {
      const id = parseMatchId(input)
      lastInput.value = id
      const snapshot = Boolean(options.snapshot)
      beginLoad('resolve')
      if (isCurrentMatchRoute(id, snapshot)) {
        await bootstrapFromRoute(id, snapshot)
        return
      }
      await navigateTo({
        path: matchPath(id),
        query: snapshot ? { snapshot: '1' } : {},
      })
    } catch (errorValue) {
      setLoading(false)
      inputInvalid.value = true
      const message =
        errorValue instanceof ParseMatchIdError
          ? t(`parse.${errorValue.code}`)
          : t('errors.invalidBody')
      showError(t('errors.invalidTitle'), message, null, false)
    }
  }

  function openExampleMatch() {
    useScoreAudio().unlock()
    lastInput.value = EXAMPLE_MATCH_ID
    inputInvalid.value = false
    error.value = null
    if (isCurrentMatchRoute(EXAMPLE_MATCH_ID, true)) {
      return bootstrapFromRoute(EXAMPLE_MATCH_ID, true)
    }
    return navigateTo({
      path: matchPath(EXAMPLE_MATCH_ID),
      query: { snapshot: '1' },
    })
  }

  function showError(
    title: string,
    body: string,
    id: string | null,
    actions = true,
  ) {
    error.value = { title, body, id, actions }
  }

  function clearBuildPhaseTimer() {
    if (buildPhaseTimer) {
      clearTimeout(buildPhaseTimer)
      buildPhaseTimer = null
    }
  }

  function setLoading(value: boolean) {
    loading.value = value
    if (!value) {
      loadPhase.value = 'idle'
      clearBuildPhaseTimer()
    }
  }

  function beginLoad(phase: MatchLoadPhase) {
    loading.value = true
    loadPhase.value = phase
  }

  function scheduleBuildPhase(requestId: number) {
    clearBuildPhaseTimer()
    buildPhaseTimer = setTimeout(() => {
      if (requestNo.value === requestId && loading.value) {
        loadPhase.value = 'build'
      }
    }, BUILD_PHASE_AFTER_MS)
  }

  function cancelLoad() {
    if (controller) {
      controller.abort()
      return
    }
    requestNo.value += 1
    setLoading(false)
  }

  async function loadLookups() {
    const lookups = await Promise.allSettled(
      (['heroes', 'items', 'abilities', 'snapshot-meta'] as const).map(
        async (name) => {
          const response = await fetch(`/data/${name}.json`)
          if (!response.ok) {
            throw new Error(name)
          }
          return response.json()
        },
      ),
    )

    const [heroesLookup, itemsLookup, abilitiesLookup, metaLookup] = lookups

    if (heroesLookup?.status === 'fulfilled') {
      heroes.value = heroesLookup.value
    }
    if (itemsLookup?.status === 'fulfilled') {
      items.value = itemsLookup.value
    }
    if (abilitiesLookup?.status === 'fulfilled') {
      abilities.value = abilitiesLookup.value
    }
    if (metaLookup?.status === 'fulfilled') {
      snapshotMeta.value = metaLookup.value
    }
  }

  async function ensureLookups() {
    if (Object.keys(heroes.value).length) {
      return
    }
    await loadLookups()
  }

  async function loadMatch(input: string, options: { sound?: boolean } = {}) {
    if (options.sound) {
      useScoreAudio().unlock()
    }
    revealWithSound.value = Boolean(options.sound)
    let id: string
    try {
      id = parseMatchId(input)
    } catch (errorValue) {
      const message =
        errorValue instanceof ParseMatchIdError
          ? t(`parse.${errorValue.code}`)
          : t('errors.invalidBody')
      showError(t('errors.checkUrlTitle'), message, null, false)
      inputInvalid.value = true
      return
    }

    inputInvalid.value = false
    lastInput.value = id
    const no = ++requestNo.value
    controller?.abort()
    controller = new AbortController()
    const thisController = controller
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      thisController.abort()
    }, MATCH_FETCH_TIMEOUT_MS)
    error.value = null
    beginLoad('resolve')
    loadPhase.value = 'fetch'
    scheduleBuildPhase(no)

    try {
      const response = await fetch(`${OPENDOTA_API}/matches/${id}`, {
        signal: thisController.signal,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new HttpError(
          'HTTP',
          response.status,
          response.headers.get('Retry-After'),
        )
      }

      let data: unknown
      try {
        data = await response.json()
      } catch {
        throw new Error(t('errors.unreadable'))
      }

      if (data && typeof data === 'object' && 'error' in data) {
        const payload = data as { error?: unknown }
        const httpError = new HttpError(
          typeof payload.error === 'string'
            ? payload.error
            : t('errors.unavailable'),
          404,
        )
        throw httpError
      }

      if (no === requestNo.value) {
        loadPhase.value = 'build'
      }
      const next = validateMatch(data, id)
      if (no !== requestNo.value) {
        return
      }

      match.value = next
      source.value = {
        kind: 'live',
        label: t('score.sourceLiveLabel'),
        fetchedAt: new Date().toISOString(),
      }
      filter.value = 'all'
      revealNonce.value += 1
      rememberRecent(next)
      refreshSavedFromMatch(next)
    } catch (errorValue) {
      if (no !== requestNo.value) {
        return
      }

      const err = errorValue as HttpError
      if (err.name === 'AbortError' && !timedOut) {
        showToast(t('errors.cancelled'))
        return
      }

      let title = t('errors.fetchFailed')
      let body = t('errors.fetchFailedBody')

      if (timedOut) {
        title = t('errors.timeoutTitle')
        body = t('errors.timeoutBody')
      } else if (err.status === 429) {
        title = t('errors.rateLimitTitle')
        const retry = Number(err.retry)
        body = t('errors.rateLimitBody', {
          when:
            Number.isFinite(retry) && retry > 0
              ? t('errors.rateLimitSeconds', { n: retry })
              : t('errors.rateLimitSoon'),
        })
      } else if (err.status === 404) {
        title = t('errors.notFoundTitle')
        body = t('errors.notFoundBody')
      } else if (err.status === 403 || err.status === 401) {
        title = t('errors.rejectedTitle')
        body = t('errors.rejectedBody')
      } else if (err.status && err.status >= 500) {
        title = t('errors.tempTitle')
        body = t('errors.tempBody')
      } else if (errorValue instanceof ValidateMatchError) {
        body = t(`errors.validate.${errorValue.code}`)
      } else if (
        err.message !== 'Failed to fetch' &&
        err.message !== 'Load failed' &&
        err.message !== 'HTTP' &&
        err.name !== 'TypeError'
      ) {
        body = err.message
      }

      match.value = null
      source.value = null
      showError(`${title} · #${id}`, body, id)
    } finally {
      clearTimeout(timer)
      if (no === requestNo.value) {
        controller = null
        setLoading(false)
      }
    }
  }

  async function loadExample(options: { sound?: boolean } = {}) {
    if (options.sound) {
      useScoreAudio().unlock()
    }
    revealWithSound.value = Boolean(options.sound)
    const no = ++requestNo.value
    controller?.abort()
    controller = null
    beginLoad('resolve')
    loadPhase.value = 'fetch'
    scheduleBuildPhase(no)
    error.value = null
    inputInvalid.value = false
    lastInput.value = EXAMPLE_MATCH_ID

    try {
      const response = await fetch(`/data/match-${EXAMPLE_MATCH_ID}.json`)
      if (!response.ok) {
        throw new Error(t('errors.snapshotMissing'))
      }
      if (no === requestNo.value) {
        loadPhase.value = 'build'
      }
      const data = validateMatch(await response.json(), EXAMPLE_MATCH_ID)
      if (no !== requestNo.value) {
        return
      }
      match.value = data
      filter.value = 'all'
      source.value = {
        kind: 'example',
        label: t('score.sourceSnapshotLabel'),
        fetchedAt: snapshotMeta.value?.fetched_at || '2026-09-05T05:16:46Z',
      }
      revealNonce.value += 1
    } catch {
      if (no === requestNo.value) {
        match.value = null
        source.value = null
        showError(
          t('errors.exampleFailedTitle'),
          t('errors.exampleFailedBody'),
          EXAMPLE_MATCH_ID,
        )
      }
    } finally {
      if (no === requestNo.value) {
        setLoading(false)
      }
    }
  }

  function toggleSaved() {
    if (!match.value) {
      return
    }

    const id = String(match.value.match_id)
    const had = saved.value.some((entry) => String(entry.id) === id)
    if (had) {
      try {
        persistSaved(saved.value.filter((entry) => String(entry.id) !== id))
        showToast(t('toast.unsaved'))
      } catch {
        showToast(t('toast.saveBlocked'))
      }
      return
    }

    const entry: SavedMatch = {
      id,
      radiant_win: match.value.radiant_win,
      duration: match.value.duration,
      start_time: match.value.start_time,
    }
    const { next, evicted } = upsertSavedMatch(
      saved.value,
      entry,
      MAX_SAVED_MATCHES,
    )

    try {
      persistSaved(next)
      showToast(
        evicted
          ? t('toast.savedEvicted', { max: MAX_SAVED_MATCHES })
          : t('toast.saved'),
      )
    } catch {
      showToast(t('toast.saveBlocked'))
    }
  }

  function removeSaved(id: string) {
    const target = String(id)
    try {
      persistSaved(saved.value.filter((entry) => String(entry.id) !== target))
    } catch {
      showToast(t('toast.bookmarkBlocked'))
    }
  }

  function exportMatch() {
    if (!match.value || !source.value) {
      return
    }

    const blob = new Blob(
      [
        JSON.stringify(
          {
            source: {
              provider: 'OpenDota API',
              url: `${OPENDOTA_API}/matches/${match.value.match_id}`,
              retrieved_at: source.value.fetchedAt,
              mode: source.value.kind,
            },
            match: match.value,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `dota-match-${match.value.match_id}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    showToast(t('toast.jsonReady'))
  }

  async function bootstrapFromRoute(id: string, snapshot = false) {
    hydrateLocalLists()
    await loadLookups()
    lastInput.value = id
    if (snapshot && id === EXAMPLE_MATCH_ID) {
      await loadExample({ sound: true })
      return
    }
    await loadMatch(id, { sound: true })
  }

  function toggleColumnSet(id: ScoreboardView) {
    columnSets.value = {
      ...columnSets.value,
      [id]: !columnSets.value[id],
    }
  }

  function resetColumnSets() {
    columnSets.value = {
      overview: true,
      economy: false,
      combat: false,
    }
  }

  return {
    match,
    source,
    columnSets,
    toggleColumnSet,
    resetColumnSets,
    filter,
    sort,
    loading,
    loadPhase,
    error,
    toast,
    lastInput,
    inputInvalid,
    saved,
    recent,
    revealNonce,
    revealWithSound,
    radiantPlayers,
    direPlayers,
    isSaved,
    itemMap,
    snapshotMeta,
    heroById,
    itemById,
    abilityById,
    heroName,
    heroProfile,
    showToast,
    loadMatch,
    loadExample,
    cancelLoad,
    toggleSaved,
    removeSaved,
    removeRecent,
    loadSaved,
    hydrateLocalLists,
    exportMatch,
    prepareHome,
    ensureLookups,
    openMatchInput,
    openExampleMatch,
    bootstrapFromRoute,
  }
})
