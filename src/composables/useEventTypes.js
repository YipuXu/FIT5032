export { useEventTypes }

import { ref, computed } from 'vue'

function useEventTypes() {
  const KEY = 'mm_event_types_v1'
  const defaultTypes = ['Outdoor', 'Mindfulness', 'meditation', 'creative', 'Social']
  const custom = ref([])

  function load() {
    try {
      const raw = localStorage.getItem(KEY)
      custom.value = raw ? JSON.parse(raw) : []
    } catch (e) {
      custom.value = []
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(custom.value))
    } catch (e) {
      console.warn('Failed to save custom event types', e)
    }
  }

  function addCustom(name) {
    const n = (name || '').trim()
    if (!n) return false
    // prevent duplicates (case-insensitive)
    if (custom.value.find((t) => t.toLowerCase() === n.toLowerCase())) return false
    custom.value.push(n)
    save()
    // notify others
    window.dispatchEvent(new CustomEvent('mm-event-types-changed'))
    return true
  }

  load()

  const allTypes = computed(() => {
    // include defaults, then custom ones not already present
    const extras = custom.value.filter((c) => !defaultTypes.includes(c))
    return [...defaultTypes, ...extras]
  })

  // Listen for external changes
  window.addEventListener('mm-event-types-changed', load)

  return { allTypes, custom, addCustom }
}
