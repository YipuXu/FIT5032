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

// Autocomplete suggestions for unified search input (use `query` as the single input)
const placeSuggestions = ref([])
let predictionTimer = null

// Partner events storage key
const PARTNER_EVENTS_KEY = 'partner_events_v1'
const REVIEWS_KEY = 'mm_reviews_v1'

// Activities list starts empty; partners will add events via Partner dashboard which syncs into this page.
const activities = ref([])
const reviewsAggById = ref({})

function loadReviewsAgg() {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const map = new Map()
    for (const r of all) {
      const id = String(r.activityId || '').replace(/^pe_/, '')
      if (!id) continue
      const rating = Number(r.rating)
      if (Number.isNaN(rating)) continue
      const cur = map.get(id) || { sum: 0, count: 0 }
      cur.sum += rating
      cur.count += 1
      map.set(id, cur)
    }
    const agg = {}
    map.forEach((v, k) => (agg[k] = { count: v.count, avg: v.count ? v.sum / v.count : 0 }))
    reviewsAggById.value = agg
  } catch (err) {
    reviewsAggById.value = {}
  }
}

// Merge helper to add/update activities without duplicates
function upsertActivities(items) {
  const mapById = new Map(activities.value.map((a) => [a.id, a]))
  let changed = false
  for (const item of items) {
    if (mapById.has(item.id)) {
      const tgt = mapById.get(item.id)
      const keys = Object.keys(item)
      for (const k of keys) {
        if (tgt[k] !== item[k]) {
          tgt[k] = item[k]
          changed = true
        }
      }
    } else {
      activities.value.push(item)
      changed = true
    }
  }
  if (changed && window.google && window.google.maps && gmapsLoaded && map) {
    try {
      createMarkers(window.google.maps)
    } catch (err) {
      console.warn('Recreate markers after upsert failed', err)
    }
  }
}

function inferTypeFromTitle(title) {
  const t = (title || '').toLowerCase()
  if (t.includes('yoga')) return 'yoga'
  if (t.includes('walk')) return 'walk'
  if (t.includes('meditation')) return 'meditation'
  if (t.includes('creative') || t.includes('workshop')) return 'creative'
  return 'other'
}

function syncPartnerActivitiesFromStorage() {
  try {
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const mapped = all.map((e) => {
      const agg = reviewsAggById.value[String(e.id)] || { avg: 0, count: 0 }
      return {
        // Keep a prefixed id for map/list rendering but retain original id separately
        id: `pe_${e.id}`,
        originalId: e.id,
        title: e.title,
        type: inferTypeFromTitle(e.title),
        intensity: 'medium',
        when: e.dateTime,
        location: e.location,
        lat: e.lat || null,
        lng: e.lng || null,
        rating: Number((agg.avg || 0).toFixed(1)),
        reviews: agg.count || 0,
      }
    })
    upsertActivities(mapped)
    if (placesServiceObj) geocodeMissingPartnerLatLng()
  } catch (error) {
    console.warn('Failed to sync partner events', error)
  }
}

function geocodeMissingPartnerLatLng() {
  if (!placesServiceObj) return
  const items = activities.value.filter((a) => a.id.startsWith('pe_') && (!a.lat || !a.lng))
  if (items.length === 0) return
  items.forEach((a) => {
    try {
      placesServiceObj.findPlaceFromQuery(
        { query: a.location, fields: ['geometry'] },
        (results, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            results &&
            results.length &&
            results[0].geometry &&
            results[0].geometry.location
          ) {
            a.lat = results[0].geometry.location.lat()
            a.lng = results[0].geometry.location.lng()
            if (gmapsLoaded && map && window.google && window.google.maps) {
              try {
                createMarkers(window.google.maps)
              } catch (re) {
                console.warn('Recreate markers after geocode failed', re)
              }
            }
          }
        },
      )
    } catch (err) {
      console.warn('Geocoding failed for partner event', a, err)
    }
  })
}

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
  const val = Number(rating) || 0
  // Round to nearest integer: 4.5 -> 5, 4.4 -> 4
  const lit = Math.min(5, Math.max(0, Math.round(val)))
  return '★'.repeat(lit) + '☆'.repeat(5 - lit)
}

// Register handler writes into the same storage used on Dashboard (A12Demo)
function handleRegister(activity) {
  if (!currentUser.value) {
    alert('Please login to register for an activity.')
    return
  }

  // Prevent duplicate registration for the same user and activity
  const existingBooking = userActivityBooking(activity.id).value
  if (existingBooking) {
    alert('You have already registered for this activity.')
    return
  }

  const currentBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]')
  const booking = {
    id: crypto.randomUUID(),
    name: activity.title,
    email: currentUser.value.email,
    attendees: 1,
    createdAt: new Date().toISOString(),
    activityId: activity.id,
    // preserve activity start time for correct display in Progress page
    dateTime: activity.when || null,
  }
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    arr.unshift(booking)
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(arr))
    alert('Registered! You can see it in your Dashboard.')
  } catch (err) {
    console.warn('Failed to save registration locally', err)
    alert('Failed to save registration locally.')
  }
}

const selectedId = ref(null)
function focusActivity(id) {
  selectedId.value = id
  // pan map to activity via watcher
}

// Keyboard navigation for results list
function getCurrentIndex() {
  if (!selectedId.value) return -1
  return filtered.value.findIndex((a) => a.id === selectedId.value)
}

function selectNext() {
  if (!filtered.value || filtered.value.length === 0) return
  const idx = getCurrentIndex()
  const next = idx < 0 ? 0 : Math.min(filtered.value.length - 1, idx + 1)
  selectedId.value = filtered.value[next].id
}

function selectPrev() {
  if (!filtered.value || filtered.value.length === 0) return
  const idx = getCurrentIndex()
  const prev = idx <= 0 ? filtered.value.length - 1 : idx - 1
  selectedId.value = filtered.value[prev].id
}

// item refs for scrolling
const itemRefs = ref({})
function setItemRef(el, id) {
  if (!id) return
  if (el) itemRefs.value[id] = el
  else delete itemRefs.value[id]
}

// scroll list when selectedId changes (smooth)
watch(selectedId, (id) => {
  if (!id) return
  const el = itemRefs.value[id]
  if (el && el.scrollIntoView) {
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // add a temporary highlight class removal later
      el.classList.add('selected-card')
      setTimeout(() => el.classList.remove('selected-card'), 2000)
    } catch (err) {
      console.warn('Scroll into view failed', err)
    }
  }
})

// Google Maps integration
const mapContainer = ref(null)
let map = null
let markers = []
let infoWindow = null
let gmapsLoaded = false
let clusterer = null
let placesMarkers = []
let directionsRenderer = null
let autocompleteService = null
let placesServiceObj = null

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
    // include places library for non-trivial feature #1 (map search)
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
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

function loadMarkerClusterer() {
  return new Promise((resolve, reject) => {
    if (window.MarkerClusterer) return resolve(window.MarkerClusterer)
    const existing = document.querySelector('script[data-markercluster]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.MarkerClusterer))
      existing.addEventListener('error', () => reject(new Error('MarkerClusterer failed to load')))
      return
    }
    const s = document.createElement('script')
    s.src =
      'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js'
    s.async = true
    s.defer = true
    s.setAttribute('data-markercluster', '1')
    s.onload = () => resolve(window.MarkerClusterer)
    s.onerror = () => reject(new Error('MarkerClusterer failed to load'))
    document.head.appendChild(s)
  })
}

function clearMarkers() {
  if (clusterer && typeof clusterer.clearMarkers === 'function') {
    try {
      clusterer.clearMarkers()
    } catch (err) {
      console.warn('Error clearing clusterer', err)
    }
    clusterer = null
  }
  markers.forEach((m) => m.setMap(null))
  markers = []
}

function clearPlacesMarkers() {
  placesMarkers.forEach((m) => m.setMap(null))
  placesMarkers = []
}

function createMarkers(googleMaps) {
  clearMarkers()
  infoWindow = infoWindow || new googleMaps.InfoWindow()

  // derive theme colors from CSS variables
  const root = getComputedStyle(document.documentElement)
  const fillColor = root.getPropertyValue('--mm-green').trim() || '#588157'
  const strokeColor = root.getPropertyValue('--mm-forest').trim() || '#344e41'

  const makeSvgData = (fill, stroke, size = 24, outlineWhite = false) => {
    // create a teardrop pin SVG; if outlineWhite true, use white stroke to stand out
    const strokeColorToUse = outlineWhite ? '#ffffff' : stroke
    const svg =
      `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'>` +
      `<path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' fill='${fill}' stroke='${strokeColorToUse}' stroke-width='2'/>` +
      `</svg>`
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
  }

  filtered.value.forEach((a) => {
    if (!a.lat || !a.lng) return

    const baseUrl = makeSvgData(fillColor || '#588157', strokeColor || '#344e41', 28, false)
    const selectedUrl = makeSvgData(fillColor || '#588157', strokeColor || '#344e41', 36, true)

    const baseIcon = {
      url: baseUrl,
      scaledSize: new googleMaps.Size(28, 28),
      anchor: new googleMaps.Point(14, 28),
    }
    const selectedIcon = {
      url: selectedUrl,
      scaledSize: new googleMaps.Size(36, 36),
      anchor: new googleMaps.Point(18, 36),
    }

    const marker = new googleMaps.Marker({
      position: { lat: a.lat, lng: a.lng },
      map,
      title: a.title,
      icon: baseIcon,
    })
    // attach ids and icons for later manipulation
    // Use original partner id if present for cross-page linkage
    marker._activityId = a.originalId || a.id
    marker._baseIcon = baseIcon
    marker._selectedIcon = selectedIcon

    marker.addListener('click', () => {
      selectedId.value = a.id
      infoWindow.setContent(
        `<div><strong>${a.title}</strong><div class="small">${a.location}</div></div>`,
      )
      infoWindow.open({ anchor: marker, map })
      map.panTo({ lat: a.lat, lng: a.lng })

      // update marker visuals
      markers.forEach((m) => m.setIcon(m._baseIcon))
      marker.setIcon(marker._selectedIcon)
      if (clusterer && typeof clusterer.repaint === 'function') clusterer.repaint()
    })
    markers.push(marker)
  })

  // initialize marker clustering if library available
  loadMarkerClusterer()
    .then(() => {
      try {
        if (window.MarkerClusterer) {
          if (clusterer && typeof clusterer.clearMarkers === 'function') clusterer.clearMarkers()
          clusterer = new window.MarkerClusterer(map, markers, {
            imagePath:
              'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
          })
        }
      } catch (err) {
        console.warn('MarkerClusterer init error', err)
      }
    })
    .catch((err) => {
      console.warn('MarkerClusterer load failed', err)
    })
}

function searchPlacesOnMap() {
  if (!GMAPS_API_KEY) {
    alert('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_KEY in .env')
    return
  }
  if (!gmapsLoaded || !map) {
    alert('Map is not ready yet. Please wait a moment and try again.')
    return
  }
  if (!query.value || !query.value.trim()) {
    alert('Please enter a place to search for (e.g., "park", "library").')
    return
  }

  if (!window.google || !window.google.maps || !window.google.maps.places) {
    console.error(
      'Places library is not available; ensure Maps JS is loaded with &libraries=places',
    )
    alert('Map Places service not available. Check console for details.')
    return
  }

  try {
    const service = new window.google.maps.places.PlacesService(map)
    const req = {
      query: query.value.trim(),
      fields: ['name', 'geometry', 'formatted_address'],
    }
    service.findPlaceFromQuery(req, (results, status) => {
      if (
        status === window.google.maps.places.PlacesServiceStatus.OK &&
        results &&
        results.length
      ) {
        clearPlacesMarkers()
        const bounds = new window.google.maps.LatLngBounds()
        results.forEach((p) => {
          if (!p.geometry || !p.geometry.location) return
          const m = new window.google.maps.Marker({
            position: p.geometry.location,
            map,
            title: p.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#ffffff',
              fillOpacity: 1,
              strokeColor: '#333333',
              strokeWeight: 2,
            },
          })
          m.addListener('click', () => {
            selectedId.value = null
            infoWindow.setContent(
              `<div><strong>${p.name}</strong><div class="small">${p.formatted_address || ''}</div></div>`,
            )
            infoWindow.open({ anchor: m, map })
          })
          placesMarkers.push(m)
          bounds.extend(p.geometry.location)
        })
        map.fitBounds(bounds)
      } else {
        console.log('Places search no results or status', status, results)
        alert('No places found')
      }
    })
  } catch (err) {
    console.error('Places search failed', err)
    alert('Error performing place search. See console for details.')
  }
}

async function getDirectionsToActivity(activity) {
  if (!gmapsLoaded || !map) {
    alert('Map not ready')
    return
  }
  // Ask the user for origin: geolocation or manual address
  let origin = null
  const useGeo = confirm('Use your current location as start? Press Cancel to enter an address.')
  if (useGeo && 'geolocation' in navigator) {
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
      )
      origin = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch (err) {
      console.warn('Geolocation failed or denied', err)
      // fallback to prompt
    }
  }
  if (!origin) {
    const addr = prompt('Enter start address (e.g. a suburb or street)')
    if (!addr) return
    origin = addr
  }

  // Directions: non-trivial feature #2 (routing)
  const service = new window.google.maps.DirectionsService()
  if (!directionsRenderer)
    directionsRenderer = new window.google.maps.DirectionsRenderer({ map, suppressMarkers: false })

  const request = {
    origin,
    destination: { lat: activity.lat, lng: activity.lng },
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
          (status === 'REQUEST_DENIED'
            ? '\nHint: Enable Directions API and billing, and allow your dev origin (e.g., http://localhost:5173) in API key restrictions.'
            : ''),
      )
      // Graceful fallback: open Google Maps Directions in a new tab
      try {
        const originParam =
          typeof origin === 'string'
            ? encodeURIComponent(origin)
            : origin && origin.lat != null && origin.lng != null
              ? `${origin.lat},${origin.lng}`
              : ''
        const destParam = `${activity.lat},${activity.lng}`
        const url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=walking`
        window.open(url, '_blank')
      } catch (error) {
        console.warn('Fallback directions URL failed', error)
      }
    }
  })
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
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#f0f2ec' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#5a6b5a' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
        { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7b6b' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e9e9e4' }] },
      ],
    })
    createMarkers(googleMaps)
    // prepare places/autocomplete services
    try {
      autocompleteService = new googleMaps.places.AutocompleteService()
      placesServiceObj = new googleMaps.places.PlacesService(map)
    } catch (err) {
      // places library may be missing if not loaded with &libraries=places
      console.warn('Places services not available', err)
    }
    // After services ready, sync partner activities and geocode
    syncPartnerActivitiesFromStorage()
    geocodeMissingPartnerLatLng()
    // open info when selectedId changes (map side)
    watch(selectedId, (id) => {
      const found = activities.value.find((x) => x.id === id || x.originalId === id)
      if (found && found.lat && found.lng) {
        map.panTo({ lat: found.lat, lng: found.lng })
        // find and open marker info
        const mk = markers.find((m) => m._activityId === (found.originalId || found.id))
        if (mk && infoWindow) {
          infoWindow.setContent(
            `<div><strong>${found.title}</strong><div class="small">${found.location}</div></div>`,
          )
          markers.forEach((m) => m.setIcon(m._baseIcon))
          mk.setIcon(mk._selectedIcon)
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
  // Initial sync from storage and listen for changes
  loadReviewsAgg()
  syncPartnerActivitiesFromStorage()
  window.addEventListener('storage', (e) => {
    if (e.key === PARTNER_EVENTS_KEY) syncPartnerActivitiesFromStorage()
    if (e.key === REVIEWS_KEY) {
      loadReviewsAgg()
      syncPartnerActivitiesFromStorage()
    }
  })
})

onUnmounted(() => {
  clearMarkers()
  clearPlacesMarkers()
  clearRoute()
  map = null
})

function fetchPlaceSuggestions(text) {
  placeSuggestions.value = []
  if (!autocompleteService || !text || !text.trim()) return
  // debounce
  if (predictionTimer) clearTimeout(predictionTimer)
  predictionTimer = setTimeout(() => {
    try {
      autocompleteService.getQueryPredictions({ input: text.trim() }, (preds, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && preds && preds.length) {
          placeSuggestions.value = preds.map((p) => ({ id: p.place_id, desc: p.description }))
        } else {
          placeSuggestions.value = []
        }
      })
    } catch (err) {
      console.warn('Autocomplete error', err)
    }
  }, 250)
}

function selectSuggestion(s) {
  if (!s) return
  query.value = s.desc
  placeSuggestions.value = []
  // If placesServiceObj is ready, find the place details and show on map
  if (placesServiceObj) {
    placesServiceObj.findPlaceFromQuery(
      { query: s.desc, fields: ['name', 'geometry', 'formatted_address'] },
      (results, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results.length
        ) {
          clearPlacesMarkers()
          const bounds = new window.google.maps.LatLngBounds()
          results.forEach((p) => {
            if (!p.geometry || !p.geometry.location) return
            const m = new window.google.maps.Marker({
              position: p.geometry.location,
              map,
              title: p.name,
            })
            m.addListener('click', () => {
              infoWindow.setContent(
                `<div><strong>${p.name}</strong><div class="small">${p.formatted_address || ''}</div></div>`,
              )
              infoWindow.open({ anchor: m, map })
            })
            placesMarkers.push(m)
            bounds.extend(p.geometry.location)
          })
          map.fitBounds(bounds)
        }
      },
    )
  } else {
    // fallback: just run the generic search
    searchPlacesOnMap()
  }
}

// Recreate markers when filter affecting coordinates changes
watch(
  () => filtered.value.map((a) => [a.id, a.lat, a.lng]).join('|'),
  () => {
    if (gmapsLoaded && map && window.google && window.google.maps) {
      try {
        createMarkers(window.google.maps)
      } catch (err) {
        console.warn('Recreate markers after filter change failed', err)
      }
    }
  },
)
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Explore Activities</h1>

    <div class="row g-3 mb-3 align-items-center">
      <div class="col-12 col-lg-5 position-relative">
        <input
          v-model="query"
          class="form-control"
          placeholder="Search activities or places (e.g., Clayton, CBD, park)"
          @input="fetchPlaceSuggestions(query)"
          @keydown.enter="searchPlacesOnMap"
          autocomplete="off"
        />
        <div
          v-if="placeSuggestions.length > 0"
          class="list-group position-absolute w-100"
          style="z-index: 2000; top: 100%"
        >
          <button
            v-for="s in placeSuggestions"
            :key="s.id"
            class="list-group-item list-group-item-action"
            @click="selectSuggestion(s)"
          >
            {{ s.desc }}
          </button>
        </div>
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

    <!-- unified controls: extra row removed -->

    <div class="row g-4">
      <!-- Map (Google Maps) on the left -->
      <div class="col-12 col-xl-7">
        <div class="mm-surface p-0 overflow-hidden position-relative map-box">
          <div ref="mapContainer" class="map-canvas"></div>
        </div>
      </div>

      <!-- Results list on the right -->
      <div class="col-12 col-xl-5">
        <div class="results-container">
          <div
            v-for="a in filtered"
            :key="a.id"
            class="card shadow-sm activity-item compact"
            :class="{ 'border-success': selectedId === a.id, 'selected-card': selectedId === a.id }"
            :ref="(el) => setItemRef(el, a.id)"
            tabindex="0"
            @keydown.down.prevent="selectNext"
            @keydown.up.prevent="selectPrev"
          >
            <div class="card-body d-flex">
              <div class="thumb me-3"></div>
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start">
                  <h6 class="mb-1">{{ a.title }}</h6>
                  <span class="small text-muted rating-box text-nowrap"
                    >{{ renderStars(a.rating) }} ({{ a.reviews }} reviews)</span
                  >
                </div>
                <div class="small text-muted">{{ a.location }}</div>
                <div class="small text-muted mb-1">{{ formatWhen(a.when) }}</div>
                <div class="mb-2">
                  <span class="mm-chip me-1 text-capitalize">{{ a.type }}</span>
                  <span class="mm-chip me-1 text-capitalize">{{ a.intensity }}</span>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-primary btn-sm" @click="handleRegister(a)">
                    Register
                  </button>
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    @click="
                      router.push({
                        name: 'activity-details',
                        params: { id: a.originalId || a.id },
                      })
                    "
                  >
                    View details
                  </button>
                  <!-- Removed Route button as it's now on details page -->
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
  height: 530px;
  border-radius: 0.5rem;
}
.map-canvas {
  width: 100%;
  height: 530px;
}
.activity-item .thumb {
  width: 96px;
  height: 72px;
  border-radius: 6px;
  background: linear-gradient(135deg, #e9ecef, #f8f9fa);
}
/* subtle highlight for selected items when programmatically scrolled */
.selected-card {
  transition: background-color 0.25s ease-in-out;
  background-color: rgba(88, 129, 87, 0.06);
}
.results-container {
  max-height: 530px; /* matches left map height */
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.activity-item.compact {
  padding: 0.5rem 0.75rem;
  margin: 0;
}
.activity-item.compact .card-body {
  padding: 0.5rem;
}
.activity-item.compact .thumb {
  width: 72px;
  height: 56px;
}
.activity-item.compact h6 {
  font-size: 1rem;
}
.activity-item.compact .mm-chip {
  font-size: 0.72rem;
  padding: 0.18rem 0.4rem;
}
.rating-box {
  min-width: 140px; /* reserve space to keep layout consistent whether rating exists or not */
  text-align: right;
}
</style>
