/**
 * Document fallback for non-prerendered routes (e.g. /match/:id), plus
 * same-origin Steam CDN proxy for hero/item art (CSP-safe), and a cached
 * `/api/public-matches` proxy (avoids browser OpenDota 429 on /matches).
 * Match documents are enriched with OpenDota meta + crawlable summary.
 *
 * Cloudflare asset binding serves static files first; this Worker handles
 * misses (deep links, /cdn/steam, /api/public-matches, unknown paths).
 *
 * @param {Request} request
 * @param {{ ASSETS: { fetch: typeof fetch } }} env
 * @param {ExecutionContext} [ctx]
 */
import {
  buildMatchJsonLd,
  buildMatchSeoCopy,
  buildMatchSummaryHtml,
  injectMatchSeo,
  isKnownSpaShellPath,
  parseMatchDocumentPath,
} from './match-seo.js'

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com'
const OPENDOTA_MATCH = 'https://api.opendota.com/api/matches'
const OPENDOTA_PUBLIC_MATCHES = 'https://api.opendota.com/api/publicMatches'
const MATCH_FETCH_MS = 8_000
const PUBLIC_MATCHES_FETCH_MS = 10_000
const CACHE_OK_SECONDS = 3_600
/** Edge TTL for a fresh successful list (stops OpenDota stampede). */
const PUBLIC_MATCHES_CACHE_SECONDS = 300
/** Keep last-good longer so 429/upstream blips still serve a feed. */
const PUBLIC_MATCHES_LAST_GOOD_SECONDS = 3_600
/** After OpenDota 429/error with no last-good, skip upstream briefly. */
const PUBLIC_MATCHES_COOLDOWN_SECONDS = 30
/** Browser may revalidate sooner; edge holds the longer TTLs above. */
const PUBLIC_MATCHES_BROWSER_MAX_AGE = 60
const PUBLIC_MATCHES_LIMIT = 40
const SITE_ORIGIN_FALLBACK = 'https://ancientlens.info'

/** @type {string | null} */
let publicMatchesMemoryBody = null
/** @type {Promise<Response> | null} */
let publicMatchesInflight = null

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/cdn/steam/')) {
      return proxySteamAsset(url, request)
    }

    if (
      url.pathname === '/api/public-matches' ||
      url.pathname === '/api/public-matches/'
    ) {
      return servePublicMatches(request, ctx, url)
    }

    if (url.pathname === '/matches/v2' || url.pathname === '/matches/v2/') {
      return Response.redirect(new URL('/matches', url).toString(), 301)
    }
    if (
      url.pathname === '/uk/matches/v2' ||
      url.pathname === '/uk/matches/v2/'
    ) {
      return Response.redirect(new URL('/uk/matches', url).toString(), 301)
    }

    if (!isDocumentRequest(request)) {
      return new Response('Not Found', { status: 404 })
    }

    const matchRoute = parseMatchDocumentPath(url.pathname)
    if (matchRoute) {
      return serveMatchDocument(request, env, ctx, url, matchRoute)
    }

    if (!isKnownSpaShellPath(url.pathname)) {
      return serveNotFound(env, request)
    }

    return serveShell(env, request, 200)
  },
}

/**
 * @param {Request} request
 * @param {{ ASSETS: { fetch: typeof fetch } }} env
 * @param {ExecutionContext | undefined} ctx
 * @param {URL} url
 * @param {{ locale: 'en' | 'uk', matchId: string }} matchRoute
 */
async function serveMatchDocument(request, env, ctx, url, matchRoute) {
  const origin = siteOrigin(url)
  const cacheKey = new Request(
    `${origin}/__seo-cache/match/${matchRoute.matchId}?lang=${matchRoute.locale}`,
    { method: 'GET' },
  )

  const cache = typeof caches !== 'undefined' ? caches.default : null
  if (cache) {
    const hit = await cache.match(cacheKey)
    if (hit) {
      return hit
    }
  }

  const fetched = await fetchOpenDotaMatch(matchRoute.matchId)
  if (fetched.status === 'missing') {
    return serveNotFound(env, request, true)
  }
  if (fetched.status === 'error' || !fetched.match) {
    return serveShell(env, request, 200)
  }
  const match = fetched.match

  const heroes = await loadHeroes(env, request)
  const copy = buildMatchSeoCopy(match, {
    matchId: matchRoute.matchId,
    locale: matchRoute.locale,
    heroes,
  })

  const canonical =
    matchRoute.locale === 'uk'
      ? `${origin}/uk/match/${matchRoute.matchId}`
      : `${origin}/match/${matchRoute.matchId}`
  const hreflangEn = `${origin}/match/${matchRoute.matchId}`
  const hreflangUk = `${origin}/uk/match/${matchRoute.matchId}`
  const ogImage = `${origin}/og-default.png`
  const summaryHtml = buildMatchSummaryHtml(
    match,
    heroes,
    matchRoute.locale,
    copy,
  )
  const jsonLd = buildMatchJsonLd(
    match,
    {
      origin,
      matchId: matchRoute.matchId,
      locale: matchRoute.locale,
      canonical,
    },
    copy,
  )

  const shell = await env.ASSETS.fetch(new URL('/200.html', request.url))
  if (!shell.ok) {
    return new Response('Not Found', { status: 404 })
  }

  const html = injectMatchSeo(await shell.text(), {
    title: copy.title,
    description: copy.description,
    locale: matchRoute.locale,
    canonical,
    hreflangEn,
    hreflangUk,
    ogImage,
    summaryHtml,
    jsonLd,
  })

  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
  })
  const response = new Response(html, { status: 200, headers })

  if (cache && ctx?.waitUntil) {
    const cached = response.clone()
    cached.headers.set('Cache-Control', `public, max-age=${CACHE_OK_SECONDS}`)
    ctx.waitUntil(cache.put(cacheKey, cached))
  }

  return response
}

/**
 * Cached OpenDota publicMatches list for /matches page (avoids browser 429).
 * Fresh edge cache + last-good fallback + isolate singleflight + short cooldown.
 * @param {Request} request
 * @param {ExecutionContext | undefined} ctx
 * @param {URL} url
 */
async function servePublicMatches(request, ctx, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const origin = siteOrigin(url)
  const freshKey = new Request(`${origin}/__api-cache/public-matches`, {
    method: 'GET',
  })
  const lastGoodKey = new Request(
    `${origin}/__api-cache/public-matches-last-good`,
    { method: 'GET' },
  )
  const cooldownKey = new Request(
    `${origin}/__api-cache/public-matches-cooldown`,
    { method: 'GET' },
  )
  const cache = typeof caches !== 'undefined' ? caches.default : null

  if (cache) {
    const hit = await cache.match(freshKey)
    if (hit) {
      return publicMatchesClientResponse(await hit.text(), 'HIT')
    }
  }

  if (cache) {
    const cooling = await cache.match(cooldownKey)
    if (cooling) {
      const stale = await resolvePublicMatchesLastGood(cache, lastGoodKey)
      if (stale) {
        return publicMatchesClientResponse(stale, 'STALE')
      }
      return publicMatchesErrorResponse(429, 'rate_limit')
    }
  }

  if (publicMatchesInflight) {
    return publicMatchesInflight.then((response) => response.clone())
  }

  publicMatchesInflight = loadPublicMatches(cache, ctx, {
    freshKey,
    lastGoodKey,
    cooldownKey,
  }).finally(() => {
    publicMatchesInflight = null
  })

  return publicMatchesInflight.then((response) => response.clone())
}

/**
 * @param {Cache | null} cache
 * @param {ExecutionContext | undefined} ctx
 * @param {{ freshKey: Request, lastGoodKey: Request, cooldownKey: Request }} keys
 */
async function loadPublicMatches(cache, ctx, keys) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PUBLIC_MATCHES_FETCH_MS)
  try {
    const upstream = await fetch(OPENDOTA_PUBLIC_MATCHES, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!upstream.ok) {
      return servePublicMatchesFallback(
        cache,
        ctx,
        keys,
        upstream.status === 429 ? 429 : 502,
        upstream.status === 429 ? 'rate_limit' : 'upstream_error',
      )
    }

    const list = await upstream.json()
    const rows = Array.isArray(list)
      ? list.filter(isUsablePublicMatchRow).slice(0, PUBLIC_MATCHES_LIMIT)
      : []
    const body = JSON.stringify(rows)
    publicMatchesMemoryBody = body
    await storePublicMatchesSuccess(cache, ctx, keys, body)
    return publicMatchesClientResponse(body, 'MISS')
  } catch {
    return servePublicMatchesFallback(cache, ctx, keys, 502, 'upstream_error')
  } finally {
    clearTimeout(timer)
  }
}

/**
 * @param {Cache | null} cache
 * @param {ExecutionContext | undefined} ctx
 * @param {{ freshKey: Request, lastGoodKey: Request, cooldownKey: Request }} keys
 * @param {number} status
 * @param {string} error
 */
async function servePublicMatchesFallback(cache, ctx, keys, status, error) {
  const stale = await resolvePublicMatchesLastGood(cache, keys.lastGoodKey)
  await storePublicMatchesCooldown(cache, ctx, keys.cooldownKey, status, error)
  if (stale) {
    return publicMatchesClientResponse(stale, 'STALE')
  }
  return publicMatchesErrorResponse(status, error)
}

/**
 * @param {Cache | null} cache
 * @param {Request} lastGoodKey
 */
async function resolvePublicMatchesLastGood(cache, lastGoodKey) {
  if (publicMatchesMemoryBody) {
    return publicMatchesMemoryBody
  }
  if (!cache) {
    return null
  }
  const hit = await cache.match(lastGoodKey)
  if (!hit) {
    return null
  }
  const body = await hit.text()
  publicMatchesMemoryBody = body
  return body
}

/**
 * @param {Cache | null} cache
 * @param {ExecutionContext | undefined} ctx
 * @param {{ freshKey: Request, lastGoodKey: Request, cooldownKey: Request }} keys
 * @param {string} body
 */
async function storePublicMatchesSuccess(cache, ctx, keys, body) {
  if (!cache) {
    return
  }
  const fresh = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${PUBLIC_MATCHES_CACHE_SECONDS}`,
    },
  })
  const lastGood = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${PUBLIC_MATCHES_LAST_GOOD_SECONDS}`,
    },
  })
  const write = Promise.all([
    cache.put(keys.freshKey, fresh),
    cache.put(keys.lastGoodKey, lastGood),
    cache.delete(keys.cooldownKey),
  ])
  if (ctx?.waitUntil) {
    ctx.waitUntil(write)
  } else {
    await write
  }
}

/**
 * @param {Cache | null} cache
 * @param {ExecutionContext | undefined} ctx
 * @param {Request} cooldownKey
 * @param {number} status
 * @param {string} error
 */
async function storePublicMatchesCooldown(
  cache,
  ctx,
  cooldownKey,
  status,
  error,
) {
  if (!cache) {
    return
  }
  const response = new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${PUBLIC_MATCHES_COOLDOWN_SECONDS}`,
    },
  })
  const write = cache.put(cooldownKey, response)
  if (ctx?.waitUntil) {
    ctx.waitUntil(write)
  } else {
    await write
  }
}

/**
 * @param {string} body
 * @param {'HIT' | 'MISS' | 'STALE'} cacheState
 */
function publicMatchesClientResponse(body, cacheState) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${PUBLIC_MATCHES_BROWSER_MAX_AGE}`,
      'X-Public-Matches-Cache': cacheState,
    },
  })
}

/**
 * @param {number} status
 * @param {string} error
 */
function publicMatchesErrorResponse(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * @param {unknown} row
 */
function isUsablePublicMatchRow(row) {
  if (!row || typeof row !== 'object') {
    return false
  }
  const match =
    /** @type {{ match_id?: unknown, duration?: unknown, radiant_team?: unknown, dire_team?: unknown }} */ (
      row
    )
  if (typeof match.match_id !== 'number' || !Number.isFinite(match.match_id)) {
    return false
  }
  if (typeof match.duration !== 'number' || match.duration <= 0) {
    return false
  }
  const radiant = Array.isArray(match.radiant_team) ? match.radiant_team : []
  const dire = Array.isArray(match.dire_team) ? match.dire_team : []
  const heroes = [...radiant, ...dire].filter(
    (id) => typeof id === 'number' && id > 0,
  )
  return heroes.length >= 8
}

/**
 * @param {string} matchId
 * @returns {Promise<{ status: 'ok', match: object } | { status: 'missing' } | { status: 'error' }>}
 */
async function fetchOpenDotaMatch(matchId) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MATCH_FETCH_MS)
  try {
    const response = await fetch(`${OPENDOTA_MATCH}/${matchId}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (response.status === 404) {
      return { status: 'missing' }
    }
    if (!response.ok) {
      return { status: 'error' }
    }
    const data = await response.json()
    if (!data || String(data.match_id) !== String(matchId)) {
      return { status: 'missing' }
    }
    return { status: 'ok', match: data }
  } catch {
    return { status: 'error' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * @param {{ ASSETS: { fetch: typeof fetch } }} env
 * @param {Request} request
 */
async function loadHeroes(env, request) {
  try {
    const response = await env.ASSETS.fetch(
      new URL('/data/heroes.json', request.url),
    )
    if (!response.ok) {
      return {}
    }
    return await response.json()
  } catch {
    return {}
  }
}

/**
 * @param {{ ASSETS: { fetch: typeof fetch } }} env
 * @param {Request} request
 * @param {boolean} [noindex]
 */
async function serveNotFound(env, request, noindex = false) {
  const page = await env.ASSETS.fetch(new URL('/404.html', request.url))
  if (!page.ok) {
    return new Response('Not Found', {
      status: 404,
      headers: noindex ? { 'X-Robots-Tag': 'noindex' } : undefined,
    })
  }
  let body = await page.text()
  if (noindex) {
    body = body.includes('</head>')
      ? body.replace(
          '</head>',
          '<meta name="robots" content="noindex, nofollow"></head>',
        )
      : body
  }
  const headers = new Headers(page.headers)
  headers.set('Content-Type', 'text/html; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  if (noindex) {
    headers.set('X-Robots-Tag', 'noindex')
  }
  return new Response(body, { status: 404, headers })
}

/**
 * @param {{ ASSETS: { fetch: typeof fetch } }} env
 * @param {Request} request
 * @param {number} status
 */
async function serveShell(env, request, status) {
  const shell = await env.ASSETS.fetch(new URL('/200.html', request.url))
  if (!shell.ok) {
    return new Response('Not Found', { status: 404 })
  }
  const headers = new Headers(shell.headers)
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  return new Response(shell.body, { status, headers })
}

/**
 * @param {URL} url
 */
function siteOrigin(url) {
  if (url.hostname.endsWith('ancientlens.info')) {
    return 'https://ancientlens.info'
  }
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    return url.origin
  }
  return SITE_ORIGIN_FALLBACK
}

/**
 * @param {URL} url
 * @param {Request} request
 */
async function proxySteamAsset(url, request) {
  const steamPath = url.pathname.slice('/cdn/steam'.length)
  if (!steamPath.startsWith('/apps/dota2/') || steamPath.includes('..')) {
    return new Response('Bad Request', { status: 400 })
  }

  const upstreamUrl = `${STEAM_CDN}${steamPath}`
  const upstream = await fetch(upstreamUrl, {
    headers: {
      Accept: request.headers.get('Accept') || 'image/*,*/*',
      'User-Agent': request.headers.get('User-Agent') || 'AncientLens',
    },
  })

  if (!upstream.ok) {
    return new Response('Upstream error', { status: upstream.status })
  }

  const headers = new Headers()
  const contentType = upstream.headers.get('Content-Type')
  if (contentType) {
    headers.set('Content-Type', contentType)
  }
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('X-Content-Type-Options', 'nosniff')

  return new Response(upstream.body, { status: 200, headers })
}

/** @param {Request} request */
function isDocumentRequest(request) {
  if (request.headers.get('Sec-Fetch-Mode') === 'navigate') {
    return true
  }
  if (request.headers.get('Sec-Fetch-Dest') === 'document') {
    return true
  }
  const accept = request.headers.get('Accept') || ''
  return accept.includes('text/html')
}
