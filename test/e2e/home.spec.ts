import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
})

describe('ssr', () => {
  it('renders the home page', async () => {
    const html = await $fetch('/')

    expect(html).toContain('Продакшн-стек Vue 3 + Nuxt')
  })

  it('returns a healthy API payload', async () => {
    const payload = await $fetch('/api/health')

    expect(payload).toMatchObject({
      ok: true,
      service: 'ancient-lens',
    })
  })
})
