import type { SiteNavTreeNode } from '~/utils/siteNav'

export function useSiteNav(options: { onSources: () => void }) {
  const { t, locale, locales } = useI18n()
  const localePath = useLocalePath()
  const switchLocalePath = useSwitchLocalePath()
  const store = useMatchStore()
  const { muted, toggleMute } = useScoreAudio()

  onMounted(() => {
    store.loadSaved()
  })

  const tree = computed((): SiteNavTreeNode[] => {
    const savedCount = store.saved.length

    return [
      {
        kind: 'group',
        id: 'primary',
        variant: 'primary',
        children: [
          {
            kind: 'link',
            id: 'overview',
            label: t('nav.overview'),
            to: localePath({ name: 'index' }),
            match: 'exact',
          },
          {
            kind: 'link',
            id: 'matches',
            label: t('nav.matches'),
            to: localePath({ name: 'matches' }),
            match: 'section',
          },
          {
            kind: 'action',
            id: 'source',
            label: t('nav.sources'),
            onSelect: options.onSources,
          },
        ],
      },
      {
        kind: 'group',
        id: 'utility',
        variant: 'utility',
        children: [
          {
            kind: 'group',
            id: 'tools',
            label: t('nav.tools'),
            variant: 'tools',
            children: [
              {
                kind: 'icon-link',
                id: 'saved',
                label: t('nav.savedAria', { count: savedCount }),
                title: t('nav.saved'),
                to: localePath({ name: 'saved' }),
                icon: 'lucide:bookmark',
                match: 'section',
                badge: savedCount > 0 ? savedCount : undefined,
              },
              {
                kind: 'icon-toggle',
                id: 'mute',
                label: muted.value ? t('nav.unmute') : t('nav.mute'),
                title: muted.value ? t('nav.unmute') : t('nav.mute'),
                icon: muted.value ? 'lucide:volume-x' : 'lucide:volume-2',
                pressed: muted.value,
                onSelect: () => toggleMute(),
              },
            ],
          },
          {
            kind: 'locale',
            id: 'locale',
            label: t('nav.language'),
            options: (
              locales.value as Array<{ code: 'en' | 'uk'; name?: string }>
            ).map((entry) => ({
              code: entry.code,
              href: switchLocalePath(entry.code),
              active: locale.value === entry.code,
            })),
          },
        ],
      },
    ]
  })

  return { tree }
}
