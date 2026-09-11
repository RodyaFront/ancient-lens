<script setup lang="ts">
import {
  abilityAffectsLabel,
  abilityAttribRows,
  abilityBehaviorLabel,
  cleanAbilityName,
  damageTypeTone,
  formatLevelValueSegments,
  hasAbilityResources,
  yesNoTone,
} from '~/utils/abilityHover'
import { emphasizeNumberSegments } from '~/utils/itemHover'
import { initials, steamAssetUrl } from '~/utils/matchFormat'

const props = defineProps<{
  abilityId: number
  skillRank?: number | null
  triggerEl: HTMLElement | null
  sticky?: boolean
}>()

const { t } = useI18n()
const store = useMatchStore()
const preview = useAbilityPreview()
const failed = ref(false)

const entry = computed(() => store.abilityById(props.abilityId))
const name = computed(() => {
  const cleaned = cleanAbilityName(entry.value?.dname)
  return cleaned || t('format.abilityFallback', { id: props.abilityId })
})
const imageUrl = computed(() => {
  if (entry.value?.isTalent) {
    return '/images/dota2/talent_tree.svg'
  }
  return steamAssetUrl(entry.value?.img)
})

const behavior = computed(() => abilityBehaviorLabel(entry.value))
const affects = computed(() => abilityAffectsLabel(entry.value))
const dmgType = computed(() => entry.value?.dmg_type?.trim() || null)
const pierce = computed(() => entry.value?.bkbpierce?.trim() || null)
const dispellable = computed(() => entry.value?.dispellable?.trim() || null)

const descSegments = computed(() =>
  entry.value?.desc ? emphasizeNumberSegments(entry.value.desc) : [],
)
const attribRows = computed(() =>
  abilityAttribRows(entry.value, props.skillRank),
)
const showResources = computed(() => hasAbilityResources(entry.value))
const manaSegments = computed(() =>
  formatLevelValueSegments(entry.value?.mc, props.skillRank),
)
const cdSegments = computed(() =>
  formatLevelValueSegments(entry.value?.cd, props.skillRank),
)

const showMeta = computed(
  () =>
    !entry.value?.isTalent &&
    Boolean(
      behavior.value ||
      affects.value ||
      dmgType.value ||
      pierce.value ||
      dispellable.value,
    ),
)

function metaYesNoLabel(value: string): string {
  const key = value.trim().toLowerCase()
  if (key === 'yes') {
    return t('abilityHover.yes')
  }
  if (key === 'no') {
    return t('abilityHover.no')
  }
  return value
}

function metaDamageLabel(value: string): string {
  const key = value.trim().toLowerCase()
  if (key === 'magical' || key === 'physical' || key === 'pure') {
    return t(`abilityHover.dmg.${key}`)
  }
  return value
}

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
    :surface-class="['ability-hover-card', { 'is-pinned': sticky }]"
    role="tooltip"
    data-ability-preview-card
    @pointerenter="preview.retain(abilityId)"
    @pointerleave="preview.leave(abilityId)"
    @wheel.stop
  >
    <MatchHoverPin :sticky="sticky" />
    <div class="ability-hover-card__body">
      <div class="ability-hover-card__identity">
        <span
          class="ability-hover-card__icon"
          :class="{ 'is-talent': entry?.isTalent }"
        >
          <img
            v-if="imageUrl && !failed"
            :src="imageUrl"
            :alt="name"
            @error="failed = true"
          />
          <span v-else>{{ initials(name, 3) }}</span>
        </span>
        <div class="ability-hover-card__title-block">
          <strong class="ability-hover-card__name">{{ name }}</strong>
          <span v-if="entry?.isTalent" class="ability-hover-card__badge">
            {{ t('abilityHover.talent') }}
          </span>
        </div>
      </div>

      <div v-if="showMeta" class="ability-hover-card__meta">
        <p v-if="behavior">
          <span class="ability-hover-card__meta-label">{{
            t('abilityHover.target')
          }}</span>
          <span>{{ behavior }}</span>
        </p>
        <p v-if="affects">
          <span class="ability-hover-card__meta-label">{{
            t('abilityHover.affects')
          }}</span>
          <span>{{ affects }}</span>
        </p>
        <p v-if="dmgType">
          <span class="ability-hover-card__meta-label">{{
            t('abilityHover.damageType')
          }}</span>
          <span :data-tone="damageTypeTone(dmgType) ?? undefined">{{
            metaDamageLabel(dmgType)
          }}</span>
        </p>
        <p v-if="pierce">
          <span class="ability-hover-card__meta-label">{{
            t('abilityHover.pierce')
          }}</span>
          <span :data-tone="yesNoTone(pierce) ?? undefined">{{
            metaYesNoLabel(pierce)
          }}</span>
        </p>
        <p v-if="dispellable">
          <span class="ability-hover-card__meta-label">{{
            t('abilityHover.dispellable')
          }}</span>
          <span :data-tone="yesNoTone(dispellable) ?? undefined">{{
            metaYesNoLabel(dispellable)
          }}</span>
        </p>
      </div>

      <p v-if="descSegments.length" class="ability-hover-card__desc">
        <template v-for="(seg, sIndex) in descSegments" :key="sIndex">
          <strong v-if="seg.bold" class="ability-hover-num">{{
            seg.text
          }}</strong>
          <template v-else>{{ seg.text }}</template>
        </template>
      </p>

      <ul v-if="attribRows.length" class="ability-hover-card__attribs">
        <li v-for="(row, index) in attribRows" :key="index">
          <span class="ability-hover-card__attrib-label">{{ row.label }}:</span>
          <span>
            <template v-for="(seg, sIndex) in row.valueSegments" :key="sIndex">
              <strong
                v-if="seg.bold"
                class="ability-hover-num"
                :class="{ 'is-active': seg.active }"
                >{{ seg.text }}</strong
              >
              <template v-else>{{ seg.text }}</template>
            </template>
          </span>
        </li>
      </ul>

      <div v-if="showResources" class="ability-hover-card__resources">
        <span
          v-if="manaSegments.length"
          class="ability-hover-card__chip ability-hover-card__chip--mana"
          :title="t('abilityHover.mana')"
        >
          <img
            class="ability-hover-card__res-icon"
            src="/images/dota2/ability_manacost.png"
            alt=""
            width="12"
            height="12"
            decoding="async"
          />
          <span>
            <template v-for="(seg, sIndex) in manaSegments" :key="sIndex">
              <strong
                v-if="seg.bold"
                class="ability-hover-num"
                :class="{ 'is-active': seg.active }"
                >{{ seg.text }}</strong
              >
              <template v-else>{{ seg.text }}</template>
            </template>
          </span>
        </span>
        <span
          v-if="cdSegments.length"
          class="ability-hover-card__chip ability-hover-card__chip--cooldown"
          :title="t('abilityHover.cooldown')"
        >
          <img
            class="ability-hover-card__res-icon"
            src="/images/dota2/ability_cooldown.png"
            alt=""
            width="12"
            height="12"
            decoding="async"
          />
          <span>
            <template v-for="(seg, sIndex) in cdSegments" :key="sIndex">
              <strong
                v-if="seg.bold"
                class="ability-hover-num"
                :class="{ 'is-active': seg.active }"
                >{{ seg.text }}</strong
              >
              <template v-else>{{ seg.text }}</template>
            </template>
          </span>
        </span>
      </div>

      <p v-if="entry?.lore" class="ability-hover-card__lore">
        {{ entry.lore }}
      </p>
    </div>
  </AppFloatRoot>
</template>
