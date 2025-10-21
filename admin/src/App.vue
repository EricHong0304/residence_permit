<template>
  <div class="layout">
    <el-container>
      <el-header>
        <el-menu mode="horizontal" :default-active="active" @select="onSelect">
          <el-menu-item index="/login">登录</el-menu-item>
          <el-menu-item index="/stations">派出所管理</el-menu-item>
          <el-menu-item index="/records">记录管理</el-menu-item>
        </el-menu>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();
const active = computed(() => route.path);
function onSelect(index: string) {
  router.push(index);
}
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>
