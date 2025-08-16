import './assets/main.css'
import './assets/theme.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import { auth, onAuthStateChanged } from './firebase/index.js'

const app = createApp(App)
app.use(router)

// Keep local mirror of current user for compatibility with existing code
onAuthStateChanged(auth, (user) => {
  try {
    if (user) {
      const users = (() => {
        try {
          return JSON.parse(localStorage.getItem('mm_users') || '[]')
        } catch {
          return []
        }
      })()
      const local = users.find(
        (u) => (u.email || '').toLowerCase() === (user.email || '').toLowerCase(),
      )
      const safe = {
        email: user.email,
        role: local?.role || 'user',
        name: user.displayName || local?.name || user.email,
        uid: user.uid,
      }
      localStorage.setItem('mm_current_user', JSON.stringify(safe))
      window.dispatchEvent(new CustomEvent('mm-auth-changed', { detail: safe }))
    } else {
      localStorage.removeItem('mm_current_user')
      window.dispatchEvent(new CustomEvent('mm-auth-changed', { detail: null }))
    }
  } catch {}
})

app.mount('#app')
