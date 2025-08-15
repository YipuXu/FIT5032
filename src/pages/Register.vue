<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerUser } from '../composables/useAuth'

const router = useRouter()
const form = reactive({ name: '', email: '', password: '', role: 'user' })
const errors = reactive({ name: '', email: '', password: '', general: '' })
const loading = ref(false)

function clearErrors() {
  errors.name = errors.email = errors.password = errors.general = ''
}

async function handleSubmit() {
  clearErrors()
  loading.value = true
  try {
    await registerUser({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
    })
    const u = JSON.parse(localStorage.getItem('mm_current_user') || 'null')
    // role-based redirect after registration
    if (u && u.role === 'admin') router.push({ name: 'admin' })
    else if (u && u.role === 'partner') router.push({ name: 'partner' })
    else router.push({ name: 'dashboard' })
  } catch (err) {
    errors.general = err.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Register</h1>
    <div class="row">
      <div class="col-12 col-md-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <form @submit.prevent="handleSubmit" novalidate>
              <div class="mb-3">
                <label class="form-label">Full Name</label>
                <input v-model="form.name" type="text" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input
                  v-model="form.password"
                  type="password"
                  class="form-control"
                  minlength="6"
                  required
                />
              </div>
              <div class="mb-3">
                <label class="form-label">Role</label>
                <select v-model="form.role" class="form-select">
                  <option value="user">User</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div v-if="errors.general" class="text-danger mb-2">{{ errors.general }}</div>
              <div class="d-grid">
                <button class="btn btn-primary" :disabled="loading">Create account</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
