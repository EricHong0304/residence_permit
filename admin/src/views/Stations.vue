<template>
  <div>
    <h2>派出所管理（占位）</h2>
    <el-form :inline="true" :model="form">
      <el-form-item label="代码">
        <el-input v-model="form.code" placeholder="PS001" />
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="form.name" placeholder="第一派出所" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="create">新增</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="tableData" style="width: 100%; margin-top: 12px;">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="code" label="代码" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="short_name" label="简称" />
      <el-table-column prop="active" label="启用" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';

const form = reactive({ code: '', name: '' });
const tableData = ref<any[]>([]);

async function fetchList() {
  const res = await fetch('/api/stations');
  const data = await res.json();
  tableData.value = data.data || [];
}

async function create() {
  await fetch('/api/stations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });
  form.code = '';
  form.name = '';
  await fetchList();
}

onMounted(fetchList);
</script>
