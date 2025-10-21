import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Login from '../views/Login.vue';
import Stations from '../views/Stations.vue';
import Records from '../views/Records.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/stations', component: Stations },
  { path: '/records', component: Records },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
