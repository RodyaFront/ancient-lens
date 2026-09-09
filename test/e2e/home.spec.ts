import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  // Local/CI shells may set NITRO_PRESET=static for Workers; e2e needs a Node server.
  nuxtConfig: {
    nitro: {
      preset: 'node-server',
    },
  },
})

describe('routes', () => {
  it('renders the root page without a match scoreboard', async () => {
    const html = await $fetch('/')

    expect(html).toContain('Ancient Lens')
    expect(html).toContain('Match review')
    expect(html).toContain('Open match')
    expect(html).toContain('Match ID or URL')
    expect(html).not.toContain('Еталонний протокол')
    expect(html).not.toContain('Недавні')
    expect(html).not.toContain('score-card')
  })

  it('renders the match page shell', async () => {
    const html = await $fetch('/match/8961419173?snapshot=1')

    expect(html).toContain('Ancient Lens')
    expect(html).toContain('Match review')
  })
})
