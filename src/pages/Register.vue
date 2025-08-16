<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { registerUser } from '../composables/useAuth'
import { useSuburbs } from '../composables/useSuburbs'

const router = useRouter()
const { sortedSuburbs } = useSuburbs()

const form = reactive({
  name: '',
  gender: '',
  customGender: '',
  email: '',
  password: '',
  confirmPassword: '',
  suburb: '',
  role: 'user',
  reason: '',
})
const errors = reactive({
  name: '',
  gender: '',
  email: '',
  password: '',
  confirmPassword: '',
  general: '',
})
const loading = ref(false)

// Password visibility toggles
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Password strength meter
const passwordStrength = computed(() => {
  const value = String(form.password || '')
  let score = 0
  if (value.length >= 9) score += 1
  if (/[a-z]/.test(value)) score += 1
  if (/[A-Z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  // Map to label/color
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['#dc3545', '#fd7e14', '#ffc107', '#0d6efd', '#198754']
  const idx = Math.max(0, Math.min(4, score - 1))
  const percent = (score / 5) * 100
  return { score, percent, label: labels[idx], color: colors[idx] }
})

const hasPassword = computed(() => String(form.password || '').length > 0)

// Suburb typeahead
const suburbQuery = ref('')
const showSuburbMenu = ref(false)
const filteredSuburbs = computed(() => {
  const q = (suburbQuery.value || '').toLowerCase().trim()
  if (!q) return sortedSuburbs.value
  return sortedSuburbs.value.filter((s) => s.toLowerCase().includes(q))
})
function selectSuburb(name) {
  suburbQuery.value = name
  showSuburbMenu.value = false
}

// 实时输入校验（在用户输入时立即给出红字提示）
watch(
  () => form.name,
  (v) => {
    const n = String(v || '').trim()
    if (n.length === 0) {
      errors.name = ''
    } else if (n.length < 3) {
      errors.name = 'Name must be at least 3 characters'
    } else {
      errors.name = ''
    }
  },
)

watch(
  () => form.gender,
  (v) => {
    if (!v) errors.gender = 'Please select a gender'
    else errors.gender = ''
  },
)

watch(
  () => form.email,
  (v) => {
    if (!v) {
      errors.email = ''
      return
    }
    if (!isValidEmail(v)) errors.email = 'Please enter a valid email address'
    else errors.email = ''
  },
)

watch(
  () => form.password,
  (v) => {
    if (!v) {
      errors.password = ''
      return
    }
    if (!isStrongPassword(v)) {
      errors.password = 'Password must be 9+ chars (A-Z, a-z, 0-9, !@#)'
    } else {
      errors.password = ''
    }
  },
)

watch(
  () => form.confirmPassword,
  (v) => {
    if (!v) {
      errors.confirmPassword = ''
      return
    }
    if (v !== form.password) errors.confirmPassword = 'Passwords do not match'
    else errors.confirmPassword = ''
  },
)

function clearErrors() {
  errors.name = ''
  errors.gender = ''
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''
  errors.general = ''
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  return re.test(String(email || '').toLowerCase())
}

function isStrongPassword(pw) {
  // > 8 chars (min 9), contains upper, lower, digit, special
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{9,}$/
  return re.test(String(pw || ''))
}

function validateForm() {
  clearErrors()
  let ok = true
  const name = (form.name || '').trim()
  if (name.length < 3) {
    errors.name = 'Name must be at least 3 characters'
    ok = false
  }
  if (!form.gender) {
    errors.gender = 'Please select a gender'
    ok = false
  }
  if (!isValidEmail(form.email)) {
    errors.email = 'Please enter a valid email address'
    ok = false
  }
  if (!isStrongPassword(form.password)) {
    errors.password = 'Password must be 9+ chars (A-Z, a-z, 0-9, !@#)'
    ok = false
  }
  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
    ok = false
  }
  return ok
}

async function handleSubmit() {
  clearErrors()
  try {
    if (!validateForm()) return
    loading.value = true
    // role-based redirect after registration - registerUser returns the user object
    const genderValue = form.gender === 'other' ? form.customGender || 'other' : form.gender
    const user = await registerUser({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      gender: genderValue,
      suburb: (suburbQuery.value || '').trim(),
      reason: form.reason,
    })
    if (user && user.role === 'admin') router.push({ name: 'admin' })
    else if (user && user.role === 'partner') router.push({ name: 'partner' })
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
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mm-breadcrumb">
        <li class="breadcrumb-item">
          <router-link :to="{ name: 'home' }">Home</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Register</li>
      </ol>
    </nav>
    <h1 class="fw-bold mb-3">Create your account</h1>
    <div class="row g-4 align-items-stretch">
      <!-- Left: Form -->
      <div class="col-12 col-lg-7">
        <div class="card shadow-sm h-100">
          <div class="card-body p-3 p-md-4">
            <form @submit.prevent="handleSubmit" novalidate>
              <!-- Name & Gender -->
              <div class="row g-2">
                <div class="col-12 col-md-6">
                  <label class="form-label">Full Name</label>
                  <input
                    v-model="form.name"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Jane Doe"
                    required
                  />
                  <div class="field-hint mt-1">
                    <span v-if="errors.name" class="small text-danger">{{ errors.name }}</span>
                    <span v-else class="small">&nbsp;</span>
                  </div>
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label">Gender</label>
                  <select v-model="form.gender" class="form-select" required>
                    <option value="">Select a gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="nonbinary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                  <div class="field-hint mt-1">
                    <span v-if="errors.gender" class="small text-danger">{{ errors.gender }}</span>
                    <span v-else class="small">&nbsp;</span>
                  </div>
                  <div v-if="form.gender === 'other'" class="mt-2">
                    <input
                      v-model="form.customGender"
                      type="text"
                      class="form-control"
                      placeholder="Please specify"
                    />
                  </div>
                </div>
              </div>

              <!-- Email -->
              <div class="mt-2">
                <label class="form-label">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  class="form-control"
                  placeholder="name@example.com"
                  required
                />
                <div class="field-hint mt-1">
                  <span v-if="errors.email" class="small text-danger">{{ errors.email }}</span>
                  <span v-else class="small">&nbsp;</span>
                </div>
              </div>

              <!-- Password & Confirm -->
              <div class="row g-2 mt-1">
                <div class="col-12 col-md-6">
                  <label class="form-label">Password</label>
                  <div class="input-group">
                    <input
                      :type="showPassword ? 'text' : 'password'"
                      v-model="form.password"
                      class="form-control"
                      minlength="9"
                      required
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      @click="showPassword = !showPassword"
                    >
                      {{ showPassword ? 'Hide' : 'Show' }}
                    </button>
                  </div>

                  <div class="field-hint mt-1">
                    <template v-if="errors.password">
                      <span class="small text-danger">{{ errors.password }}</span>
                    </template>
                    <template v-else> </template>
                  </div>
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label">Confirm Password</label>
                  <div class="input-group">
                    <input
                      :type="showConfirmPassword ? 'text' : 'password'"
                      v-model="form.confirmPassword"
                      class="form-control"
                      minlength="9"
                      required
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      @click="showConfirmPassword = !showConfirmPassword"
                    >
                      {{ showConfirmPassword ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                  <div class="field-hint mt-1">
                    <span v-if="errors.confirmPassword" class="small text-danger">{{
                      errors.confirmPassword
                    }}</span>
                    <span v-else class="small">&nbsp;</span>
                  </div>
                </div>
              </div>

              <!-- Suburb & Role -->
              <div class="row g-2 mt-1">
                <div class="col-12 col-md-6 position-relative">
                  <label class="form-label">Suburb</label>
                  <input
                    v-model="suburbQuery"
                    type="text"
                    class="form-control"
                    placeholder="Type to search..."
                    @focus="showSuburbMenu = true"
                    @input="showSuburbMenu = true"
                    @blur="setTimeout(() => (showSuburbMenu = false), 150)"
                  />
                  <div
                    v-if="showSuburbMenu"
                    class="typeahead-menu list-group shadow position-absolute w-100 mt-1"
                  >
                    <button
                      v-for="s in filteredSuburbs.slice(0, 10)"
                      :key="s"
                      type="button"
                      class="list-group-item list-group-item-action"
                      @mousedown.prevent="selectSuburb(s)"
                    >
                      {{ s }}
                    </button>
                    <div
                      v-if="filteredSuburbs.length === 0"
                      class="list-group-item small text-muted"
                    >
                      No matches
                    </div>
                  </div>
                  <div class="form-text">
                    <span v-if="!suburbQuery">Optional. Helps us suggest nearby activities.</span>
                    <span v-else style="visibility: hidden">&nbsp;</span>
                  </div>
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label">Role</label>
                  <select v-model="form.role" class="form-select">
                    <option value="user">User</option>
                    <option value="partner">Partner</option>
                  </select>
                </div>
              </div>

              <!-- Reason -->
              <div class="mt-3">
                <label class="form-label">Reason to Join</label>
                <textarea
                  v-model="form.reason"
                  class="form-control"
                  rows="1"
                  placeholder="Optional. Tell us about your goals (e.g. stress relief, social, fitness)."
                ></textarea>
              </div>

              <div v-if="errors.general" class="text-danger mt-3">{{ errors.general }}</div>

              <div class="d-grid mt-3">
                <button
                  class="btn btn-primary d-flex align-items-center justify-content-center gap-2"
                  :disabled="loading"
                >
                  <span
                    v-if="loading"
                    class="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>{{ loading ? 'Creating...' : 'Create account' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Right: Benefits panel -->
      <div class="col-12 col-lg-5">
        <div class="card h-100 border-0 bg-light shadow-sm">
          <div class="card-body p-3 p-md-4">
            <h2 class="h5 fw-bold mb-3">Why join Mindful Movement</h2>
            <ul class="mb-4 ps-3">
              <li class="mb-2">Discover curated, evidence-informed activities near you</li>
              <li class="mb-2">Track your progress and mood over time</li>
              <li class="mb-2">Connect with a supportive local community</li>
            </ul>
            <div class="small text-muted">
              We respect your privacy. Your data is stored securely and used only to enhance your
              experience.
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.card .form-label {
  font-weight: 600;
}
.card .form-text {
  font-size: 0.85rem;
}
.typeahead-menu {
  max-height: 220px;
  overflow-y: auto;
  z-index: 1000;
}
/* 统一红字提示高度，避免布局抖动 */
.field-hint {
  min-height: 1rem; /* 更紧凑，约 16px */
}
/* 使灰色提示与红字错误在字号与行高上保持一致 */
.field-hint .small,
.form-text {
  font-size: 0.85rem;
  line-height: 1.25;
  font-weight: 400;
}
</style>
