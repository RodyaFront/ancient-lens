import {
  EXAMPLE_MATCH_ID,
  MATCH_FETCH_TIMEOUT_MS,
  MAX_SAVED_MATCHES,
  OPENDOTA_API,
  SAVED_MATCHES_KEY,
} from '#shared/match/constants'
import { parseMatchId } from '#shared/match/parseMatchId'
import { radiant, validateMatch } from '#shared/match/stats'
import type {
  HeroEntry,
  ItemEntry,
  MatchData,
  MatchPlayer,
  MatchSource,
  PlayerSort,
  SavedMatch,
  ScoreboardView,
  SnapshotMeta,
  TeamFilter,
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
  const view = ref<ScoreboardView>('overview')
  const filter = ref<TeamFilter>('all')
  const sort = ref<PlayerSort>('slot')
  const loading = ref(false)
  const error = ref<{
    title: string
    body: string
    id: string | null
    actions: boolean
  } | null>(null)
  const toast = ref('')
  const lastInput = ref(EXAMPLE_MATCH_ID)
  const inputInvalid = ref(false)
  const heroes = ref<Record<string, HeroEntry>>({})
  const items = ref<Record<string, ItemEntry>>({})
  const snapshotMeta = ref<SnapshotMeta | null>(null)
  const saved = ref<SavedMatch[]>([])
  const requestNo = ref(0)
  const revealNonce = ref(0)
  const revealWithSound = ref(false)
  let controller: AbortController | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  const itemMap = computed(() => {
    const map: Record<number, ItemEntry> = {}
    for (const item of Object.values(items.value)) {
      map[item.id] = item
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
      saved.value.some((entry) => entry.id === String(match.value?.match_id)),
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
      if (Array.isArray(parsed)) {
        saved.value = parsed
          .filter(
            (entry): entry is SavedMatch =>
              Boolean(entry) &&
              typeof entry === 'object' &&
              /^\d{1,16}$/.test(String((entry as SavedMatch).id)),
          )
          .slice(0, MAX_SAVED_MATCHES)
      }
    } catch {
      saved.value = []
    }
  }

  function persistSaved(next: SavedMatch[]) {
    localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(next))
    saved.value = next
  }

  function heroById(id: number | undefined) {
    return id == null ? undefined : heroes.value[String(id)]
  }

  function itemById(id: number | undefined) {
    return id == null ? undefined : itemMap.value[id]
  }

  function heroName(player: MatchPlayer) {
    return (
      heroById(player.hero_id)?.localized_name ||
      `Герой #${player.hero_id ?? '?'}`
    )
  }

  function setQuery(id: string, snapshot = false) {
    const query: Record<string, string> = { match: id }
    if (snapshot) {
      query.snapshot = '1'
    }
    void navigateTo({ query }, { replace: true })
  }

  function showError(
    title: string,
    body: string,
    id: string | null,
    actions = true,
  ) {
    error.value = { title, body, id, actions }
  }

  function setLoading(value: boolean) {
    loading.value = value
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
      (['heroes', 'items', 'snapshot-meta'] as const).map(async (name) => {
        const response = await fetch(`/data/${name}.json`)
        if (!response.ok) {
          throw new Error(name)
        }
        return response.json()
      }),
    )

    const [heroesLookup, itemsLookup, metaLookup] = lookups

    if (heroesLookup?.status === 'fulfilled') {
      heroes.value = heroesLookup.value
    }
    if (itemsLookup?.status === 'fulfilled') {
      items.value = itemsLookup.value
    }
    if (metaLookup?.status === 'fulfilled') {
      snapshotMeta.value = metaLookup.value
    }
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
      showError(
        'Перевірте URL або ID',
        errorValue instanceof Error ? errorValue.message : 'Некоректний запит.',
        null,
        false,
      )
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
    setLoading(true)

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
        throw new Error(
          'OpenDota повернув відповідь, яку не вдалося прочитати.',
        )
      }

      if (data && typeof data === 'object' && 'error' in data) {
        const payload = data as { error?: unknown }
        const httpError = new HttpError(
          typeof payload.error === 'string'
            ? payload.error
            : 'Дані матчу недоступні.',
          404,
        )
        throw httpError
      }

      const next = validateMatch(data, id)
      if (no !== requestNo.value) {
        return
      }

      match.value = next
      source.value = {
        kind: 'live',
        label: 'OpenDota API — поточний запит',
        fetchedAt: new Date().toISOString(),
      }
      filter.value = 'all'
      revealNonce.value += 1
      setQuery(id)
    } catch (errorValue) {
      if (no !== requestNo.value) {
        return
      }

      const err = errorValue as HttpError
      if (err.name === 'AbortError' && !timedOut) {
        showToast('Завантаження скасовано')
        return
      }

      let title = 'Не вдалося отримати матч'
      let body =
        'Перевірте з’єднання. OpenDota може бути тимчасово недоступним або блокувати запит із цієї мережі.'

      if (timedOut) {
        title = 'Джерело відповідає надто довго'
        body =
          'OpenDota не відповів за 25 секунд. Спробуйте ще раз трохи пізніше.'
      } else if (err.status === 429) {
        title = 'Ліміт запитів OpenDota'
        const retry = Number(err.retry)
        body = `Сервіс тимчасово обмежив запити. Повторіть ${Number.isFinite(retry) && retry > 0 ? `через ${retry} с` : 'приблизно за хвилину'}.`
      } else if (err.status === 404) {
        title = 'Матч не знайдено в OpenDota'
        body =
          'Перевірте ID. Матч може бути приватним, ще не проіндексованим або недоступним у цьому джерелі.'
      } else if (err.status === 403 || err.status === 401) {
        title = 'Джерело відхилило запит'
        body =
          'OpenDota обмежив доступ до API. Спробуйте пізніше або відкрийте матч у джерелі.'
      } else if (err.status && err.status >= 500) {
        title = 'Тимчасова помилка OpenDota'
        body =
          'Сервіс повернув помилку. Ваш ID збережено — повторіть запит пізніше.'
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
    setLoading(true)
    error.value = null
    inputInvalid.value = false
    lastInput.value = EXAMPLE_MATCH_ID

    try {
      const response = await fetch(`/data/match-${EXAMPLE_MATCH_ID}.json`)
      if (!response.ok) {
        throw new Error('Знімок недоступний')
      }
      const data = validateMatch(await response.json(), EXAMPLE_MATCH_ID)
      if (no !== requestNo.value) {
        return
      }
      match.value = data
      filter.value = 'all'
      source.value = {
        kind: 'example',
        label: 'Перевірений знімок OpenDota API',
        fetchedAt: snapshotMeta.value?.fetched_at || '2026-09-05T05:16:46Z',
      }
      revealNonce.value += 1
      setQuery(EXAMPLE_MATCH_ID, true)
    } catch {
      if (no === requestNo.value) {
        match.value = null
        source.value = null
        showError(
          'Не вдалося відкрити приклад',
          'Спробуйте отримати матч безпосередньо з OpenDota.',
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
    const had = saved.value.some((entry) => entry.id === id)
    const next = had
      ? saved.value.filter((entry) => entry.id !== id)
      : [
          {
            id,
            radiant_win: match.value.radiant_win,
            duration: match.value.duration,
            start_time: match.value.start_time,
          },
          ...saved.value,
        ].slice(0, MAX_SAVED_MATCHES)

    try {
      persistSaved(next)
      showToast(
        had ? 'Матч видалено зі збережених' : 'Матч збережено в цьому браузері',
      )
    } catch {
      showToast('Браузер не дозволив зберегти матч.')
    }
  }

  function removeSaved(id: string) {
    try {
      persistSaved(saved.value.filter((entry) => entry.id !== id))
    } catch {
      showToast('Браузер не дозволив змінити закладки.')
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
    showToast('JSON підготовлено до завантаження')
  }

  async function bootstrap() {
    loadSaved()
    await loadLookups()
    const query = new URLSearchParams(window.location.search)
    const requested = query.get('match')
    if (
      requested &&
      !(requested === EXAMPLE_MATCH_ID && query.get('snapshot') === '1')
    ) {
      await loadMatch(requested)
      return
    }
    await loadExample()
  }

  return {
    match,
    source,
    view,
    filter,
    sort,
    loading,
    error,
    toast,
    lastInput,
    inputInvalid,
    saved,
    revealNonce,
    revealWithSound,
    radiantPlayers,
    direPlayers,
    isSaved,
    itemMap,
    snapshotMeta,
    heroById,
    itemById,
    heroName,
    showToast,
    loadMatch,
    loadExample,
    cancelLoad,
    toggleSaved,
    removeSaved,
    exportMatch,
    bootstrap,
  }
})
