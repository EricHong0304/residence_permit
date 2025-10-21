<template>
  <div class="layout">
    <header style="padding: 10px; border-bottom: 1px solid #eee; display: flex; gap: 12px;">
      <button @click="() => router.push('/dashboard')">仪表盘</button>
    </header>
    <main style="padding: 12px;">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
</script>
