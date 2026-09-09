/**
 * Document fallback for non-prerendered routes (e.g. /match/:id).
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
