<script setup>
import { ref } from 'vue'

// Example dynamic data (can be replaced later with backend/Firestore/LocalStorage data)
const popularActivities = ref([
  {
    id: 'a1',
    title: 'Sunset Yoga · Beginner Friendly',
    location: 'Fitzroy Gardens',
    time: 'This Saturday 17:30',
    tags: ['Low Intensity', 'Small Group'],
  },
  {
    id: 'a2',
    title: 'Creative Pottery · Weekday Relaxation',
    location: 'Collingwood Studio',
    time: 'Wednesday 19:00',
    tags: ['Creative', 'Social'],
  },
  {
    id: 'a3',
    title: 'Light Hike · Urban Green Path Exploration',
    location: 'Yarra Trail',
    time: 'Next Sunday 09:00',
    tags: ['Nature', 'Social'],
  },
])
</script>

<template>
  <div>
    <!-- Top Navigation -->
    <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
      <div class="container">
        <a class="navbar-brand fw-semibold" href="#">Mindful Movement</a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
            <li class="nav-item"><a class="nav-link" href="#features">Features</a></li>
            <li class="nav-item"><a class="nav-link" href="#activities">Activities</a></li>
            <li class="nav-item"><a class="nav-link" href="#about">About</a></li>
            <li class="nav-item"><a class="nav-link" href="#contact">Contact</a></li>
            <li class="nav-item ms-lg-3">
              <a class="btn btn-primary" href="#signup">Join Now</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="py-5 bg-light border-bottom">
      <div class="container">
        <div class="row align-items-center g-4">
          <div class="col-12 col-lg-7">
            <h1 class="display-5 fw-bold mb-3">
              Connect Young Adults with Supportive Activities for Mental Wellness
            </h1>
            <p class="lead text-muted mb-4">
              Providing low-barrier, positive, and peer-connecting offline activities for 18-25 year
              olds: yoga, pottery, light hiking, etc. Re-establish social connections and well-being
              in a safe, supportive environment.
            </p>
            <div class="d-flex flex-wrap gap-2">
              <a class="btn btn-primary btn-lg" href="#activities">Explore Activities</a>
              <a class="btn btn-outline-secondary btn-lg" href="#about">Learn About Platform</a>
            </div>
          </div>
          <div class="col-12 col-lg-5">
            <div
              class="ratio ratio-16x9 rounded-3 bg-white shadow-sm d-flex align-items-center justify-content-center"
            >
              <div class="text-center p-3">
                <div class="fw-semibold mb-2">Your Supportive Community Starts Here</div>
                <div class="text-muted small">
                  Map Exploration · Safe Community · Flexible Booking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-5">
      <div class="container">
        <div class="text-center mb-4">
          <h2 class="fw-bold">Why Choose Mindful Movement</h2>
          <p class="text-muted mb-0">
            Friendly, sustainable activity experiences designed for beginners and introverts.
          </p>
        </div>
        <div class="row g-4">
          <div class="col-12 col-md-4">
            <div class="card h-100 shadow-sm">
              <div class="card-body">
                <h5 class="card-title">Map-Based Exploration</h5>
                <p class="card-text text-muted">
                  Discover activities based on location, making it closer and more convenient,
                  lowering barriers to participation.
                </p>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="card h-100 shadow-sm">
              <div class="card-body">
                <h5 class="card-title">Safe & Trusted Community</h5>
                <p class="card-text text-muted">
                  Verified community partners and activity ratings ensure a friendly and inclusive
                  environment.
                </p>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="card h-100 shadow-sm">
              <div class="card-body">
                <h5 class="card-title">Flexible Booking</h5>
                <p class="card-text text-muted">
                  Supports one-time participation and spontaneous registration, adapting to busy and
                  unpredictable schedules.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Popular Activities -->
    <section id="activities" class="py-5 bg-light">
      <div class="container">
        <div class="d-flex justify-content-between align-items-end mb-3">
          <h2 class="fw-bold mb-0">Popular Activities</h2>
          <a class="btn btn-outline-primary btn-sm" href="#">View All</a>
        </div>
        <div class="row g-4">
          <div v-for="item in popularActivities" :key="item.id" class="col-12 col-md-6 col-lg-4">
            <div class="card h-100 shadow-sm">
              <div class="card-body">
                <h5 class="card-title mb-1">{{ item.title }}</h5>
                <div class="text-muted small mb-2">{{ item.location }} · {{ item.time }}</div>
                <div class="d-flex flex-wrap gap-2">
                  <span
                    v-for="t in item.tags"
                    :key="t"
                    class="badge rounded-pill text-bg-secondary"
                    >{{ t }}</span
                  >
                </div>
              </div>
              <div class="card-footer bg-white">
                <button class="btn btn-primary w-100">Register Now</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- About -->
    <section id="about" class="py-5">
      <div class="container">
        <div class="row g-4 align-items-center">
          <div class="col-12 col-lg-6">
            <h2 class="fw-bold mb-3">
              Promoting Mental Wellness through Positive Social Interaction + Mild Activities
            </h2>
            <p class="text-muted mb-3">
              The platform serves young adults aged 18-25. We collaborate with community partners to
              offer beginner-friendly yoga, creative workshops, hiking, and other activities,
              helping you build connections and improve well-being in a safe, inclusive environment.
            </p>
            <a class="btn btn-outline-secondary" href="#contact">Contact & Partnership</a>
          </div>
          <div class="col-12 col-lg-6">
            <div class="p-4 bg-light rounded-3 border">
              Universities, studios, and non-profit organizations are welcome to become partners.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer id="contact" class="py-4 border-top bg-white">
      <div class="container">
        <div class="row g-3 align-items-center">
          <div class="col-12 col-md">
            <div class="fw-semibold">Mindful Movement</div>
            <div class="text-muted small">© 2025 · Melbourne</div>
          </div>
          <div class="col-12 col-md-auto">
            <a href="#" class="link-secondary me-3">Privacy Policy</a>
            <a href="#" class="link-secondary">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Minor visual enhancements, avoiding conflicts with global styles */
.navbar-brand {
  letter-spacing: 0.2px;
}

.ratio {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
}
</style>
