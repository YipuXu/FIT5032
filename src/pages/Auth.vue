<script setup></script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Login / Register</h1>
    <div class="row g-4">
      <div class="col-12 col-lg-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Email & Password</h5>
            <div class="mb-3"><input class="form-control" placeholder="Email" /></div>
            <div class="mb-3">
              <input type="password" class="form-control" placeholder="Password" />
            </div>
            <div class="d-grid gap-2">
              <button class="btn btn-primary">Login</button
              ><button class="btn btn-secondary">Sign Up</button>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">External Auth</h5>
            <button class="btn btn-outline-primary w-100" disabled aria-disabled="true">
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
