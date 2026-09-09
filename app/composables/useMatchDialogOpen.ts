/** Native `#info-dialog` host id (MatchDialog). */
export const MATCH_DIALOG_ID = 'info-dialog'

/** True while the match chrome `<dialog>` is open via `showModal()`. */
export function useMatchDialogOpen() {
  return useState('ancient-lens-match-dialog-open', () => false)
}

/**
 * Float tips must Teleport into the open modal dialog — `showModal()` uses the
 * browser top layer, so body-level z-index cannot paint above it.
 */
export function useFloatTeleportTo() {
  const open = useMatchDialogOpen()
  return computed(() => (open.value ? `#${MATCH_DIALOG_ID}` : 'body'))
}
