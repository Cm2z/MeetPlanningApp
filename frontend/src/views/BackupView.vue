
<script setup>
defineProps({ state: Object });
</script>

<template>
  <section class="admin-grid">
    <div class="panel"><h2>Backup</h2><button class="primary" @click="state.downloadBackup">Download SQL Backup</button></div>
    <form class="panel form" @submit.prevent="state.restoreBackup">
      <h2>Restore</h2>
      <textarea v-model="state.restoreSql" rows="12" placeholder="วาง SQL backup ที่นี่"></textarea>
      <button class="primary">Restore</button>
    </form>
  </section>
</template>
