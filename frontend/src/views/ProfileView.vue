
<script setup>
defineProps({ state: Object });
</script>

<template>
  <section class="admin-workspace profile-page">
    <div class="admin-help">
      <div>
        <p>บัญชีของฉัน</p>
        <h2>โปรไฟล์ผู้ใช้</h2>
        <span>ข้อมูลหน้านี้ดึงจากฐานข้อมูลของบัญชีที่เข้าสู่ระบบอยู่</span>
      </div>
      <button class="ghost compact" @click="state.loadProfile()">โหลดข้อมูลล่าสุด</button>
    </div>

    <div class="profile-grid">
      <form class="panel form" @submit.prevent="state.saveProfile()">
        <h3>ข้อมูลจากบัญชีที่สมัคร</h3>
        <label>ชื่อ-นามสกุล<input v-model="state.profile.name" /></label>
        <label>อีเมล<input v-model="state.profile.email" disabled /></label>
        <label>แผนก<input v-model="state.profile.department" /></label>
        <label>เบอร์โทร<input v-model="state.profile.phone" /></label>
        <label>สิทธิ์ผู้ใช้<input :value="state.profile.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'" disabled /></label>
        <button class="primary large-button">บันทึกข้อมูล</button>
      </form>

      <form class="panel form" @submit.prevent="state.changePassword()">
        <h3>เปลี่ยนรหัสผ่าน</h3>
        <label>รหัสผ่านปัจจุบัน<input v-model="state.passwordForm.currentPassword" type="password" /></label>
        <label>รหัสผ่านใหม่<input v-model="state.passwordForm.newPassword" type="password" minlength="6" /></label>
        <button class="primary large-button">เปลี่ยนรหัสผ่าน</button>
      </form>
    </div>
  </section>
</template>
