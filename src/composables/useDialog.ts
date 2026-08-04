import { nextTick, readonly, shallowRef } from 'vue'

export type DialogTone = 'default' | 'warning' | 'danger'

interface CommonDialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: DialogTone
}

export interface ConfirmDialogOptions extends CommonDialogOptions {}

export interface PromptDialogOptions extends CommonDialogOptions {
  defaultValue?: string
  inputLabel?: string
  placeholder?: string
  validate?: (value: string) => string | null | undefined
}

export type DialogRequest =
  | {
      id: number
      type: 'confirm'
      options: ConfirmDialogOptions
    }
  | {
      id: number
      type: 'prompt'
      options: PromptDialogOptions
    }

type DialogResult = boolean | string | null

interface QueuedDialog {
  request: DialogRequest
  resolve: (value: DialogResult) => void
  restoreFocusTo: HTMLElement | null
}

const activeDialog = shallowRef<DialogRequest | null>(null)
const queue: QueuedDialog[] = []
let activeEntry: QueuedDialog | null = null
let nextDialogId = 1

function currentFocusTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

function showNextDialog() {
  activeEntry = queue.shift() ?? null
  activeDialog.value = activeEntry?.request ?? null
}

function enqueueDialog<T extends DialogResult>(
  request: DialogRequest,
): Promise<T> {
  return new Promise<T>((resolve) => {
    queue.push({
      request,
      resolve: resolve as (value: DialogResult) => void,
      restoreFocusTo: currentFocusTarget(),
    })
    if (!activeEntry) showNextDialog()
  })
}

function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return enqueueDialog<boolean>({
    id: nextDialogId++,
    type: 'confirm',
    options,
  })
}

function promptDialog(options: PromptDialogOptions): Promise<string | null> {
  return enqueueDialog<string | null>({
    id: nextDialogId++,
    type: 'prompt',
    options,
  })
}

function settleDialog(value: DialogResult) {
  const settled = activeEntry
  if (!settled) return

  showNextDialog()
  settled.resolve(value)

  if (!activeEntry) {
    void nextTick(() => {
      if (!activeEntry && settled.restoreFocusTo?.isConnected) {
        settled.restoreFocusTo.focus()
      }
    })
  }
}

function resolveDialog(value: boolean | string) {
  settleDialog(value)
}

function cancelDialog() {
  if (!activeEntry) return
  settleDialog(activeEntry.request.type === 'confirm' ? false : null)
}

export function useDialog() {
  return {
    activeDialog: readonly(activeDialog),
    confirmDialog,
    promptDialog,
    resolveDialog,
    cancelDialog,
  }
}

export function __resetDialogsForTests() {
  activeEntry?.resolve(activeEntry.request.type === 'confirm' ? false : null)
  queue.splice(0).forEach(entry => {
    entry.resolve(entry.request.type === 'confirm' ? false : null)
  })
  activeEntry = null
  activeDialog.value = null
  nextDialogId = 1
}
