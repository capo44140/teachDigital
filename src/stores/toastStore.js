import { defineStore } from 'pinia'

let nextId = 1

const DEFAULT_DURATION = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [],
    maxVisible: 3
  }),

  actions: {
    show(message, type = 'info', options = {}) {
      if (!message) return null

      const id = nextId++
      const duration = options.duration ?? DEFAULT_DURATION[type] ?? 4000
      const toast = {
        id,
        message: String(message),
        type,
        title: options.title ?? null,
        action: options.action ?? null,
        createdAt: Date.now(),
        duration
      }

      this.items.push(toast)

      while (this.items.length > this.maxVisible) {
        this.items.shift()
      }

      if (duration > 0) {
        setTimeout(() => this.dismiss(id), duration)
      }
      return id
    },

    success(message, options) { return this.show(message, 'success', options) },
    info(message, options)    { return this.show(message, 'info', options) },
    warning(message, options) { return this.show(message, 'warning', options) },
    error(message, options)   { return this.show(message, 'error', options) },

    dismiss(id) {
      const idx = this.items.findIndex(t => t.id === id)
      if (idx !== -1) this.items.splice(idx, 1)
    },

    clear() {
      this.items = []
    }
  }
})

export function useToast() {
  const store = useToastStore()
  return {
    show:    (msg, opts) => store.show(msg, 'info', opts),
    success: (msg, opts) => store.success(msg, opts),
    info:    (msg, opts) => store.info(msg, opts),
    warning: (msg, opts) => store.warning(msg, opts),
    error:   (msg, opts) => store.error(msg, opts),
    dismiss: (id) => store.dismiss(id),
    clear:   () => store.clear()
  }
}
