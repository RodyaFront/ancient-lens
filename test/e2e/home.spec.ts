import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
})

describe('static home', () => {
  it('renders the home page', async () => {
    const html = await $fetch('/')

    expect(html).toContain('Розбір матчу')
    expect(html).toContain('Ancient Lens')
  })
})
