<script setup></script>

<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
    <div class="container">
      <RouterLink class="navbar-brand fw-semibold" to="/">Mindful Movement</RouterLink>
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
          <li class="nav-item"><RouterLink class="nav-link" to="/explore">Explore</RouterLink></li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/dashboard">Dashboard</RouterLink>
          </li>
          <li class="nav-item"><RouterLink class="nav-link" to="/partner">Partner</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/admin">Admin</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/about">About</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/auth">Login</RouterLink></li>
          <li class="nav-item ms-lg-3">
            <RouterLink class="btn btn-primary" to="/auth">Sign Up</RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar-brand {
  letter-spacing: 0.2px;
}
</style>
