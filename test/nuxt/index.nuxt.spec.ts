import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from '../../app/pages/index.vue'

describe('index page', () => {
  it('renders the production stack heading', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.text()).toContain('Продакшн-стек Vue 3 + Nuxt')
  })
})
