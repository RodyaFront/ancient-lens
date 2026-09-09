import { STEAM_CDN } from '#shared/match/constants'

/**
 * Same-origin Steam CDN proxy (dev / Node). Production static hosting uses
 * workers/spa-shell.js for the same /cdn/steam/* path.
 */
export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'path')
  const joined = Array.isArray(raw) ? raw.join('/') : raw || ''
  const steamPath = `/${joined}`.replace(/\/{2,}/g, '/')

  if (!steamPath.startsWith('/apps/dota2/') || steamPath.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Steam path' })
  }

  const upstream = await fetch(`${STEAM_CDN}${steamPath}`, {
    headers: {
      Accept: getHeader(event, 'accept') || 'image/*,*/*',
      'User-Agent': getHeader(event, 'user-agent') || 'AncientLens',
    },
  })

  if (!upstream.ok) {
    throw createError({
      statusCode: upstream.status,
      statusMessage: 'Steam asset upstream error',
    })
  }

  const contentType =
    upstream.headers.get('content-type') || 'application/octet-stream'
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=86400')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  return Buffer.from(await upstream.arrayBuffer())
})
