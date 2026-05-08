import { create } from 'zustand'

let _id = 0

const useToastStore = create((set) => ({
  toasts: [],
  add(options) {
    const id = ++_id
    const item = { id, open: true, duration: 4000, variant: 'default', ...options }
    set((s) => ({ toasts: [...s.toasts, item] }))
    if (item.duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, item.duration)
    }
    return id
  },
  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

// Hook for use inside React components
export function useToast() {
  const { toasts, add, remove } = useToastStore()
  return { toasts, toast: add, dismiss: remove }
}

// Standalone helper usable anywhere (outside components too)
export const toast = (options) => useToastStore.getState().add(options)

export { useToastStore }
