export { useEventTypes }

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db } from '../firebase/index.js'
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore'

function useEventTypes() {
  const defaultTypes = ['Outdoor', 'Mindfulness', 'meditation', 'creative', 'Social']
  const custom = ref([])
  let unsubscribe = null

  function start() {
    try {
      const col = collection(db, 'eventTypes')
      unsubscribe = onSnapshot(col, (snap) => {
        const list = []
        snap.forEach((d) => {
          const data = d.data() || {}
          const key = (data.key || d.id || '').toString()
          if (key && !defaultTypes.includes(key)) list.push(key)
        })
        custom.value = list
      })
    } catch {
      custom.value = []
    }
  }

  async function addCustom(name) {
    const key = (name || '').trim().toLowerCase()
    if (!key) return false
    if (defaultTypes.includes(key)) return false
    if (custom.value.find((t) => t.toLowerCase() === key)) return false
    try {
      await setDoc(doc(db, 'eventTypes', key), {
        key,
        displayName: key.charAt(0).toUpperCase() + key.slice(1),
        createdAt: new Date().toISOString(),
      })
      return true
    } catch {
      return false
    }
  }

  onMounted(start)
  onUnmounted(() => {
    try {
      if (unsubscribe) unsubscribe()
    } catch {}
  })

  const allTypes = computed(() => {
    const extras = custom.value.filter((c) => !defaultTypes.includes(c))
    return [...defaultTypes, ...extras]
  })

  return { allTypes, custom, addCustom }
}
