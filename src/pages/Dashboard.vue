<script setup>
defineOptions({ name: 'DashboardPage' })
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser, getUsers } from '../composables/useAuth'

// Reactive current user
const currentUser = ref(getCurrentUser())
const router = useRouter()

function handleAuthChanged(e) {
  try {
    currentUser.value = e && e.detail ? e.detail : getCurrentUser()
  } catch (error) {
    console.warn('Error handling auth changed:', error)
    currentUser.value = getCurrentUser()
  }
}

onMounted(() => {
  window.addEventListener('mm-auth-changed', handleAuthChanged)
  window.addEventListener('storage', handleStorage)
  loadEvents()
})
onUnmounted(() => {
  window.removeEventListener('mm-auth-changed', handleAuthChanged)
  window.removeEventListener('storage', handleStorage)
})

function handleStorage(e) {
  // If events changed in another tab, reload counts
  if (e.key === 'a12_demo_events_v1') loadEvents()
  if (e.key === 'mm_current_user') currentUser.value = getCurrentUser()
}

// Event storage key used by A12Demo.vue
const STORAGE_KEY = 'a12_demo_events_v1'
const myEvents = ref([])

// Control how many bookings are displayed
const showAllBookings = ref(false)
const displayLimit = 3

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all = raw ? JSON.parse(raw) : []
    if (currentUser.value && currentUser.value.email) {
      myEvents.value = all.filter(
        (ev) => (ev.email || '').toLowerCase() === currentUser.value.email.toLowerCase(),
      )
    } else {
      myEvents.value = []
    }
  } catch (err) {
    console.warn('Error loading events from storage:', err)
    myEvents.value = []
  }
}

// Handle booking deletion
function handleDeleteBooking(id) {
  if (confirm('Are you sure you want to delete this registration?')) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const all = raw ? JSON.parse(raw) : []
      const updated = all.filter((x) => x.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      loadEvents()
    } catch (error) {
      console.error('Failed to delete event from local storage', error)
      alert('Failed to delete booking.')
    }
  }
}

// If we need join date or more user info, pull full user record
const fullUser = ref(null)
function loadFullUser() {
  if (!currentUser.value || !currentUser.value.email) {
    fullUser.value = null
    return
  }
  const users = getUsers()
  fullUser.value =
    users.find((u) => u.email.toLowerCase() === currentUser.value.email.toLowerCase()) || null
}

// Watch auth changes to reload events and full user
window.addEventListener('mm-auth-changed', () => {
  loadEvents()
  loadFullUser()
})

// Initial loads
loadFullUser()
loadEvents()

// Derived data for dashboard
const upcomingEvents = computed(() => {
  // For demo, treat all user events as upcoming and sort by createdAt descending
  return myEvents.value.slice().sort((a, b) => ((b.createdAt || '') > (a.createdAt || '') ? 1 : -1))
})

// Computed property to display limited or all bookings
const displayedUpcomingEvents = computed(() => {
  if (showAllBookings.value) {
    return upcomingEvents.value
  } else {
    return upcomingEvents.value.slice(0, displayLimit)
  }
})

// Small static recommendation list (demo)
const recommended = ref([
  {
    id: 'r1',
    title: 'Sunset Yoga at Fed Square',
    excerpt: 'A gentle outdoor session for all levels.',
  },
  { id: 'r2', title: 'Community Walk - Carlton Gardens', excerpt: 'Social walking group, 5km.' },
  {
    id: 'r3',
    title: 'Mindful Movement Meditation',
    excerpt: 'Guided 30min breathing and relaxation.',
  },
])

function viewBookingDetails(ev) {
  // UI-only demo: show details
  alert(
    `Event details:\n${ev.name}\nAttendees: ${ev.attendees}\nSubmitted: ${new Date(ev.createdAt).toLocaleString()}`,
  )
}

function seeProgressReport() {
  try {
    router.push({ name: 'progress' })
  } catch (error) {
    console.warn('Navigation to progress failed', error)
  }
}
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">User Dashboard</h1>
    <!-- Upcoming bookings (left) and Progress snapshot (right) -->
    <div class="row g-4">
      <div class="col-12 col-lg-8">
        <div class="card h-100 mm-surface">
          <div class="card-body">
            <h5 class="card-title">My Upcoming Bookings</h5>
            <div class="row">
              <div class="col-12">
                <div v-if="upcomingEvents.length === 0" class="text-muted">
                  No upcoming bookings.
                </div>
                <div v-else>
                  <div
                    v-for="ev in displayedUpcomingEvents"
                    :key="ev.id"
                    class="booking-item d-flex mb-3"
                  >
                    <div class="booking-image me-3"></div>
                    <div class="flex-grow-1">
                      <div class="fw-bold">{{ ev.name }}</div>
                      <div class="small text-muted">
                        Submitted: {{ new Date(ev.createdAt).toLocaleString() }}
                      </div>
                      <div class="mt-2">
                        <div class="mb-1"><strong>Attendees:</strong> {{ ev.attendees }}</div>
                        <div class="mb-2 small text-muted">
                          Details placeholder - activity description goes here.
                        </div>
                        <div>
                          <button
                            class="btn btn-outline-primary btn-sm me-2"
                            @click="viewBookingDetails(ev)"
                          >
                            View Details
                          </button>
                          <button
                            class="btn btn-outline-secondary btn-sm"
                            @click="handleDeleteBooking(ev.id)"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="upcomingEvents.length > displayLimit && !showAllBookings" class="mt-2">
                    <button class="btn btn-light w-100" @click="showAllBookings = true">
                      View all my bookings ({{ upcomingEvents.length - displayLimit }} more)
                    </button>
                  </div>
                  <div v-if="showAllBookings" class="mt-2">
                    <button class="btn btn-light w-100" @click="showAllBookings = false">
                      Show fewer bookings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="card h-100 mm-surface">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">My Progress Snapshot</h5>
            <!-- Placeholder for actual charts / content from Progress page -->
            <div class="text-center fw-bold mb-2">
              You've attended {{ myEvents.length }} activities this month!
            </div>
            <div class="progress-details small text-muted mb-3">
              <div v-if="myEvents.length === 0" class="text-center text-muted">
                No progress data yet.
              </div>
              <div v-else>
                <div class="mb-1">
                  Last activity: {{ new Date(upcomingEvents[0].createdAt).toLocaleDateString() }}
                </div>
                <div class="mb-1">
                  Total unique activities: {{ new Set(myEvents.map((e) => e.name)).size }}
                </div>
                <div class="mb-1">Longest streak (days): 7</div>
                <div class="mb-1">Average mood: Good</div>
                <div class="mb-1">Meditation minutes: 120</div>
                <div class="mb-1">Yoga sessions: 5</div>
              </div>
            </div>
            <div class="mt-auto">
              <button class="btn btn-outline-primary w-100" @click="seeProgressReport">
                See detailed progress report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recommended for you -->
    <div class="mt-4">
      <h4 class="mb-3">Recommended For You</h4>
      <div class="row g-3">
        <div v-for="r in recommended" :key="r.id" class="col-12 col-sm-6 col-md-4">
          <div class="card mm-surface h-100">
            <div class="card-body d-flex">
              <div class="rec-image me-3"></div>
              <div>
                <div class="fw-bold">{{ r.title }}</div>
                <div class="small text-muted">{{ r.excerpt }}</div>
                <div class="mt-2">
                  <button class="btn btn-sm btn-outline-primary">View Details</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.booking-image {
  width: 140px;
  height: 90px;
  background: linear-gradient(135deg, #e9ecef, #f8f9fa);
  border-radius: 6px;
}
.rec-image {
  width: 72px;
  height: 60px;
  background: linear-gradient(135deg, #e9ecef, #f8f9fa);
  border-radius: 6px;
}
</style>
