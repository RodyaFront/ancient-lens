<script setup lang="ts">
import type { SiteNavTreeNode } from '~/utils/siteNav'
import { isSiteNavPathActive } from '~/utils/siteNav'
// Explicit self-import so recursive children resolve (auto-import is unreliable here).
import SiteNavNode from '~/components/SiteNavNode.vue'

defineOptions({ name: 'SiteNavNode' })

const props = defineProps<{
  node: SiteNavTreeNode
}>()

const route = useRoute()

const linkActive = computed(() => {
  const node = props.node
  if (node.kind !== 'link' && node.kind !== 'icon-link') {
    return false
  }
  return isSiteNavPathActive(route.path, node.to, node.match)
})

const groupClass = computed(() => {
  if (props.node.kind !== 'group') {
    return undefined
  }
  return ['site-nav__group', `site-nav__group--${props.node.variant}`]
})
</script>

<template>
  <div
    v-if="node.kind === 'group'"
    :class="groupClass"
    :role="node.label ? 'group' : undefined"
    :aria-label="node.label"
  >
    <SiteNavNode v-for="child in node.children" :key="child.id" :node="child" />
  </div>

  <NuxtLink
    v-else-if="node.kind === 'link'"
    class="site-nav__item ui-press"
    :class="{ 'is-active': linkActive }"
    :to="node.to"
    :aria-current="linkActive ? 'page' : undefined"
  >
    {{ node.label }}
  </NuxtLink>

  <button
    v-else-if="node.kind === 'action'"
    :id="`${node.id}-nav`"
    class="site-nav__item ui-press"
    type="button"
    @click="node.onSelect()"
  >
    {{ node.label }}
  </button>

  <NuxtLink
    v-else-if="node.kind === 'icon-link'"
    :id="`${node.id}-nav`"
    class="site-nav__item site-nav__item--icon ui-press"
    :class="{ 'is-active': linkActive }"
    :to="node.to"
    :aria-current="linkActive ? 'page' : undefined"
    :aria-label="node.label"
    :title="node.title"
  >
    <span class="site-nav__glyph">
      <Icon :name="node.icon" aria-hidden="true" />
      <span
        v-if="node.badge != null"
        :id="`${node.id}-count`"
        class="site-nav__badge"
        aria-hidden="true"
        >{{ node.badge }}</span
      >
    </span>
  </NuxtLink>

  <button
    v-else-if="node.kind === 'icon-toggle'"
    :id="`${node.id}-nav`"
    class="site-nav__item site-nav__item--icon ui-press"
    :class="{ 'is-active': node.pressed }"
    type="button"
    :aria-pressed="node.pressed"
    :aria-label="node.label"
    :title="node.title"
    @click="node.onSelect()"
  >
    <span class="site-nav__glyph">
      <Icon :name="node.icon" aria-hidden="true" />
    </span>
  </button>

  <div
    v-else-if="node.kind === 'locale'"
    class="site-nav__group site-nav__group--locale"
    role="group"
    :aria-label="node.label"
  >
    <NuxtLink
      v-for="option in node.options"
      :key="option.code"
      class="site-nav__item site-nav__item--locale ui-press"
      :class="{ 'is-active': option.active }"
      :to="option.href"
      :aria-current="option.active ? 'true' : undefined"
    >
      {{ option.code.toUpperCase() }}
    </NuxtLink>
  </div>
</template>
