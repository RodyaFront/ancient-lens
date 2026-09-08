export function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parseMatchId(value: unknown): string {
  let text = String(value ?? '').trim()

  if (!/^\d+$/.test(text)) {
    let url: URL
    try {
      url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
    } catch {
      throw new Error(
        'Вставте числовий ID або посилання на матч Dotabuff / OpenDota.',
      )
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
      throw new Error(
        'Підтримуються посилання лише з dotabuff.com або opendota.com. Можна також вставити сам ID.',
      )
    }

    const match = url.pathname.match(/^\/matches\/(\d+)(?:\/.*)?$/)
    const id = match?.[1]
    if (!id) {
      throw new Error('У посиланні має бути /matches/ та числовий ID матчу.')
    }
    text = id
  }

  if (
    text.length > 16 ||
    BigInt(text) < BigInt(1) ||
    BigInt(text) > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error('ID має бути додатним цілим числом до 16 цифр.')
  }

  return BigInt(text).toString()
}
