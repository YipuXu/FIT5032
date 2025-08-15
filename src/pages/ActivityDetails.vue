<script setup>
defineOptions({ name: 'ActivityDetailsPage' })
import { ref, computed, onMounted } from 'vue'
import { getCurrentUser, getUsers } from '../composables/useAuth'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const PARTNER_EVENTS_KEY = 'partner_events_v1'
const REVIEWS_KEY = 'mm_reviews_v1'
const BOOKINGS_KEY = 'a12_demo_events_v1'

const activity = ref(null)
const reviews = ref([])
const owner = ref(null)
const seriesAgg = ref({})
const ownerAgg = ref({})
const ratingAvg = computed(() => {
  if (!reviews.value.length) return 0
  const sum = reviews.value.reduce((s, r) => s + (Number(r.rating) || 0), 0)
  return (sum / reviews.value.length).toFixed(1)
})

const mapEl = ref(null)
let map = null
let marker = null
let directionsRenderer = null

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google.maps)
    const existing = document.querySelector('script[data-gmaps]')
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google && window.google.maps) resolve(window.google.maps)
        else reject(new Error('Maps failed'))
      })
      existing.addEventListener('error', () => reject(new Error('Maps script error')))
      return
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY || ''}`
    s.async = true
    s.defer = true
    s.setAttribute('data-gmaps', '1')
    s.onload = () => {
      if (window.google && window.google.maps) resolve(window.google.maps)
      else reject(new Error('Maps init failed'))
    }
    s.onerror = () => reject(new Error('Maps load error'))
    document.head.appendChild(s)
  })
}

onMounted(async () => {
  const idParam = route.params.id
  const id = String(idParam || '').replace(/^pe_/, '')
  try {
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const ev = all.find((e) => String(e.id) === id)
    if (ev) {
      activity.value = ev
      // resolve owner (host) info from stored users
      try {
        const users = getUsers()
        owner.value =
          users.find(
            (u) => (u.email || '').toLowerCase() === (ev.ownerEmail || '').toLowerCase(),
          ) || null
      } catch (_) {
        owner.value = null
      }
    }
  } catch {}
  try {
    const rawR = localStorage.getItem(REVIEWS_KEY)
    const allR = rawR ? JSON.parse(rawR) : []
    reviews.value = allR.filter((r) => String(r.activityId || '').replace(/^pe_/, '') === id)
  } catch {}

  if (activity.value && activity.value.lat && activity.value.lng) {
    try {
      const g = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_KEY || '')
      // themed styles (match Explore)
      const styles = [
        { elementType: 'geometry', stylers: [{ color: '#f0f2ec' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#5a6b5a' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
        { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7b6b' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e9e9e4' }] },
      ]
      map = new g.Map(mapEl.value, {
        center: { lat: activity.value.lat, lng: activity.value.lng },
        zoom: 14,
        streetViewControl: false,
        styles,
      })
      // theme marker using CSS variable colors
      const root = getComputedStyle(document.documentElement)
      const fillColor = root.getPropertyValue('--mm-green').trim() || '#588157'
      const strokeColor = root.getPropertyValue('--mm-forest').trim() || '#344e41'
      const svg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<?xml version="1.0"?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' fill='${fillColor}' stroke='${strokeColor}' stroke-width='2'/></svg>`)}`
      marker = new g.Marker({
        map,
        position: { lat: activity.value.lat, lng: activity.value.lng },
        icon: { url: svg, scaledSize: new g.Size(36, 36) },
      })
    } catch (err) {
      console.warn('Activity details map failed', err)
    }
  }
})

function getCurrentUserSafe() {
  try {
    return getCurrentUser()
  } catch {
    return null
  }
}

const currentUser = computed(() => getCurrentUserSafe())
const isOwner = computed(() => {
  return (
    currentUser.value &&
    activity.value &&
    currentUser.value.role === 'partner' &&
    (currentUser.value.email || '').toLowerCase() ===
      (activity.value.ownerEmail || '').toLowerCase()
  )
})

function registerForActivity() {
  const user = getCurrentUserSafe()
  if (!user) {
    alert('Please login to register for this activity.')
    return
  }
  const existing = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]').find(
    (b) =>
      String(b.activityId).replace(/^pe_/, '') === String(activity.value.id || activity.value.id) &&
      b.email === user.email,
  )
  if (existing) {
    alert('You have already registered for this activity.')
    return
  }
  const booking = {
    id: crypto.randomUUID(),
    activityId: activity.value.id,
    email: user.email,
    name: activity.value.title,
    location: activity.value.location,
    dateTime: activity.value.dateTime || null,
    attendees: 1,
    createdAt: new Date().toISOString(),
  }
  const arr = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]')
  arr.unshift(booking)
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(arr))
  alert('Registered successfully!')
}

async function openRoute() {
  if (!activity.value || !activity.value.lat || !activity.value.lng)
    return alert('No location available')
  if (!window.google || !window.google.maps) return alert('Map not ready')

  // ask origin
  let origin = null
  const useGeo = confirm('Use your current location as start? Press Cancel to enter an address.')
  if (useGeo && 'geolocation' in navigator) {
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
      )
      origin = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch (err) {
      console.warn('Geolocation failed', err)
    }
  }
  if (!origin) {
    const addr = prompt('Enter start address (e.g. a suburb or street)')
    if (!addr) return
    origin = addr
  }

  try {
    const service = new window.google.maps.DirectionsService()
    if (!directionsRenderer)
      directionsRenderer = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: false,
      })

    const request = {
      origin,
      destination: { lat: activity.value.lat, lng: activity.value.lng },
      travelMode: window.google.maps.TravelMode.WALKING,
    }
    service.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result)
        if (result.routes && result.routes[0] && result.routes[0].bounds) {
          map.fitBounds(result.routes[0].bounds)
        }
      } else {
        console.warn('Directions request failed:', status, result)
        alert(
          'Directions request failed: ' +
            status +
            (status === 'REQUEST_DENIED' ? '\nHint: Enable Directions API and billing.' : ''),
        )
        // fallback: open Google Maps directions in new tab
        try {
          const originParam =
            typeof origin === 'string' ? encodeURIComponent(origin) : `${origin.lat},${origin.lng}`
          const destParam = `${activity.value.lat},${activity.value.lng}`
          const url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=walking`
          window.open(url, '_blank')
        } catch (err) {
          console.warn('Fallback directions URL failed', err)
        }
      }
    })
  } catch (err) {
    console.warn('Routing failed', err)
    alert('Routing failed. See console for details.')
  }
}

function clearRoute() {
  if (directionsRenderer) {
    try {
      directionsRenderer.setMap(null)
    } catch (err) {
      console.warn('Error clearing directions renderer', err)
    }
    directionsRenderer = null
  }
}

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

// REVIEW SUBMISSION
const ratingValue = ref(5)
const commentText = ref('')

function loadReviewAggMaps() {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const bySeries = {}
    const byOwner = {}
    for (const r of all) {
      if (r.seriesId) {
        const k = r.seriesId
        bySeries[k] = bySeries[k] || { sum: 0, count: 0 }
        bySeries[k].sum += Number(r.rating) || 0
        bySeries[k].count += 1
      }
      if (r.ownerEmail) {
        const k = r.ownerEmail
        byOwner[k] = byOwner[k] || { sum: 0, count: 0 }
        byOwner[k].sum += Number(r.rating) || 0
        byOwner[k].count += 1
      }
    }
    seriesAgg.value = bySeries
    ownerAgg.value = byOwner
  } catch (err) {
    seriesAgg.value = {}
    ownerAgg.value = {}
  }
}

function submitReview() {
  const user = getCurrentUser()
  if (!user) return alert('Please login to submit a review.')
  if (!activity.value) return
  try {
    const raw = localStorage.getItem(REVIEWS_KEY)
    const all = raw ? JSON.parse(raw) : []
    // replace if same user & activity
    const idx = all.findIndex(
      (r) =>
        String(r.activityId || '').replace(/^pe_/, '') === String(activity.value.id) &&
        r.email === user.email,
    )
    const newR = {
      id: crypto.randomUUID(),
      activityId: String(activity.value.id),
      seriesId: activity.value.recurring ? activity.value.seriesId : null,
      ownerEmail: activity.value.ownerEmail || null,
      email: user.email,
      rating: Number(ratingValue.value),
      comment: commentText.value || '',
      createdAt: new Date().toISOString(),
    }
    if (idx > -1) all[idx] = newR
    else all.push(newR)
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(all))
    // reload local state
    reviews.value = all.filter(
      (r) => String(r.activityId || '').replace(/^pe_/, '') === String(activity.value.id),
    )
    loadReviewAggMaps()
    // notify other pages
    window.dispatchEvent(new CustomEvent('mm-reviews-changed'))
    alert('Review submitted!')
  } catch (err) {
    console.error('Submit review failed', err)
    alert('Failed to save review')
  }
}

function contactHost() {
  if (owner && owner.email) {
    alert(`Contacting host: ${owner.email} (simulation)`)
  } else if (activity.value && activity.value.ownerEmail) {
    alert(`Contacting host: ${activity.value.ownerEmail} (simulation)`)
  } else {
    alert('Host contact not available.')
  }
}
</script>

<template>
  <main class="container py-4">
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mm-breadcrumb">
        <li class="breadcrumb-item">
          <router-link :to="{ name: 'explore' }">Explore Activities</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Activity Details</li>
      </ol>
    </nav>
    <h1 class="fw-bold mb-3">{{ activity?.title || 'Activity Details' }}</h1>

    <div v-if="activity" class="row g-4">
      <div class="col-12 col-lg-7">
        <div class="card mm-surface h-100 activity-card">
          <div class="card-body">
            <div class="mb-2 field-row">
              <div class="field-label">Date/Time</div>
              <div class="field-value text-muted">{{ fmt(activity.dateTime) }}</div>
            </div>
            <div class="mb-2 field-row">
              <div class="field-label">Location</div>
              <div class="field-value">{{ activity.location }}</div>
            </div>
            <div class="mb-2 field-row">
              <div class="field-label">Capacity</div>
              <div class="field-value">{{ activity.capacity }}</div>
            </div>
            <div class="mb-2 field-row align-items-center">
              <div class="field-label">Host</div>
              <div class="field-value">
                <span v-if="owner">{{ owner.name || owner.email }}</span>
                <span v-else>{{ activity.ownerEmail || 'Unknown' }}</span>
              </div>
              <div class="ms-auto">
                <button class="btn btn-sm btn-outline-secondary" @click="contactHost">
                  Contact Host
                </button>
              </div>
            </div>
            <div class="mb-2 field-row">
              <div class="field-label">Type</div>
              <div class="field-value">
                <span class="mm-chip text-capitalize">{{ activity.type || 'other' }}</span>
              </div>
            </div>
            <div class="mb-2 field-row">
              <div class="field-label">Intensity</div>
              <div class="field-value">
                <span class="mm-chip text-capitalize">{{ activity.intensity || 'N/A' }}</span>
              </div>
            </div>
            <div v-if="activity.details" class="mt-3">
              <h6 class="fw-bold">Details</h6>
              <p class="mb-0" style="white-space: pre-line">{{ activity.details }}</p>
            </div>
            <div class="my-3">
              <button
                v-if="isOwner"
                class="btn btn-secondary me-2"
                @click="router.push({ name: 'partner-edit', params: { id: activity.id } })"
              >
                Edit Activity
              </button>
              <button v-else class="btn btn-secondary me-2" @click="registerForActivity">
                Register
              </button>
              <button class="btn btn-outline-secondary" @click="openRoute">Route</button>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-5">
        <div class="card mm-surface h-100">
          <div class="card-body">
            <div ref="mapEl" style="height: 320px" class="border rounded"></div>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card mm-surface">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Reviews</h5>
              <span class="badge bg-success">Avg: {{ ratingAvg }}★</span>
            </div>
            <div v-if="reviews.length === 0" class="text-muted">No reviews yet.</div>
            <ul class="list-group" v-else>
              <li
                v-for="r in reviews"
                :key="r.id"
                class="list-group-item d-flex justify-content-between"
              >
                <div>
                  <div class="fw-bold">{{ r.email }}</div>
                  <div class="small text-muted">{{ new Date(r.createdAt).toLocaleString() }}</div>
                  <div class="mt-1" style="white-space: pre-line">{{ r.comment || '' }}</div>
                </div>
                <div class="ms-3 align-self-start">{{ Number(r.rating).toFixed(1) }}★</div>
              </li>
            </ul>
            <div class="mt-3">
              <h6 class="mb-2">Submit a review</h6>
              <div class="d-flex align-items-center gap-2 mb-2">
                <label class="small mb-0">Rating:</label>
                <select v-model="ratingValue" class="form-select form-select-sm w-auto">
                  <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>
              <textarea
                v-model="commentText"
                class="form-control mb-2"
                rows="2"
                placeholder="Leave a comment (optional)"
              ></textarea>
              <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm" @click="submitReview">Submit Review</button>
                <button
                  class="btn btn-outline-secondary btn-sm"
                  @click="((commentText = ''), (ratingValue = 5))"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-muted">Activity not found.</div>
  </main>
</template>

<style scoped>
.btn-sm {
  padding-top: 0rem;
  padding-bottom: 0rem;
}
.activity-card .card-body {
  padding: 1.25rem;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.field-label {
  min-width: 80px;
  font-weight: 700;
  color: var(--mm-deep, #344e41);
}
.field-value {
  color: var(--bs-body-color, #212529);
}
.activity-card h6 {
  margin-bottom: 0.5rem;
  font-weight: 700;
}
</style>
