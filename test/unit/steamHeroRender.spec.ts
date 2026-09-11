import { describe, expect, it } from 'vitest'
import {
  heroSteamSlug,
  steamHeroRenderPath,
  steamHeroRenderProxyUrl,
  steamHeroRenderUrl,
} from '../../app/utils/matchFormat'

describe('steam hero render URLs', () => {
  it('parses the Steam slug from the npc name', () => {
    expect(heroSteamSlug('npc_dota_hero_grimstroke')).toBe('grimstroke')
    expect(heroSteamSlug('grimstroke')).toBeNull()
  })

  it('builds a direct Steam CDN URL for MVP HD art', () => {
    expect(steamHeroRenderUrl('npc_dota_hero_grimstroke')).toBe(
      'https://cdn.cloudflare.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/grimstroke.png',
    )
  })

  it('keeps a same-origin proxy URL as fallback', () => {
    expect(steamHeroRenderPath('npc_dota_hero_puck')).toBe(
      '/apps/dota2/videos/dota_react/heroes/renders/puck.png',
    )
    expect(steamHeroRenderProxyUrl('npc_dota_hero_puck')).toBe(
      '/cdn/steam/apps/dota2/videos/dota_react/heroes/renders/puck.png',
    )
  })
})
