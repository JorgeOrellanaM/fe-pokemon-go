import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { Dialog } from 'quasar'

/** Asks whether to discard unsaved changes. Resolves `true` to leave. */
export function confirmDiscardChanges(): Promise<boolean> {
  return new Promise((resolve) => {
    Dialog.create({
      title: 'Discard unsaved changes?',
      message: "You have changes that haven't been saved. If you leave now, they will be lost.",
      ok: { label: 'Discard changes', color: 'negative', unelevated: true, noCaps: true },
      cancel: { label: 'Keep editing', color: 'secondary', flat: true, noCaps: true },
      focus: 'cancel',
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false)) // also fires on Escape / backdrop click
  })
}

/**
 * Prevents losing unsaved edits: asks before leaving the route (in-app navigation, including
 * back/forward) and triggers the browser's own prompt on reload / tab close.
 */
export function useUnsavedChangesGuard(
  isDirty: () => boolean,
  confirm: () => Promise<boolean> = confirmDiscardChanges,
) {
  const guard = async () => (isDirty() ? await confirm() : true)
  onBeforeRouteLeave(guard)
  onBeforeRouteUpdate(guard)

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty()) return
    event.preventDefault()
    // Legacy browsers need returnValue set to show the prompt.
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
