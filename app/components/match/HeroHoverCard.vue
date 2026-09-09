<script setup lang="ts">
import { primaryAttrIconSrc, type PrimaryAttrKey } from '#shared/match'
import {
  formatArmorDisplay,
  formatAttrGain,
  formatDamageRange,
  formatOrdinal,
  formatRegen,
  formatWinRatePercent,
} from '~/utils/heroFormat'
import { steamAssetUrl } from '~/utils/matchFormat'

const props = defineProps<{
  heroId: number
  triggerEl: HTMLElement | null
  sticky?: boolean
  matchLevel?: number | null
}>()

const { t, locale } = useI18n()
const store = useMatchStore()
const preview = useHeroPreview()
const { ensureHeroMeta, snapshot } = useHeroMeta()

const failed = ref(false)

onMounted(() => {
  void ensureHeroMeta()
})

const profile = computed(() => {
  void snapshot.value
  return store.heroProfile(props.heroId, props.matchLevel ?? null)
})

const name = computed(
  () => profile.value?.name || t('format.heroFallback', { id: props.heroId }),
)

const imageUrl = computed(() => steamAssetUrl(profile.value?.img))

const attrIcon = computed(() =>
  primaryAttrIconSrc(profile.value?.primaryAttrKey),
)

const primaryLabel = computed(() => {
  const key = profile.value?.primaryAttrKey
  return key ? t(`heroHover.primary.${key}`) : null
})

const attackTypeLabel = computed(() => {
  const raw = profile.value?.attackType
  if (!raw) {
    return null
  }
  const key = raw.trim().toLowerCase()
  if (key === 'melee' || key === 'ranged') {
    return t(`heroHover.attack.${key}`)
  }
  return raw
})

const attrRows = computed(() => {
  const attrs = profile.value?.attrs
  if (!attrs) {
    return [] as {
      key: Exclude<PrimaryAttrKey, 'all'>
      icon: string
      label: string
      value: string
    }[]
  }
  return (['str', 'agi', 'int'] as const).map((key) => ({
    key,
    icon: primaryAttrIconSrc(key)!,
    label: t(`heroHover.attr.${key}`),
    value: formatAttrGain(attrs[key].base, attrs[key].gain),
  }))
})

const vitalRows = computed(() => {
  const p = profile.value
  if (!p) {
    return [] as { key: string; icon: string; label: string; value: string }[]
  }
  const rows: { key: string; icon: string; label: string; value: string }[] = []
  if (p.damage) {
    rows.push({
      key: 'damage',
      icon: 'lucide:swords',
      label: t('heroHover.damage'),
      value: formatDamageRange(p.damage.min, p.damage.max),
    })
  }
  if (p.armor != null) {
    rows.push({
      key: 'armor',
      icon: 'lucide:shield',
      label: t('heroHover.armor'),
      value: formatArmorDisplay(p.armor),
    })
  }
  if (p.moveSpeed != null) {
    rows.push({
      key: 'move',
      icon: 'lucide:footprints',
      label: t('heroHover.moveSpeed'),
      value: String(p.moveSpeed),
    })
  }
  if (p.attackRate != null) {
    rows.push({
      key: 'bat',
      icon: 'lucide:timer',
      label: t('heroHover.attackRate'),
      value: Number.isInteger(p.attackRate)
        ? String(p.attackRate)
        : p.attackRate.toFixed(1),
    })
  }
  if (p.magicResist != null) {
    rows.push({
      key: 'mr',
      icon: 'lucide:waves',
      label: t('heroHover.magicResist'),
      value: `${p.magicResist}%`,
    })
  }
  if (p.attackRange != null) {
    rows.push({
      key: 'range',
      icon: 'lucide:crosshair',
      label: t('heroHover.attackRange'),
      value: String(p.attackRange),
    })
  }
  return rows
})

const rolesLine = computed(() => {
  const parts: string[] = []
  if (attackTypeLabel.value) {
    parts.push(attackTypeLabel.value)
  }
  for (const role of profile.value?.roles ?? []) {
    if (!parts.includes(role)) {
      parts.push(role)
    }
  }
  return parts.join(' · ')
})

const metaStats = computed(() => {
  const meta = profile.value?.meta
  if (!meta || meta.winRate == null) {
    return null
  }
  const winRate = meta.winRate
  const tone: 'up' | 'down' | 'even' =
    winRate >= 0.52 ? 'up' : winRate <= 0.48 ? 'down' : 'even'
  const rank =
    meta.popularityRank == null
      ? null
      : locale.value === 'uk'
        ? String(meta.popularityRank)
        : formatOrdinal(meta.popularityRank)
  return {
    rank,
    rate: formatWinRatePercent(winRate),
    tone,
  }
})

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
    :surface-class="['hero-hover-card', { 'is-pinned': sticky }]"
    role="tooltip"
    data-hero-preview-card
    @pointerenter="preview.retain(heroId)"
    @pointerleave="preview.leave(heroId)"
    @wheel.stop
  >
    <MatchHoverPin :sticky="sticky" />
    <div class="hero-hover-card__body">
      <div class="hero-hover-card__identity">
        <span class="hero-hover-card__icon">
          <img
            v-if="imageUrl && !failed"
            :src="imageUrl"
            :alt="name"
            @error="failed = true"
          />
          <span v-else>{{ name.slice(0, 3) }}</span>
        </span>
        <div class="hero-hover-card__title-block">
          <strong class="hero-hover-card__name">{{ name }}</strong>
          <div class="hero-hover-card__subtitle">
            <span
              v-if="attrIcon && primaryLabel"
              class="hero-hover-card__primary"
              :data-attr="profile?.primaryAttrKey"
            >
              <img
                class="hero-hover-card__attr-icon"
                :src="attrIcon"
                alt=""
                width="14"
                height="14"
                decoding="async"
                aria-hidden="true"
              />
              {{ primaryLabel }}
            </span>
            <span
              v-if="typeof profile?.matchLevel === 'number'"
              class="hero-hover-card__level"
            >
              {{ t('heroHover.level', { n: profile.matchLevel }) }}
            </span>
          </div>
        </div>
      </div>

      <ul v-if="attrRows.length" class="hero-hover-card__attrs">
        <li
          v-for="row in attrRows"
          :key="row.key"
          class="hero-hover-card__attr"
          :data-attr="row.key"
        >
          <img
            class="hero-hover-card__attr-icon"
            :src="row.icon"
            alt=""
            width="12"
            height="12"
            decoding="async"
            aria-hidden="true"
          />
          <span class="hero-hover-card__attr-label">{{ row.label }}</span>
          <strong class="hero-hover-card__attr-value">{{ row.value }}</strong>
        </li>
      </ul>

      <ul v-if="vitalRows.length" class="hero-hover-card__vitals">
        <li
          v-for="row in vitalRows"
          :key="row.key"
          class="hero-hover-card__vital"
          :title="row.label"
        >
          <Icon :name="row.icon" aria-hidden="true" />
          <span class="sr-only">{{ row.label }}</span>
          <strong>{{ row.value }}</strong>
        </li>
      </ul>

      <div
        v-if="profile?.health"
        class="hero-hover-card__bar is-health"
        :aria-label="
          t('heroHover.healthDetail', {
            n: Math.round(profile.health.value),
            regen: formatRegen(profile.health.regen),
          })
        "
      >
        <span class="hero-hover-card__bar-label">{{
          t('heroHover.health')
        }}</span>
        <div class="hero-hover-card__bar-track" aria-hidden="true">
          <span class="hero-hover-card__bar-value">{{
            Math.round(profile.health.value)
          }}</span>
          <span class="hero-hover-card__bar-regen">{{
            formatRegen(profile.health.regen)
          }}</span>
        </div>
      </div>
      <div
        v-if="profile?.mana"
        class="hero-hover-card__bar is-mana"
        :aria-label="
          t('heroHover.manaDetail', {
            n: Math.round(profile.mana.value),
            regen: formatRegen(profile.mana.regen),
          })
        "
      >
        <span class="hero-hover-card__bar-label">{{
          t('heroHover.mana')
        }}</span>
        <div class="hero-hover-card__bar-track" aria-hidden="true">
          <span class="hero-hover-card__bar-value">{{
            Math.round(profile.mana.value)
          }}</span>
          <span class="hero-hover-card__bar-regen">{{
            formatRegen(profile.mana.regen)
          }}</span>
        </div>
      </div>

      <p v-if="rolesLine" class="hero-hover-card__roles">{{ rolesLine }}</p>

      <div
        v-if="metaStats"
        class="hero-hover-card__meta"
        :aria-label="
          metaStats.rank
            ? t('heroHover.meta', {
                rank: metaStats.rank,
                rate: metaStats.rate,
              })
            : t('heroHover.winRateOnly', { rate: metaStats.rate })
        "
      >
        <div v-if="metaStats.rank" class="hero-hover-card__meta-item">
          <strong class="hero-hover-card__meta-value">{{
            metaStats.rank
          }}</strong>
          <span class="hero-hover-card__meta-label">{{
            t('heroHover.popularity')
          }}</span>
        </div>
        <div class="hero-hover-card__meta-item">
          <strong
            class="hero-hover-card__meta-value"
            :data-tone="metaStats.tone"
          >
            {{ metaStats.rate }}
          </strong>
          <span class="hero-hover-card__meta-label">{{
            t('heroHover.winRate')
          }}</span>
        </div>
      </div>
    </div>
  </AppFloatRoot>
</template>
