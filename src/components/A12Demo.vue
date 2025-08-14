<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'

const STORAGE_KEY = 'a12_demo_events_v1'

const form = reactive({
  name: '',
  email: '',
  attendees: 1,
})

const errors = reactive({
  name: '',
  email: '',
  attendees: '',
})

const events = ref([])

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    events.value = raw ? JSON.parse(raw) : []
  } catch (_) {
    events.value = []
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.value))
}

function validate() {
  let valid = true
  // Required + min length for name
  if (!form.name) {
    errors.name = 'Name is required'
    valid = false
  } else if (form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
    valid = false
  } else {
    errors.name = ''
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email) {
    errors.email = 'Email is required'
    valid = false
  } else if (!emailRegex.test(form.email)) {
    errors.email = 'Invalid email format'
    valid = false
  } else {
    errors.email = ''
  }

  // Number range for attendees
  if (form.attendees === '' || form.attendees === null) {
    errors.attendees = 'Number of attendees is required'
    valid = false
  } else if (Number(form.attendees) < 1 || Number(form.attendees) > 20) {
    errors.attendees = 'Number of attendees must be between 1 and 20'
    valid = false
  } else {
    errors.attendees = ''
  }

  return valid
}

function handleSubmit(e) {
  e.preventDefault()
  if (!validate()) return

  const newEvent = {
    id: crypto.randomUUID(),
    name: form.name.trim(),
    email: form.email.trim(),
    attendees: Number(form.attendees),
    createdAt: new Date().toISOString(),
  }
  // Update reactive list
  events.value.unshift(newEvent)
  saveToStorage()
  // Reset form
  form.name = ''
  form.email = ''
  form.attendees = 1
}

function removeEvent(id) {
  events.value = events.value.filter((ev) => ev.id !== id)
  saveToStorage()
}

const totalAttendees = computed(() => events.value.reduce((sum, ev) => sum + ev.attendees, 0))

onMounted(loadFromStorage)
</script>

<template>
  <div class="container my-4">
    <div class="row g-4">
      <div class="col-12 col-lg-5">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">Event Registration Example (A1.2)</h5>
            <p class="text-muted mb-3">
              Demonstrates BR A (Responsiveness) & BR B (Input Validation: required, email format,
              range; Dynamic Data from LocalStorage).
            </p>
            <form @submit="handleSubmit" novalidate>
              <div class="mb-3">
                <label class="form-label">Name</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-control"
                  placeholder="e.g., Alex"
                />
                <div v-if="errors.name" class="text-danger small mt-1">{{ errors.name }}</div>
              </div>

              <div class="mb-3">
                <label class="form-label">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  class="form-control"
                  placeholder="name@example.com"
                />
                <div v-if="errors.email" class="text-danger small mt-1">{{ errors.email }}</div>
              </div>

              <div class="mb-3">
                <label class="form-label">Attendees (1-20)</label>
                <input
                  v-model.number="form.attendees"
                  type="number"
                  min="1"
                  max="20"
                  class="form-control"
                />
                <div v-if="errors.attendees" class="text-danger small mt-1">
                  {{ errors.attendees }}
                </div>
              </div>

              <button type="submit" class="btn btn-primary w-100">Submit</button>
            </form>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-7">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="card-title mb-0">Registration List (Dynamic Data)</h5>
              <span class="badge text-bg-secondary">Total Attendees: {{ totalAttendees }}</span>
            </div>
            <div v-if="events.length === 0" class="text-muted">
              No data yet. Submit the form on the left first.
            </div>
            <ul v-else class="list-group">
              <li
                v-for="ev in events"
                :key="ev.id"
                class="list-group-item d-flex justify-content-between align-items-start"
              >
                <div class="me-3">
                  <div class="fw-bold">{{ ev.name }} ({{ ev.attendees }} people)</div>
                  <div class="small text-muted">
                    {{ ev.email }} · {{ new Date(ev.createdAt).toLocaleString() }}
                  </div>
                </div>
                <button class="btn btn-sm btn-outline-danger" @click="removeEvent(ev.id)">
                  Delete
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Light visual enhancements */
.card-title {
  font-weight: 600;
}
</style>
