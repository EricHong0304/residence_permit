<template>
  <div>
    <h2>记录管理（占位）</h2>
    <el-table :data="tableData" style="width: 100%;">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="station_id" label="派出所ID" />
      <el-table-column prop="apply_date" label="申请日期" />
      <el-table-column prop="status" label="状态" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const tableData = ref<any[]>([]);

async function fetchList() {
  const res = await fetch('/api/records');
  const data = await res.json();
  tableData.value = data.data || [];
}

onMounted(fetchList);
</script>
