import './assets/main.css'
import './assets/theme.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import { auth, db, onAuthStateChanged } from './firebase/index.js'
import { doc, getDoc } from 'firebase/firestore'

const app = createApp(App)
app.use(router)

// Keep local mirror of current user for compatibility with existing code
onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      let safe = {
        email: user.email,
        role: 'user',
        name: user.displayName || user.email,
        uid: user.uid,
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) {
          const data = snap.data()
          safe.role = data.role || safe.role
          safe.name = data.name || safe.name
        }
      } catch {}
      localStorage.setItem('mm_current_user', JSON.stringify(safe))
      window.dispatchEvent(new CustomEvent('mm-auth-changed', { detail: safe }))
    } else {
      localStorage.removeItem('mm_current_user')
      window.dispatchEvent(new CustomEvent('mm-auth-changed', { detail: null }))
    }
  } catch {}
})

app.mount('#app')
