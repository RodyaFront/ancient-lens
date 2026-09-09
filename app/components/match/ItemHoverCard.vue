<script setup lang="ts">
import {
  abilityKind,
  emphasizeNumberSegments,
  itemAffectsLabel,
  itemBehaviorLabel,
  itemStatLines,
  splitAbilityBody,
} from '~/utils/itemHover'
import { formatNumber, steamAssetUrl } from '~/utils/matchFormat'

const props = defineProps<{
  itemId: number
  triggerEl: HTMLElement | null
  sticky?: boolean
}>()

const { t } = useI18n()
const store = useMatchStore()
const preview = useItemPreview()

const failed = ref(false)

const entry = computed(() => store.itemById(props.itemId))
const name = computed(
  () => entry.value?.dname || t('format.itemFallback', { id: props.itemId }),
)
const imageUrl = computed(() => steamAssetUrl(entry.value?.img))
const stats = computed(() =>
  itemStatLines(entry.value).map((line) => emphasizeNumberSegments(line)),
)
const behavior = computed(() => itemBehaviorLabel(entry.value))
const affects = computed(() => itemAffectsLabel(entry.value))
const neutralTier = computed(() => {
  const tier = entry.value?.tier
  return typeof tier === 'number' && tier >= 1 && tier <= 5 ? tier : null
})
const showShopCost = computed(
  () => typeof entry.value?.cost === 'number' && entry.value.cost > 0,
)

const resourceAbilityIndex = computed(() => {
  const list = entry.value?.abilities ?? []
  if (
    typeof entry.value?.mc !== 'number' &&
    typeof entry.value?.cd !== 'number'
  ) {
    return -1
  }
  const activeIndex = list.findIndex(
    (ability) => abilityKind(ability) === 'active',
  )
  if (activeIndex >= 0) {
    return activeIndex
  }
  return list.length ? 0 : -1
})

const abilityViews = computed(() =>
  (entry.value?.abilities ?? []).map((ability, index) => {
    const body = ability.description
      ? splitAbilityBody(ability.description)
      : { prose: '', footers: [] as { label: string; value: string }[] }
    const kind = abilityKind(ability)
    return {
      key: `${kind}-${ability.title || index}`,
      kind,
      title: ability.title || '',
      proseSegments: body.prose ? emphasizeNumberSegments(body.prose) : [],
      footers: body.footers.map((row) => ({
        label: row.label,
        valueSegments: emphasizeNumberSegments(row.value),
      })),
      showResources: index === resourceAbilityIndex.value,
    }
  }),
)

watch(imageUrl, () => {
  failed.value = false
})
</script>

<template>
  <AppFloatRoot
    :anchor-el="triggerEl"
    :prefer-above-min="120"
    :z-index="70"
    interactive
    :surface-class="['item-hover-card', { 'is-pinned': sticky }]"
    role="tooltip"
    data-item-preview-card
    @pointerenter="preview.retain(itemId)"
    @pointerleave="preview.leave(itemId)"
    @wheel.stop
  >
    <div
      class="item-hover-card__identity"
      :data-tier="neutralTier ?? undefined"
    >
      <span class="item-hover-card__icon">
        <img
          v-if="imageUrl && !failed"
          :src="imageUrl"
          :alt="name"
          @error="failed = true"
        />
        <span v-else>{{ name.slice(0, 3) }}</span>
      </span>
      <div class="item-hover-card__title-block">
        <strong class="item-hover-card__name">{{ name }}</strong>
        <span
          v-if="neutralTier"
          class="item-hover-card__tier"
          :data-tier="neutralTier"
        >
          {{ t('itemHover.tier', { n: neutralTier }) }}
        </span>
        <span v-else-if="showShopCost" class="item-hover-card__cost">
          <Icon name="lucide:coins" aria-hidden="true" />
          <span>{{ formatNumber(entry?.cost) }}</span>
          <span class="sr-only">{{
            t('itemHover.costAria', { cost: formatNumber(entry?.cost) })
          }}</span>
        </span>
      </div>
    </div>

    <div v-if="behavior || affects" class="item-hover-card__meta">
      <p v-if="behavior">
        {{ t('itemHover.type', { value: behavior }) }}
      </p>
      <p v-if="affects">
        {{ t('itemHover.affects', { value: affects }) }}
      </p>
    </div>

    <ul v-if="stats.length" class="item-hover-card__stats">
      <li v-for="(segments, index) in stats" :key="index">
        <template v-for="(seg, sIndex) in segments" :key="sIndex">
          <strong v-if="seg.bold" class="item-hover-num">{{ seg.text }}</strong>
          <template v-else>{{ seg.text }}</template>
        </template>
      </li>
    </ul>

    <div
      v-for="ability in abilityViews"
      :key="ability.key"
      class="item-hover-card__ability"
      :data-kind="ability.kind"
    >
      <div class="item-hover-card__ability-head">
        <strong>
          {{
            ability.kind === 'active'
              ? t('itemHover.active', { name: ability.title })
              : ability.kind === 'passive'
                ? t('itemHover.passive', { name: ability.title })
                : ability.title
          }}
        </strong>
        <span v-if="ability.showResources" class="item-hover-card__chips">
          <span
            v-if="typeof entry?.mc === 'number'"
            class="item-hover-card__chip--mana"
            :title="t('itemHover.mana', { n: entry.mc })"
          >
            <Icon name="lucide:droplet" aria-hidden="true" />
            {{ formatNumber(entry.mc) }}
          </span>
          <span
            v-if="typeof entry?.cd === 'number'"
            class="item-hover-card__chip--cooldown"
            :title="t('itemHover.cooldown', { n: entry.cd })"
          >
            <Icon name="lucide:timer" aria-hidden="true" />
            {{ formatNumber(entry.cd) }}
          </span>
        </span>
      </div>
      <p
        v-if="ability.proseSegments.length"
        class="item-hover-card__ability-body"
      >
        <template v-for="(seg, sIndex) in ability.proseSegments" :key="sIndex">
          <strong v-if="seg.bold" class="item-hover-num">{{ seg.text }}</strong>
          <template v-else>{{ seg.text }}</template>
        </template>
      </p>
      <p
        v-for="(footer, fIndex) in ability.footers"
        :key="fIndex"
        class="item-hover-card__ability-kv"
      >
        <span>{{ footer.label }}:</span>
        <span>
          <template v-for="(seg, sIndex) in footer.valueSegments" :key="sIndex">
            <strong v-if="seg.bold" class="item-hover-num">{{
              seg.text
            }}</strong>
            <template v-else>{{ seg.text }}</template>
          </template>
        </span>
      </p>
    </div>

    <p v-if="entry?.lore" class="item-hover-card__lore">
      {{ entry.lore }}
    </p>
  </AppFloatRoot>
</template>
