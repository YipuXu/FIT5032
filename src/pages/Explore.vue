<script setup>
defineOptions({ name: 'ExplorePage' })
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser } from '../composables/useAuth'

const router = useRouter()

// Google Maps API key loaded from Vite env (create .env with VITE_GOOGLE_MAPS_KEY=your_key)
const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''

// Search and filters
const query = ref('')
const typeFilter = ref('all')
const intensityFilter = ref('all')
const dateFilter = ref('any')

// Demo activity catalogue with real-ish lat/lng around Melbourne
const activities = ref([
  {
    id: 'a1',
    title: 'Sunset Yoga at Fed Square',
    type: 'yoga',
    intensity: 'low',
    when: '2025-08-24T18:00:00+10:00',
    location: 'Federation Square',
    lat: -37.8183,
    lng: 144.9671,
    rating: 4.6,
    reviews: 12,
  },
  {
    id: 'a2',
    title: 'Community Walk - Carlton Gardens',
    type: 'walk',
    intensity: 'low',
    when: '2025-08-26T09:00:00+10:00',
    location: 'Carlton Gardens',
    lat: -37.8038,
    lng: 144.9718,
    rating: 4.3,
    reviews: 19,
  },
  {
    id: 'a3',
    title: 'Creative Pottery Workshop',
    type: 'creative',
    intensity: 'medium',
    when: '2025-08-27T19:00:00+10:00',
    location: 'Collingwood Studio',
    lat: -37.7963,
    lng: 144.9885,
    rating: 4.8,
    reviews: 8,
  },
  {
    id: 'a4',
    title: 'Mindful Movement Meditation',
    type: 'meditation',
    intensity: 'low',
    when: '2025-08-29T18:30:00+10:00',
    location: 'Queen Victoria Gardens',
    lat: -37.8303,
    lng: 144.9731,
    rating: 4.5,
    reviews: 25,
  },
])

// Derived filtered list
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = activities.value.slice()
  if (q) {
    list = list.filter(
      (a) => a.title.toLowerCase().includes(q) || a.location.toLowerCase().includes(q),
    )
  }
  if (typeFilter.value !== 'all') list = list.filter((a) => a.type === typeFilter.value)
  if (intensityFilter.value !== 'all')
    list = list.filter((a) => a.intensity === intensityFilter.value)

  const now = new Date()
  if (dateFilter.value === 'week') {
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    list = list.filter((a) => new Date(a.when) <= in7)
  } else if (dateFilter.value === 'month') {
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    list = list.filter((a) => new Date(a.when) <= in30)
  }

  // Sort by soonest date
  list.sort((a, b) => new Date(a.when) - new Date(b.when))
  return list
})

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function renderStars(rating) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty)
}

// Register handler writes into the same storage used on Dashboard (A12Demo)
function handleRegister(activity) {
  const user = getCurrentUser()
  if (!user) {
    router.push({ name: 'login' })
    return
  }
  const STORAGE_KEY = 'a12_demo_events_v1'
  const newEvent = {
    id: crypto.randomUUID(),
    name: activity.title,
    email: user.email,
    attendees: 1,
    createdAt: new Date().toISOString(),
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    arr.unshift(newEvent)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    alert('Registered! You can see it in your Dashboard.')
  } catch (e) {
    alert('Failed to save registration locally.')
  }
}

const selectedId = ref(null)
function focusActivity(id) {
  selectedId.value = id
  // pan map to activity via watcher
}

// Google Maps integration
const mapContainer = ref(null)
let map = null
let markers = []
let infoWindow = null
let gmapsLoaded = false

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      gmapsLoaded = true
      resolve(window.google.maps)
      return
    }
    const existing = document.querySelector(`script[data-gmaps]`)
    if (existing) {
      existing.addEventListener('load', () => {
        gmapsLoaded = !!(window.google && window.google.maps)
        if (gmapsLoaded) resolve(window.google.maps)
        else reject(new Error('Google Maps failed to load'))
      })
      existing.addEventListener('error', () => reject(new Error('Google Maps script error')))
      return
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    s.async = true
    s.defer = true
    s.setAttribute('data-gmaps', '1')
    s.onload = () => {
      gmapsLoaded = !!(window.google && window.google.maps)
      if (gmapsLoaded) resolve(window.google.maps)
      else reject(new Error('Google Maps failed to initialize'))
    }
    s.onerror = () => reject(new Error('Google Maps script failed to load'))
    document.head.appendChild(s)
  })
}

function clearMarkers() {
  markers.forEach((m) => m.setMap(null))
  markers = []
}

function createMarkers(googleMaps) {
  clearMarkers()
  infoWindow = infoWindow || new googleMaps.InfoWindow()
  filtered.value.forEach((a) => {
    if (!a.lat || !a.lng) return
    const marker = new googleMaps.Marker({
      position: { lat: a.lat, lng: a.lng },
      map,
      title: a.title,
    })
    marker.addListener('click', () => {
      selectedId.value = a.id
      infoWindow.setContent(
        `<div><strong>${a.title}</strong><div class="small">${a.location}</div></div>`,
      )
      infoWindow.open({ anchor: marker, map })
      map.panTo({ lat: a.lat, lng: a.lng })
    })
    markers.push(marker)
  })
}

async function initMap() {
  if (!GMAPS_API_KEY) {
    console.warn('Google Maps API key not found. Please set VITE_GOOGLE_MAPS_KEY in .env')
    return
  }
  try {
    const googleMaps = await loadGoogleMaps(GMAPS_API_KEY)
    // Center on Melbourne
    const center = { lat: -37.8136, lng: 144.9631 }
    map = new googleMaps.Map(mapContainer.value, {
      center,
      zoom: 13,
      streetViewControl: false,
      fullscreenControl: false,
    })
    createMarkers(googleMaps)
    // open info when selectedId changes
    watch(selectedId, (id) => {
      const found = activities.value.find((x) => x.id === id)
      if (found && found.lat && found.lng) {
        map.panTo({ lat: found.lat, lng: found.lng })
        // find and open marker info
        const mk = markers.find((m) => m.getTitle() === found.title)
        if (mk && infoWindow) {
          infoWindow.setContent(
            `<div><strong>${found.title}</strong><div class="small">${found.location}</div></div>`,
          )
          infoWindow.open({ anchor: mk, map })
        }
      }
    })
  } catch (err) {
    // leave placeholder map if Google Maps fails
    console.warn('Google Maps load failed:', err)
  }
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  clearMarkers()
  map = null
})
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Explore Activities</h1>

    <div class="row g-3 mb-3 align-items-center">
      <div class="col-12 col-lg-5">
        <input v-model="query" class="form-control" placeholder="Search activities or locations" />
      </div>
      <div class="col-6 col-lg-2">
        <select v-model="typeFilter" class="form-select">
          <option value="all">All types</option>
          <option value="yoga">Yoga</option>
          <option value="creative">Creative</option>
          <option value="walk">Walk</option>
          <option value="meditation">Meditation</option>
        </select>
      </div>
      <div class="col-6 col-lg-2">
        <select v-model="intensityFilter" class="form-select">
          <option value="all">All intensity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div class="col-6 col-lg-2">
        <select v-model="dateFilter" class="form-select">
          <option value="any">Any date</option>
          <option value="week">Within a week</option>
          <option value="month">Within a month</option>
        </select>
      </div>
      <div class="col-6 col-lg-1">
        <button class="btn btn-primary w-100" @click.prevent>Search</button>
      </div>
    </div>

    <div class="row g-4">
      <!-- Map (Google Maps) on the left -->
      <div class="col-12 col-xl-7">
        <div class="mm-surface p-0 overflow-hidden position-relative map-box">
          <div ref="mapContainer" class="map-canvas"></div>
        </div>
      </div>

      <!-- Results list on the right -->
      <div class="col-12 col-xl-5">
        <div class="d-flex flex-column gap-3">
          <div
            v-for="a in filtered"
            :key="a.id"
            class="card shadow-sm activity-item"
            :class="{ 'border-success': selectedId === a.id }"
          >
            <div class="card-body d-flex">
              <div class="thumb me-3"></div>
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start">
                  <h6 class="mb-1">{{ a.title }}</h6>
                  <span class="small text-muted"
                    >{{ renderStars(a.rating) }} ({{ a.reviews }} reviews)</span
                  >
                </div>
                <div class="small text-muted mb-1">{{ a.location }} · {{ formatWhen(a.when) }}</div>
                <div class="mb-2">
                  <span class="mm-chip me-1 text-capitalize">{{ a.type }}</span>
                  <span class="mm-chip me-1 text-capitalize">{{ a.intensity }}</span>
                </div>
                <div class="d-flex gap-2">
                  <button class="btn btn-primary btn-sm" @click="handleRegister(a)">
                    Register
                  </button>
                  <button class="btn btn-outline-secondary btn-sm" @click="focusActivity(a.id)">
                    View details
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="filtered.length === 0" class="text-muted">No activities found.</div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.map-box {
  height: 520px;
  border-radius: 0.5rem;
}
.map-canvas {
  width: 100%;
  height: 520px;
}
.activity-item .thumb {
  width: 96px;
  height: 72px;
  border-radius: 6px;
  background: linear-gradient(135deg, #e9ecef, #f8f9fa);
}
</style>
