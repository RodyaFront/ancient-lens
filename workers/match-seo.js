/**
 * Match SEO helpers for the Cloudflare Worker (plain ESM, no Nuxt).
 * Keep formulas aligned with shared/match/seoMeta.ts.
 */

/**
 * @param {string} pathname
 * @returns {{ locale: 'en' | 'uk', matchId: string } | null}
 */
export function parseMatchDocumentPath(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/'
  let match = /^\/match\/(\d+)$/.exec(clean)
  if (match) {
    return { locale: 'en', matchId: match[1] }
  }
  match = /^\/uk\/match\/(\d+)$/.exec(clean)
  if (match) {
    return { locale: 'uk', matchId: match[1] }
  }
  return null
}

/** Keep in sync with shared/seo/staticRoutes.ts (+ hero slug pattern). */
const KNOWN_SHELL_PATHS = new Set([
  '/',
  '/uk',
  '/about',
  '/uk/about',
  '/guides/how-to-read-a-dota-2-match',
  '/uk/guides/how-to-read-a-dota-2-match',
  '/guides/dota-2-match-stats',
  '/uk/guides/dota-2-match-stats',
  '/compare/opendota',
  '/uk/compare/opendota',
  '/compare/dotabuff',
  '/uk/compare/dotabuff',
  '/heroes',
  '/uk/heroes',
  '/matches',
  '/uk/matches',
])

/**
 * Document paths that should get the Nuxt client shell without match enrichment.
 * Unknown document paths should 404.
 * @param {string} pathname
 */
export function isKnownSpaShellPath(pathname) {
  if (parseMatchDocumentPath(pathname)) {
    return true
  }
  const clean = pathname.replace(/\/+$/, '') || '/'
  if (KNOWN_SHELL_PATHS.has(clean)) {
    return true
  }
  return /^\/(?:uk\/)?heroes\/[a-z0-9-]+$/.test(clean)
}

function isNum(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function duration(seconds) {
  if (!isNum(seconds) || seconds < 0) {
    return '—'
  }
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function isRadiantPlayer(player) {
  if (typeof player?.isRadiant === 'boolean') {
    return player.isRadiant
  }
  if (isNum(player?.player_slot)) {
    return player.player_slot < 128
  }
  return false
}

function heroName(player, heroes) {
  const id = player?.hero_id
  if (!isNum(id)) {
    return 'Unknown'
  }
  return heroes?.[String(id)]?.localized_name || `Hero ${id}`
}

function lineup(players, radiant, heroes) {
  return players
    .filter((p) => isRadiantPlayer(p) === radiant)
    .map((p) => heroName(p, heroes))
    .join(', ')
}

/**
 * @param {object | null} match
 * @param {{ matchId: string, locale?: 'en' | 'uk', heroes?: Record<string, { localized_name?: string }> }} options
 */
export function buildMatchSeoCopy(match, options) {
  const locale = options.locale === 'uk' ? 'uk' : 'en'
  const id = options.matchId
  const heroes = options.heroes

  if (locale === 'uk') {
    if (!match) {
      return {
        title: `Матч #${id} | Ancient Lens`,
        description:
          'Scorebook матчу Dota 2: результат, паті, внесок, економіка та предмети.',
        winnerLabel: '',
        scoreLine: '',
        durationLabel: '',
      }
    }
    const radiantScore = isNum(match.radiant_score) ? match.radiant_score : 0
    const direScore = isNum(match.dire_score) ? match.dire_score : 0
    const scoreLine = `${radiantScore}:${direScore}`
    const winnerTeam =
      match.radiant_win === true
        ? 'Radiant'
        : match.radiant_win === false
          ? 'Dire'
          : 'Radiant'
    const dur = duration(match.duration)
    const players = Array.isArray(match.players) ? match.players : []
    const heroesBlurb = [
      lineup(players, true, heroes),
      lineup(players, false, heroes),
    ]
      .filter(Boolean)
      .join(' vs ')
    return {
      title: `Матч #${id} — ${winnerTeam} ${scoreLine} | Ancient Lens`,
      description: `Матч Dota 2 #${id}: перемога ${winnerTeam} ${scoreLine} за ${dur}. ${heroesBlurb ? `${heroesBlurb}. ` : ''}Scorebook-розбір на Ancient Lens.`,
      winnerLabel: `перемога ${winnerTeam}`,
      scoreLine,
      durationLabel: dur,
    }
  }

  if (!match) {
    return {
      title: `Match #${id} | Ancient Lens`,
      description:
        'Dota 2 match scorebook: result, party, contribution, economy, and items.',
      winnerLabel: '',
      scoreLine: '',
      durationLabel: '',
    }
  }

  const radiantScore = isNum(match.radiant_score) ? match.radiant_score : 0
  const direScore = isNum(match.dire_score) ? match.dire_score : 0
  const scoreLine = `${radiantScore}:${direScore}`
  const winnerTeam =
    match.radiant_win === true
      ? 'Radiant'
      : match.radiant_win === false
        ? 'Dire'
        : 'Radiant'
  const dur = duration(match.duration)
  const players = Array.isArray(match.players) ? match.players : []
  const heroesBlurb = [
    lineup(players, true, heroes),
    lineup(players, false, heroes),
  ]
    .filter(Boolean)
    .join(' vs ')

  return {
    title: `Match #${id} — ${winnerTeam} ${scoreLine} | Ancient Lens`,
    description: `Dota 2 match #${id}: ${winnerTeam} win ${scoreLine} in ${dur}. ${heroesBlurb ? `${heroesBlurb}. ` : ''}Scorebook review on Ancient Lens.`,
    winnerLabel: `${winnerTeam} victory`,
    scoreLine,
    durationLabel: dur,
  }
}

/**
 * @param {object} match
 * @param {Record<string, { localized_name?: string }>} heroes
 */
export function buildMatchSummaryHtml(match, heroes, locale, copy) {
  const players = Array.isArray(match.players) ? match.players : []
  const radiant = players.filter((p) => isRadiantPlayer(p))
  const dire = players.filter((p) => !isRadiantPlayer(p))
  const heading =
    locale === 'uk' ? `Матч #${match.match_id}` : `Match #${match.match_id}`
  const radiantLabel = locale === 'uk' ? 'Radiant' : 'Radiant'
  const direLabel = 'Dire'

  function teamList(teamPlayers, label) {
    const rows = teamPlayers
      .map((p) => {
        const name = heroName(p, heroes)
        const k = isNum(p.kills) ? p.kills : 0
        const d = isNum(p.deaths) ? p.deaths : 0
        const a = isNum(p.assists) ? p.assists : 0
        const nw = isNum(p.net_worth) ? p.net_worth : 0
        return `<li>${escapeHtml(name)} ${k}/${d}/${a} NW ${nw}</li>`
      })
      .join('')
    return `<section><h2>${escapeHtml(label)}</h2><ul>${rows}</ul></section>`
  }

  return `<article id="seo-match-summary" data-seo-match="1">
<h1>${escapeHtml(heading)}</h1>
<p>${escapeHtml(copy.winnerLabel)} ${escapeHtml(copy.scoreLine)} · ${escapeHtml(copy.durationLabel)}</p>
${teamList(radiant, radiantLabel)}
${teamList(dire, direLabel)}
</article>`
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * @param {string} html
 * @param {object} seo
 */
export function injectMatchSeo(html, seo) {
  let out = html
  out = out.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(seo.title)}</title>`,
  )
  out = out.replace(/<html(\s[^>]*)?>/i, `<html lang="${seo.locale}"$1>`)

  const headTags = [
    `<meta name="description" content="${escapeHtml(seo.description)}">`,
    `<link rel="canonical" href="${escapeHtml(seo.canonical)}">`,
    `<link rel="alternate" hreflang="en" href="${escapeHtml(seo.hreflangEn)}">`,
    `<link rel="alternate" hreflang="uk" href="${escapeHtml(seo.hreflangUk)}">`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(seo.hreflangEn)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}">`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}">`,
    `<meta property="og:url" content="${escapeHtml(seo.canonical)}">`,
    `<meta property="og:site_name" content="Ancient Lens">`,
    `<meta property="og:image" content="${escapeHtml(seo.ogImage)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(seo.ogImage)}">`,
    `<script type="application/ld+json">${seo.jsonLd}</script>`,
  ].join('')

  if (out.includes('</head>')) {
    out = out.replace('</head>', `${headTags}</head>`)
  }

  if (seo.summaryHtml) {
    if (out.includes('<div id="__nuxt"></div>')) {
      out = out.replace(
        '<div id="__nuxt"></div>',
        `<div id="__nuxt">${seo.summaryHtml}</div>`,
      )
    } else if (out.includes('<div id="__nuxt">')) {
      out = out.replace(
        /<div id="__nuxt">/,
        `<div id="__nuxt">${seo.summaryHtml}`,
      )
    } else {
      out = out.replace('<body>', `<body>${seo.summaryHtml}`)
    }
  }

  return out
}

/**
 * @param {object} match
 * @param {{ origin: string, matchId: string, locale: 'en' | 'uk', canonical: string }} ctx
 */
export function buildMatchJsonLd(match, ctx, copy) {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${ctx.canonical}#webpage`,
        url: ctx.canonical,
        name: copy.title,
        description: copy.description,
        isPartOf: { '@id': `${ctx.origin}/#website` },
        inLanguage: ctx.locale === 'uk' ? 'uk' : 'en',
      },
      {
        '@type': 'SportsEvent',
        '@id': `${ctx.canonical}#event`,
        name: `Dota 2 Match #${ctx.matchId}`,
        description: copy.description,
        url: ctx.canonical,
        homeTeam: {
          '@type': 'SportsTeam',
          name: 'Radiant',
        },
        awayTeam: {
          '@type': 'SportsTeam',
          name: 'Dire',
        },
        ...(isNum(match.start_time)
          ? { startDate: new Date(match.start_time * 1000).toISOString() }
          : {}),
      },
    ],
  }
  return JSON.stringify(graph)
}
