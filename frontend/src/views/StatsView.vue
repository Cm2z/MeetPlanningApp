
<script setup>
defineProps({ state: Object });
</script>

<template>
  <section class="panel">
    <h2>Dashboard เชิงสถิติ</h2>
    <div class="stat-grid"><div class="metric" v-for="row in state.stats.rooms" :key="row.name"><span>{{ row.name }}</span><strong>{{ row.total }}</strong></div></div>
    <div class="report-grid">
      <div><h3>รายเดือน</h3><p v-for="row in state.stats.monthly" :key="row.month">{{ row.month }}: {{ row.total }}</p></div>
      <div><h3>ช่วงเวลา</h3><p v-for="row in state.stats.hours" :key="row.hour">{{ row.hour }}:00 = {{ row.total }}</p></div>
      <div><h3>สถานะ</h3><p v-for="row in state.stats.cancelRate" :key="row.status">{{ state.statusText[row.status] || row.status }}: {{ row.total }}</p></div>
    </div>
  </section>
</template>
