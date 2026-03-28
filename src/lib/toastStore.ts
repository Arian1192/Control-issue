export type ToastItem = {
  id: string
  message: string
  type: 'success' | 'info' | 'error'
}

let toasts: ToastItem[] = []
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function addToast(message: string, type: ToastItem['type'] = 'info', duration = 4000) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { id, message, type }]
  notify()
  setTimeout(() => removeToast(id), duration)
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToasts() {
  return toasts
}
