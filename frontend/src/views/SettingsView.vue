
<script setup>
defineProps({ state: Object });
</script>

<template>
  <section class="admin-grid">
    <form class="panel form" @submit.prevent="state.saveSettings">
      <h2>Setting ระบบ</h2>
      <label>ชื่อองค์กร<input v-model="state.settings.org_name" /></label>
      <label>สีหลัก<input v-model="state.settings.primary_color" type="color" /></label>
      <label>อีเมลผู้ดูแล<input v-model="state.settings.admin_email" /></label>
      <label>SMTP Host<input v-model="state.settings.smtp_host" /></label>
      <label>SMTP Port<input v-model="state.settings.smtp_port" /></label>
      <label>SMTP User<input v-model="state.settings.smtp_user" /></label>
      <label>SMTP Password<input v-model="state.settings.smtp_password" type="password" /></label>
      <button class="primary">บันทึก</button>
      <button type="button" class="ghost" @click="state.testEmail">ทดสอบอีเมล</button>
    </form>
  </section>
</template>
