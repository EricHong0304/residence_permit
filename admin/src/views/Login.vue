<template>
  <el-card class="box-card" style="max-width: 420px; margin: 40px auto;">
    <h2 style="margin: 0 0 12px;">管理员登录</h2>
    <el-form :model="form" @submit.prevent>
      <el-form-item label="用户名">
        <el-input v-model="form.username" placeholder="admin" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" placeholder="admin" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSubmit">登录</el-button>
      </el-form-item>
    </el-form>
    <el-alert
      v-if="message"
      :title="message"
      :type="messageType"
      show-icon
      style="margin-top: 12px;"
    />
  </el-card>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';

const form = reactive({ username: 'admin', password: 'admin' });
const message = ref('');
const messageType = ref<'success' | 'error'>('success');

async function onSubmit() {
  // 调用后端占位登录接口
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    message.value = `登录成功，需首次改密：${data.needsPasswordReset}`;
    messageType.value = 'success';
  } catch (e: any) {
    message.value = `登录失败：${e.message || e}`;
    messageType.value = 'error';
  }
}
</script>
