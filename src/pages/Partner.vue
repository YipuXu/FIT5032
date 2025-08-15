<script setup>
defineOptions({ name: 'PartnerPage' })
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getCurrentUser } from '../composables/useAuth'

// Storage keys
const PARTNER_EVENTS_KEY = 'partner_events_v1'
const BOOKINGS_KEY = 'a12_demo_events_v1' // reuse user registrations

// Reactive state
const currentUser = ref(getCurrentUser())
const myEvents = ref([])
const allBookings = ref([])

const showCreate = ref(false)
const form = ref({
  title: '',
  location: '',
  date: '',
  time: '',
  capacity: 10,
  lat: null,
  lng: null,
  type: 'yoga',
})
const editingId = ref(null)

// Google Maps for partner event location picker
const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
const partnerMapEl = ref(null)
let partnerMap = null
let partnerMarker = null
let partnerPlacesAutocomplete = null

function loadGoogleMapsPartner(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google.maps)
    const existing = document.querySelector('script[data-gmaps]')
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google && window.google.maps) resolve(window.google.maps)
        else reject(new Error('Google Maps failed to load'))
      })
      existing.addEventListener('error', () => reject(new Error('Google Maps script error')))
      return
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    s.async = true
    s.defer = true
    s.setAttribute('data-gmaps', '1')
    s.onload = () => {
      if (window.google && window.google.maps) resolve(window.google.maps)
      else reject(new Error('Google Maps failed to initialize'))
    }
    s.onerror = () => reject(new Error('Google Maps script failed to load'))
    document.head.appendChild(s)
  })
}

async function initPartnerMap() {
  if (!GMAPS_API_KEY) return
  try {
    const g = await loadGoogleMapsPartner(GMAPS_API_KEY)
    const center = { lat: -37.8136, lng: 144.9631 }
    partnerMap = new g.Map(partnerMapEl.value, { center, zoom: 13, streetViewControl: false })
    partnerMarker = new g.Marker({ map: partnerMap })
    partnerMap.addListener('click', (ev) => {
      const lat = ev.latLng.lat()
      const lng = ev.latLng.lng()
      form.value.lat = lat
      form.value.lng = lng
      partnerMarker.setPosition({ lat, lng })
    })
    // Autocomplete for location input
    const locInput = document.getElementById('partner-location-input')
    if (locInput) {
      partnerPlacesAutocomplete = new g.places.Autocomplete(locInput)
      partnerPlacesAutocomplete.addListener('place_changed', () => {
        const place = partnerPlacesAutocomplete.getPlace()
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          form.value.lat = lat
          form.value.lng = lng
          partnerMarker.setPosition({ lat, lng })
          partnerMap.panTo({ lat, lng })
        }
      })
    }
  } catch (err) {
    console.warn('Partner map init failed', err)
  }
}

watch(showCreate, (v) => {
  if (v) setTimeout(() => initPartnerMap(), 300)
})

function handleAuthChanged(e) {
  try {
    currentUser.value = e && e.detail ? e.detail : getCurrentUser()
    loadAll()
  } catch (error) {
    currentUser.value = getCurrentUser()
  }
}

onMounted(() => {
  window.addEventListener('mm-auth-changed', handleAuthChanged)
  window.addEventListener('storage', handleStorage)
  loadAll()
})
onUnmounted(() => {
  window.removeEventListener('mm-auth-changed', handleAuthChanged)
  window.removeEventListener('storage', handleStorage)
})

function handleStorage(e) {
  if (e.key === PARTNER_EVENTS_KEY || e.key === BOOKINGS_KEY || e.key === 'mm_current_user') {
    loadAll()
  }
}

function loadAll() {
  loadEvents()
  loadBookings()
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const email = currentUser.value ? currentUser.value.email : ''
    myEvents.value = all
      .filter((ev) => (ev.ownerEmail || '').toLowerCase() === (email || '').toLowerCase())
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
  } catch (error) {
    myEvents.value = []
  }
}

function loadBookings() {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    allBookings.value = raw ? JSON.parse(raw) : []
  } catch (error) {
    allBookings.value = []
  }
}

function resetForm() {
  form.value = {
    title: '',
    location: '',
    date: '',
    time: '',
    capacity: 10,
    lat: null,
    lng: null,
    type: 'yoga',
  }
  editingId.value = null
}

function createEvent() {
  if (!form.value.title || !form.value.location || !form.value.date || !form.value.time) {
    alert('Please fill in Title, Location, Date and Time.')
    return
  }
  try {
    const dateTime = new Date(`${form.value.date}T${form.value.time}`)
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    if (editingId.value) {
      const idx = all.findIndex((e) => e.id === editingId.value)
      if (idx >= 0) {
        all[idx].title = form.value.title.trim()
        all[idx].location = form.value.location.trim()
        all[idx].dateTime = dateTime.toISOString()
        all[idx].capacity = Number(form.value.capacity) || 10
        all[idx].lat = form.value.lat || null
        all[idx].lng = form.value.lng || null
        all[idx].type = form.value.type || 'other'
        // migrate existing bookings to keep association by id
        try {
          const rawBk = localStorage.getItem(BOOKINGS_KEY)
          const list = rawBk ? JSON.parse(rawBk) : []
          let changed = false
          for (const b of list) {
            if (b.activityId === editingId.value) {
              if (b.name !== all[idx].title || b.location !== all[idx].location) {
                b.name = all[idx].title
                b.location = all[idx].location
                changed = true
              }
            }
          }
          if (changed) localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list))
        } catch (err) {
          console.warn('Failed to migrate existing bookings after event update', err)
        }
      }
    } else {
      const event = {
        id: crypto.randomUUID(),
        ownerEmail: currentUser.value ? currentUser.value.email : '',
        title: form.value.title.trim(),
        location: form.value.location.trim(),
        dateTime: dateTime.toISOString(),
        capacity: Number(form.value.capacity) || 10,
        lat: form.value.lat || null,
        lng: form.value.lng || null,
        type: form.value.type || 'other',
      }
      all.push(event)
    }
    localStorage.setItem(PARTNER_EVENTS_KEY, JSON.stringify(all))
    showCreate.value = false
    resetForm()
    loadEvents()
  } catch (error) {
    alert('Failed to create event')
  }
}

function editEvent(id) {
  try {
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const ev = all.find((x) => x.id === id)
    if (!ev) return
    form.value.title = ev.title || ''
    form.value.location = ev.location || ''
    form.value.date = ev.dateTime ? new Date(ev.dateTime).toISOString().slice(0, 10) : ''
    form.value.time = ev.dateTime ? new Date(ev.dateTime).toISOString().slice(11, 16) : ''
    form.value.capacity = ev.capacity || 10
    form.value.lat = ev.lat || null
    form.value.lng = ev.lng || null
    form.value.type = ev.type || 'other'
    editingId.value = id
    showCreate.value = true
    setTimeout(() => {
      try {
        if (partnerMarker && form.value.lat != null && form.value.lng != null) {
          partnerMarker.setPosition({ lat: form.value.lat, lng: form.value.lng })
          if (partnerMap) partnerMap.panTo({ lat: form.value.lat, lng: form.value.lng })
        }
      } catch (err) {
        console.warn('Set marker for edit failed', err)
      }
    }, 300)
  } catch (err) {
    console.warn('Edit event failed', err)
  }
}

function deleteEvent(id) {
  if (!confirm('Delete this event?')) return
  try {
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const updated = all.filter((e) => e.id !== id)
    localStorage.setItem(PARTNER_EVENTS_KEY, JSON.stringify(updated))
    loadEvents()
  } catch (error) {
    alert('Failed to delete this event')
  }
}

function bookedCountFor(ev) {
  return allBookings.value.filter((b) => b.activityId === ev.id).length
}

// KPIs
const totalBookingsThisMonth = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 1)
  const myTitles = new Set(myEvents.value.map((e) => (e.title || '').toLowerCase()))
  return allBookings.value.filter((b) => {
    const t = new Date(b.createdAt)
    return myTitles.has((b.name || '').toLowerCase()) && t >= start && t < end
  }).length
})

const activeEvents = computed(() => {
  const now = new Date()
  return myEvents.value.filter((e) => new Date(e.dateTime) >= now).length
})

// For demo, synthesize review stats from bookings
const newReviews = computed(() => Math.min(5, totalBookingsThisMonth.value))
const averageRating = computed(() => {
  if (totalBookingsThisMonth.value === 0) return '4.8'
  const base = 4.2
  const adj = Math.min(0.6, totalBookingsThisMonth.value * 0.05)
  return (base + adj).toFixed(1)
})

// Activity feed (latest 5)
const recentFeed = computed(() => {
  const myTitles = new Set(myEvents.value.map((e) => (e.title || '').toLowerCase()))
  const items = allBookings.value
    .filter((b) => myTitles.has((b.name || '').toLowerCase()))
    .slice(-20)
    .reverse()
    .map((b) => {
      const when = new Date(b.createdAt).toLocaleString()
      return `${b.email || 'Someone'} just booked your ${b.name}. (${when})`
    })
  if (items.length === 0) {
    return ['No recent activity. Create an event to start receiving bookings.']
  }
  return items.slice(0, 5)
})
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Partner Dashboard</h1>

    <!-- KPI Row -->
    <div class="row g-3 align-items-stretch mb-3">
      <div class="col-6 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-5 fw-bold">{{ totalBookingsThisMonth }}</div>
            <div class="small text-muted">Total Bookings (This Month)</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-5 fw-bold">{{ activeEvents }}</div>
            <div class="small text-muted">Active Events</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-5 fw-bold">{{ newReviews }}</div>
            <div class="small text-muted">New Reviews</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-5 fw-bold">{{ averageRating }}★</div>
            <div class="small text-muted">Average Rating</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create form -->
    <div v-if="showCreate" class="card mb-3">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-2">
            <label class="form-label small">Title</label>
            <input v-model="form.title" class="form-control" placeholder="Beginner's Yoga" />
          </div>
          <div class="col-12 col-md-2">
            <label class="form-label small">Location</label>
            <input
              id="partner-location-input"
              v-model="form.location"
              class="form-control"
              placeholder="Carlton Gardens"
            />
          </div>
          <div class="col-12 col-md-2">
            <label class="form-label small">Type</label>
            <select v-model="form.type" class="form-select">
              <option value="yoga">Yoga</option>
              <option value="walk">Walk</option>
              <option value="meditation">Meditation</option>
              <option value="creative">Creative</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small">Date</label>
            <input v-model="form.date" type="date" class="form-control" />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small">Time</label>
            <input v-model="form.time" type="time" class="form-control" />
          </div>
          <div class="col-6 col-md-1">
            <label class="form-label small">Capacity</label>
            <input v-model.number="form.capacity" type="number" min="1" class="form-control" />
          </div>
          <div class="col-6 col-md-1 d-grid">
            <button class="btn btn-success" @click="createEvent">Save</button>
          </div>
        </div>
        <div class="mt-3">
          <small class="text-muted">Or pick location on map:</small>
          <div ref="partnerMapEl" class="border rounded mt-2" style="height: 220px"></div>
          <div class="small text-muted mt-2">
            Selected:
            <strong
              >{{ form.lat ? form.lat.toFixed(5) : '-' }},
              {{ form.lng ? form.lng.toFixed(5) : '-' }}</strong
            >
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-xl-7">
        <div class="card mm-surface h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="card-title mb-0">Upcoming Events Schedule</h5>
              <button class="btn btn-primary btn-sm" @click="showCreate = !showCreate">
                + Create New Event
              </button>
            </div>
            <div class="table-responsive">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Booked / Capacity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ev in myEvents" :key="ev.id">
                    <td>{{ ev.title }}</td>
                    <td>{{ new Date(ev.dateTime).toLocaleString() }}</td>
                    <td>{{ bookedCountFor(ev) }} / {{ ev.capacity }}</td>
                    <td>
                      <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-secondary" @click="editEvent(ev.id)">
                          Manage
                        </button>
                        <button class="btn btn-outline-danger" @click="deleteEvent(ev.id)">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="myEvents.length === 0">
                    <td colspan="4" class="text-muted">
                      No events yet. Use "Create New Event" to add your first activity.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-5">
        <div class="card mm-surface h-100">
          <div class="card-body">
            <h5 class="card-title">Recent Activity Feed</h5>
            <div class="d-flex flex-column gap-2">
              <div
                v-for="(msg, i) in recentFeed"
                :key="i"
                class="mm-surface px-3 py-2 rounded border small"
              >
                {{ msg }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
