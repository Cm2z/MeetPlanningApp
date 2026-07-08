
<script setup>
import { ShieldCheck } from '@lucide/vue';

defineProps({
  title: String,
  session: Object,
  isAdmin: Boolean,
});
</script>

<template>
  <header class="topbar">
    <div>
      <p>ระบบจองห้องประชุม</p>
      <h1>{{ title }}</h1>
    </div>

    <div v-if="session?.user" class="user-pill">
      <ShieldCheck />
      <span>{{ session.user.name || 'ผู้ใช้งาน' }} · {{ isAdmin ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน' }}</span>
    </div>
  </header>
</template>
