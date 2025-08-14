<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

// Online/Offline indicator (F.1 offline-related)
const isOnline = ref(navigator.onLine)
onMounted(() => {
  window.addEventListener('online', () => (isOnline.value = true))
  window.addEventListener('offline', () => (isOnline.value = false))
})

// BR (B.2) dynamic data sample
const sampleUsers = ref([
  { id: 'u1', name: 'Alex Chen', role: 'user', email: 'alex@example.com', createdAt: '2025-08-01' },
  {
    id: 'u2',
    name: 'Maria Rossi',
    role: 'partner',
    email: 'maria@example.com',
    createdAt: '2025-08-02',
  },
  {
    id: 'u3',
    name: 'Chloe Nguyen',
    role: 'user',
    email: 'chloe@example.com',
    createdAt: '2025-08-03',
  },
])

// BR (B.1) validation example (simple login/register UI only; no backend)
const authForm = reactive({ mode: 'login', email: '', password: '', role: 'user' })
const authErrors = reactive({ email: '', password: '', role: '' })

function validateAuth() {
  let valid = true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!authForm.email) {
    authErrors.email = 'Email is required'
    valid = false
  } else if (!emailRegex.test(authForm.email)) {
    authErrors.email = 'Invalid email format'
    valid = false
  } else {
    authErrors.email = ''
  }
  if (!authForm.password) {
    authErrors.password = 'Password is required'
    valid = false
  } else if (authForm.password.length < 6) {
    authErrors.password = 'Password must be at least 6 characters'
    valid = false
  } else {
    authErrors.password = ''
  }
  if (!authForm.role) {
    authErrors.role = 'Role is required'
    valid = false
  } else {
    authErrors.role = ''
  }
  return valid
}

// BR (C.1) basic auth (client-only mock); BR (C.2) role-based view
const currentUser = ref(null) // { email, role }

function handleAuthSubmit(e) {
  e.preventDefault()
  if (!validateAuth()) return
  currentUser.value = { email: authForm.email, role: authForm.role }
}

function signOut() {
  currentUser.value = null
}

// BR (C.3) rating with aggregated average
const ratings = ref([5, 4, 5, 3])
const newRating = ref(5)
const avgRating = computed(() => {
  if (ratings.value.length === 0) return 0
  return (ratings.value.reduce((a, b) => a + b, 0) / ratings.value.length).toFixed(1)
})
function addRating() {
  ratings.value.push(Number(newRating.value))
}

// BR (D.3) interactive table (front-end only: filter/search/sort/paginate 10/page)
const tableQuery = reactive({ search: '', sortBy: 'name', asc: true, page: 1, pageSize: 10 })
const filtered = computed(() => {
  const q = tableQuery.search.toLowerCase()
  return sampleUsers.value.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q),
  )
})
const sorted = computed(() => {
  const arr = [...filtered.value]
  arr.sort((a, b) => {
    const key = tableQuery.sortBy
    const av = a[key].toString().toLowerCase()
    const bv = b[key].toString().toLowerCase()
    if (av < bv) return tableQuery.asc ? -1 : 1
    if (av > bv) return tableQuery.asc ? 1 : -1
    return 0
  })
  return arr
})
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / tableQuery.pageSize)))
const pageItems = computed(() => {
  const start = (tableQuery.page - 1) * tableQuery.pageSize
  return sorted.value.slice(start, start + tableQuery.pageSize)
})
function setSort(key) {
  if (tableQuery.sortBy === key) tableQuery.asc = !tableQuery.asc
  else {
    tableQuery.sortBy = key
    tableQuery.asc = true
  }
}

// Selection for bulk email (F.1) and export
const selectedUserIds = ref(new Set())
function toggleSelect(id) {
  const next = new Set(selectedUserIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedUserIds.value = next
}

// E.4 Export CSV (front-end only)
function exportUsersCsv() {
  const rows = [
    ['id', 'name', 'email', 'role', 'createdAt'],
    ...sorted.value.map((u) => [u.id, u.name, u.email, u.role, u.createdAt]),
  ]
  const csv = rows
    .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'users.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// BR (E.2) Geo UI placeholder only
const mapQuery = reactive({ keyword: '', start: '', destination: '' })

// BR (E.3) accessibility: labels, aria, focus states are added across controls
</script>

<template>
  <section class="py-5">
    <div class="container">
      <h2 class="fw-bold mm-section-title mb-4">Requirements Showcase (Front-End Only)</h2>

      <!-- Online / Offline indicator -->
      <div class="mb-3" role="status" aria-live="polite">
        <span class="badge" :class="isOnline ? 'text-bg-success' : 'text-bg-secondary'">{{
          isOnline ? 'Online' : 'Offline'
        }}</span>
        <span class="ms-2 small mm-muted">This app detects connection changes.</span>
      </div>

      <!-- A.2 Responsiveness is demonstrated via Bootstrap grid across entire page -->

      <!-- B.1 Validations + C.1/C.2 Auth (client-only mock) -->
      <div class="row g-4 align-items-stretch mb-4">
        <div class="col-12 col-lg-5">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Basic Auth (Client-Only Mock)</h5>
              <p class="text-muted small">
                Email format + min password length; role selection for role-based UI.
              </p>
              <form @submit="handleAuthSubmit" novalidate aria-label="Authentication form">
                <div class="mb-3">
                  <label class="form-label" for="auth-email">Email</label>
                  <input
                    id="auth-email"
                    v-model="authForm.email"
                    type="email"
                    class="form-control"
                    placeholder="name@example.com"
                    aria-invalid="{{ !!authErrors.email }}"
                  />
                  <div v-if="authErrors.email" class="text-danger small mt-1">
                    {{ authErrors.email }}
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label" for="auth-password">Password</label>
                  <input
                    id="auth-password"
                    v-model="authForm.password"
                    type="password"
                    class="form-control"
                    placeholder="At least 6 characters"
                    aria-invalid="{{ !!authErrors.password }}"
                  />
                  <div v-if="authErrors.password" class="text-danger small mt-1">
                    {{ authErrors.password }}
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label" for="auth-role">Role</label>
                  <select
                    id="auth-role"
                    v-model="authForm.role"
                    class="form-select"
                    aria-invalid="{{ !!authErrors.role }}"
                  >
                    <option value="user">User</option>
                    <option value="partner">Partner</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div v-if="authErrors.role" class="text-danger small mt-1">
                    {{ authErrors.role }}
                  </div>
                </div>
                <button type="submit" class="btn btn-primary w-100">
                  {{ currentUser ? 'Update Role' : 'Sign In (Mock)' }}
                </button>
                <button
                  v-if="currentUser"
                  type="button"
                  class="btn btn-outline-secondary w-100 mt-2"
                  @click="signOut"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- C.2 Role-based view demo -->
        <div class="col-12 col-lg-7">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Role-Based View</h5>
              <div v-if="!currentUser" class="text-muted">
                Not signed in. Use the form to sign in (mock) and select a role.
              </div>
              <div v-else>
                <div class="mb-2">
                  Signed in as <span class="fw-semibold">{{ currentUser.email }}</span> (role:
                  <span class="mm-accent">{{ currentUser.role }}</span
                  >)
                </div>
                <div class="row g-3">
                  <div class="col-12" v-if="currentUser.role === 'user'">
                    <div class="mm-surface p-3">
                      User Panel: browse activities, manage bookings.
                    </div>
                  </div>
                  <div class="col-12" v-if="currentUser.role === 'partner'">
                    <div class="mm-surface p-3">
                      Partner Panel: create events, view attendees, manage listings.
                    </div>
                  </div>
                  <div class="col-12" v-if="currentUser.role === 'admin'">
                    <div class="mm-surface p-3">
                      Admin Panel: overview, user management, platform metrics.
                    </div>
                  </div>
                  <!-- Simple admin KPIs from sample data -->
                  <div class="col-12" v-if="currentUser.role === 'admin'">
                    <div class="row g-3">
                      <div class="col-6 col-md-3">
                        <div class="mm-surface p-3 text-center">
                          <div class="small mm-muted">Users</div>
                          <div class="fw-bold">{{ sampleUsers.length }}</div>
                        </div>
                      </div>
                      <div class="col-6 col-md-3">
                        <div class="mm-surface p-3 text-center">
                          <div class="small mm-muted">Partners</div>
                          <div class="fw-bold">
                            {{ sampleUsers.filter((u) => u.role === 'partner').length }}
                          </div>
                        </div>
                      </div>
                      <div class="col-6 col-md-3">
                        <div class="mm-surface p-3 text-center">
                          <div class="small mm-muted">Admins</div>
                          <div class="fw-bold">
                            {{ sampleUsers.filter((u) => u.role === 'admin').length }}
                          </div>
                        </div>
                      </div>
                      <div class="col-6 col-md-3">
                        <div class="mm-surface p-3 text-center">
                          <div class="small mm-muted">Ratings</div>
                          <div class="fw-bold">{{ ratings.length }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- C.3 Rating (aggregated) -->
      <div class="row g-4 align-items-stretch mb-4">
        <div class="col-12 col-lg-5">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Activity Rating</h5>
              <div class="mb-2">
                Average Rating: <span class="fw-bold mm-accent">{{ avgRating }}</span> / 5
              </div>
              <div class="d-flex align-items-center gap-2">
                <select v-model="newRating" class="form-select" style="max-width: 160px">
                  <option :value="5">5 - Excellent</option>
                  <option :value="4">4 - Good</option>
                  <option :value="3">3 - Fair</option>
                  <option :value="2">2 - Poor</option>
                  <option :value="1">1 - Bad</option>
                </select>
                <button class="btn btn-primary" @click="addRating">Add Rating</button>
              </div>
            </div>
          </div>
        </div>

        <!-- D.3 Interactive table (#1) -->
        <div class="col-12 col-lg-7">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Users Table (Search / Sort / Paginate)</h5>
              <div class="row g-2 align-items-center mb-2">
                <div class="col-12 col-md-6">
                  <input
                    v-model="tableQuery.search"
                    type="search"
                    class="form-control"
                    placeholder="Search by name, email, or role"
                    aria-label="Search users"
                  />
                </div>
                <div class="col-6 col-md-3">
                  <select v-model="tableQuery.sortBy" class="form-select" aria-label="Sort by">
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="role">Role</option>
                  </select>
                </div>
                <div class="col-6 col-md-3">
                  <button class="btn btn-secondary w-100" @click="tableQuery.asc = !tableQuery.asc">
                    {{ tableQuery.asc ? 'Asc' : 'Desc' }}
                  </button>
                </div>
              </div>

              <div class="table-responsive">
                <table class="table align-middle">
                  <thead>
                    <tr>
                      <th scope="col"><span class="visually-hidden">Select</span></th>
                      <th scope="col">
                        <button class="btn btn-link p-0" @click="setSort('name')">Name</button>
                      </th>
                      <th scope="col">
                        <button class="btn btn-link p-0" @click="setSort('email')">Email</button>
                      </th>
                      <th scope="col">
                        <button class="btn btn-link p-0" @click="setSort('role')">Role</button>
                      </th>
                      <th scope="col">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="u in pageItems" :key="u.id">
                      <td>
                        <input
                          type="checkbox"
                          :checked="selectedUserIds.has(u.id)"
                          @change="toggleSelect(u.id)"
                          aria-label="Select {{ u.name }}"
                        />
                      </td>
                      <td>{{ u.name }}</td>
                      <td>{{ u.email }}</td>
                      <td>
                        <span class="mm-chip">{{ u.role }}</span>
                      </td>
                      <td>{{ u.createdAt }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="d-flex justify-content-between align-items-center">
                <div class="small mm-muted">Page {{ tableQuery.page }} / {{ totalPages }}</div>
                <div class="btn-group">
                  <button
                    class="btn btn-outline-primary"
                    :disabled="tableQuery.page === 1"
                    @click="tableQuery.page = Math.max(1, tableQuery.page - 1)"
                  >
                    Prev
                  </button>
                  <button
                    class="btn btn-outline-primary"
                    :disabled="tableQuery.page === totalPages"
                    @click="tableQuery.page = Math.min(totalPages, tableQuery.page + 1)"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div class="d-flex flex-wrap gap-2 mt-3">
                <button class="btn btn-primary" @click="exportUsersCsv">Export CSV</button>
                <button class="btn btn-outline-secondary" :disabled="selectedUserIds.size === 0">
                  Bulk Email (UI Only)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- D.3 Interactive table (#2): minimal second table example -->
      <div class="row g-4 align-items-stretch mb-4">
        <div class="col-12">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Activities Table (Demo)</h5>
              <div class="table-responsive">
                <table class="table align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Title</th>
                      <th scope="col">Location</th>
                      <th scope="col">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Sunset Yoga</td>
                      <td>Fitzroy Gardens</td>
                      <td>Sat 17:30</td>
                    </tr>
                    <tr>
                      <td>Creative Pottery</td>
                      <td>Collingwood Studio</td>
                      <td>Wed 19:00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- D.1 External Auth (UI only) / D.2 Email (UI only) / D.4 Deploy (info) -->
      <div class="row g-4 mb-4">
        <div class="col-12 col-lg-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">External Auth (UI Only)</h5>
              <button class="btn btn-outline-primary w-100" disabled aria-disabled="true">
                Continue with Google
              </button>
              <div class="small mm-muted mt-2">
                Placeholder for Firebase Auth / OAuth providers.
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Send Email with Attachment (UI Only)</h5>
              <div class="mb-2">
                <input
                  type="text"
                  class="form-control"
                  placeholder="Subject"
                  aria-label="Email subject"
                />
              </div>
              <div class="mb-2">
                <textarea
                  class="form-control"
                  rows="3"
                  placeholder="Message"
                  aria-label="Email message"
                ></textarea>
              </div>
              <div class="mb-2">
                <input type="file" class="form-control" aria-label="Attachment" />
              </div>
              <button class="btn btn-primary w-100" disabled aria-disabled="true">Send</button>
              <div class="small mm-muted mt-2">Placeholder for SendGrid or other email API.</div>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Deployment (Info)</h5>
              <p class="mb-2">
                This project can be deployed to Cloudflare Pages / Vercel / Netlify or GCP Hosting.
              </p>
              <a class="btn btn-secondary" href="#" role="button">Deployment Guide (TBD)</a>
            </div>
          </div>
        </div>
      </div>

      <!-- E.1 Cloud Functions (concept UI only) + E.2 Geo (map UI placeholder) -->
      <div class="row g-4 mb-4">
        <div class="col-12 col-lg-5">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Serverless Actions (UI Only)</h5>
              <p class="small mm-muted">
                Trigger background tasks like generate reports, notify attendees, etc.
              </p>
              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-outline-primary" disabled aria-disabled="true">
                  Trigger Report
                </button>
                <button class="btn btn-outline-primary" disabled aria-disabled="true">
                  Sync Partners
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-7">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Map (Search & Route UI Placeholder)</h5>
              <div class="row g-2 mb-2">
                <div class="col-12 col-md-4">
                  <input
                    v-model="mapQuery.keyword"
                    class="form-control"
                    placeholder="Search places of interest"
                    aria-label="Search places"
                  />
                </div>
                <div class="col-6 col-md-3">
                  <input
                    v-model="mapQuery.start"
                    class="form-control"
                    placeholder="Start"
                    aria-label="Start"
                  />
                </div>
                <div class="col-6 col-md-3">
                  <input
                    v-model="mapQuery.destination"
                    class="form-control"
                    placeholder="Destination"
                    aria-label="Destination"
                  />
                </div>
                <div class="col-12 col-md-2 d-grid">
                  <button class="btn btn-primary" disabled aria-disabled="true">Go</button>
                </div>
              </div>
              <div
                class="ratio ratio-16x9 rounded-3 bg-white border d-flex align-items-center justify-content-center"
              >
                <div class="text-muted">Map Placeholder</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- F.1 Innovation UI samples -->
      <div class="row g-4 mb-4">
        <div class="col-12 col-lg-6">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Booking Calendar (UI Only)</h5>
              <div class="d-flex gap-2 mb-2">
                <input type="date" class="form-control" aria-label="Pick date" />
                <select class="form-select" aria-label="Pick time">
                  <option>09:00</option>
                  <option>10:00</option>
                  <option>11:00</option>
                </select>
                <button class="btn btn-primary" disabled aria-disabled="true">Book</button>
              </div>
              <div class="row row-cols-7 g-1">
                <div class="col" v-for="d in 28" :key="d">
                  <div
                    class="p-3 text-center rounded mm-surface"
                    :class="{ 'border border-danger': d % 7 === 0 }"
                  >
                    {{ d }}
                  </div>
                </div>
              </div>
              <div class="small mm-muted mt-2">Red slots indicate conflicts (demo only).</div>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Interactive Chart (Placeholder)</h5>
              <div class="ratio ratio-16x9 mm-surface d-flex align-items-end p-3 gap-2">
                <div
                  v-for="h in [3, 5, 2, 6, 4]"
                  :key="h"
                  class="flex-grow-1"
                  :style="{ height: `${h}rem`, background: 'var(--mm-green)' }"
                ></div>
              </div>
              <div class="small mm-muted mt-2">Simulated chart bars from mock data.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-12 col-lg-6">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Bulk Email (UI Only)</h5>
              <p class="small mm-muted">Selected users: {{ selectedUserIds.size }}</p>
              <input
                type="text"
                class="form-control mb-2"
                placeholder="Subject"
                aria-label="Bulk email subject"
              />
              <textarea
                class="form-control mb-2"
                rows="3"
                placeholder="Message"
                aria-label="Bulk email message"
              ></textarea>
              <button
                class="btn btn-primary"
                :disabled="selectedUserIds.size === 0"
                aria-disabled="{{ selectedUserIds.size===0 }}"
              >
                Send (Mock)
              </button>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Public API (Docs Preview)</h5>
              <pre class="mm-surface p-3 small mb-2">
GET /api/activities
200 OK
[
  { "id": "a1", "title": "Sunset Yoga" }
]</pre
              >
              <pre class="mm-surface p-3 small">
GET /api/partners
200 OK
[
  { "id": "p1", "name": "Maria Rossi" }
]</pre
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Security note (C.4): input validation is performed on client; avoid v-html; escape user strings when rendering -->
      <div class="alert alert-warning" role="alert">
        Security (Front-End Only Demo): Client-side validation is implemented. Avoid rendering
        untrusted HTML. Sanitize/escape content when necessary.
      </div>
    </div>
  </section>
</template>

<style scoped>
.card-title {
  color: var(--mm-forest);
}
</style>
