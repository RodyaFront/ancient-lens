/**
 * Document fallback for non-prerendered routes (e.g. /match/:id), plus
 * same-origin Steam CDN proxy for hero/item art (CSP-safe).
 *
 * Cloudflare `not_found_handling = "single-page-application"` serves
 * `/index.html`, which is Nuxt's prerendered home payload (`path: "/"`).
 * Hydration then replaces the deep-link URL with `/`. Nuxt's `200.html`
 * is a client-only shell (`data-ssr="false"`) that routes from the URL.
 *
 * @param {Request} request
 * @param {{ ASSETS: { fetch: typeof fetch } }} env
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/cdn/steam/')) {
      return proxySteamAsset(url, request)
    }

    if (!isDocumentRequest(request)) {
      return new Response('Not Found', { status: 404 })
    }

    const shell = await env.ASSETS.fetch(new URL('/200.html', request.url))
    if (!shell.ok) {
      return new Response('Not Found', { status: 404 })
    }

    const headers = new Headers(shell.headers)
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    return new Response(shell.body, { status: 200, headers })
  },
}

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com'

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
