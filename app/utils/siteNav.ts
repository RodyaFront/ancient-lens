export type SiteNavMatchMode = 'exact' | 'section'

export type SiteNavTreeNode =
  | {
      kind: 'group'
      id: string
      /** Accessible name for the group; omit for layout-only clusters. */
      label?: string
      variant: 'primary' | 'utility' | 'tools' | 'locale'
      children: SiteNavTreeNode[]
    }
  | {
      kind: 'link'
      id: string
      label: string
      to: string
      match: SiteNavMatchMode
    }
  | {
      kind: 'action'
      id: string
      label: string
      onSelect: () => void
    }
  | {
      kind: 'icon-link'
      id: string
      label: string
      title: string
      to: string
      icon: string
      match: SiteNavMatchMode
      badge?: number
    }
  | {
      kind: 'icon-toggle'
      id: string
      label: string
      title: string
      icon: string
      pressed: boolean
      onSelect: () => void
    }
  | {
      kind: 'locale'
      id: string
      label: string
      options: Array<{ code: string; href: string; active: boolean }>
    }

export function normalizeSiteNavPath(path: string): string {
  if (!path) {
    return '/'
  }
  const trimmed = path.replace(/\/+$/, '')
  return trimmed || '/'
}

export function isSiteNavPathActive(
  currentPath: string,
  targetPath: string,
  mode: SiteNavMatchMode,
): boolean {
  const current = normalizeSiteNavPath(currentPath)
  const target = normalizeSiteNavPath(targetPath)
  if (mode === 'exact') {
    return current === target
  }
  return current === target || current.startsWith(`${target}/`)
}
