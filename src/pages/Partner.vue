<script setup></script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Partner Dashboard</h1>
    <p class="text-muted">Create and manage your events.</p>
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="row g-2 mb-3">
          <div class="col-12 col-md-4"><input class="form-control" placeholder="Title" /></div>
          <div class="col-12 col-md-3"><input class="form-control" placeholder="Location" /></div>
          <div class="col-6 col-md-2"><input type="date" class="form-control" /></div>
          <div class="col-6 col-md-2"><input type="time" class="form-control" /></div>
          <div class="col-12 col-md-1 d-grid"><button class="btn btn-primary">Add</button></div>
        </div>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Title</th>
                <th>Location</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sunset Yoga</td>
                <td>Fitzroy Gardens</td>
                <td>Sat 17:30</td>
                <td><button class="btn btn-sm btn-outline-danger">Delete</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
