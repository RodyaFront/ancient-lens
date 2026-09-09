export function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export type ParseMatchIdErrorCode = 'generic' | 'host' | 'path' | 'range'

export class ParseMatchIdError extends Error {
  readonly code: ParseMatchIdErrorCode

  constructor(code: ParseMatchIdErrorCode) {
    super(code)
    this.name = 'ParseMatchIdError'
    this.code = code
  }
}

/** True when the value looks like a URL, not a bare token / garbage. */
function looksLikeMatchUrl(text: string): boolean {
  return /^https?:\/\//i.test(text) || text.includes('/')
}

export function parseMatchId(value: unknown): string {
  let text = String(value ?? '').trim()

  if (!/^\d+$/.test(text)) {
    if (!looksLikeMatchUrl(text)) {
      throw new ParseMatchIdError('generic')
    }

    let url: URL
    try {
      url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
    } catch {
      throw new ParseMatchIdError('generic')
    }

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      !/^((www|[a-z]{2})\.)?dotabuff\.com$|^(www\.)?opendota\.com$/i.test(
        url.hostname,
      )
    ) {
      throw new ParseMatchIdError('host')
    }

    const match = url.pathname.match(/^\/matches\/(\d+)(?:\/.*)?$/)
    const id = match?.[1]
    if (!id) {
      throw new ParseMatchIdError('path')
    }
    text = id
  }

  if (
    text.length > 16 ||
    BigInt(text) < BigInt(1) ||
    BigInt(text) > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new ParseMatchIdError('range')
  }

  return BigInt(text).toString()
}
