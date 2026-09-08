import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
})

describe('ssr', () => {
  it('renders the home page', async () => {
    const html = await $fetch('/')

    expect(html).toContain('Розбір матчу')
    expect(html).toContain('Ancient Lens')
  })

  it('returns a healthy API payload', async () => {
    const payload = await $fetch('/api/health')

    expect(payload).toMatchObject({
      ok: true,
      service: 'ancient-lens',
    })
  })
})
