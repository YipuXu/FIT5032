<script setup>
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import AppFooter from './components/AppFooter.vue'
</script>

<template>
  <div>
    <NavBar />
    <RouterView />
    <AppFooter />
  </div>
</template>

<style scoped>
/* Remove default template styles, keep empty shell for future expansion as needed */
</style>
