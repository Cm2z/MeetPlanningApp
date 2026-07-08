
<script setup>
defineProps({ state: Object });
</script>

<template>
  <main class="login-page fit-login">
    <section class="public-intro fit-intro">
      <div class="brand-lockup fit-brand">
        <span class="brand-mark">MP</span>
        <div>
          <p>ระบบจองห้องประชุม</p>
          <h1>MeetPlanning</h1>
        </div>
      </div>

      <div class="intro-copy fit-copy">
        <span class="official-badge">สำหรับองค์กรและสำนักงาน</span>
        <h2>จองห้องประชุมง่าย เห็นสถานะชัดเจน</h2>
        <p>ค้นหาห้องว่าง ส่งคำขอจอง และติดตามผลอนุมัติได้ในระบบเดียว</p>
      </div>

      <div class="fit-visual" aria-hidden="true">
        <div class="fit-card">
          <strong>วันนี้</strong>
          <span>09:00 ประชุมทีม</span>
          <span>11:00 สัมภาษณ์</span>
          <span class="ok">14:00 อนุมัติแล้ว</span>
        </div>
        <div class="fit-room">
          <b>ห้องประชุม A</b>
          <i></i>
          <small>ว่าง 15:00 - 16:00</small>
        </div>
      </div>

      <div class="fit-points">
        <div><strong>ค้นหา</strong><span>เลือกวัน เวลา จำนวนคน</span></div>
        <div><strong>จอง</strong><span>ส่งคำขอให้ผู้ดูแล</span></div>
        <div><strong>ติดตาม</strong><span>รับแจ้งเตือนผลอนุมัติ</span></div>
      </div>
    </section>

    <section class="login-panel fit-panel">
      <div class="panel-heading">
        <div>
          <p>เริ่มใช้งานระบบ</p>
          <h2>{{ state.authMode.value === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก' }}</h2>
        </div>
      </div>

      <div class="auth-tabs" role="tablist" aria-label="เลือกวิธีเข้าใช้งาน">
        <button :class="{ active: state.authMode.value === 'login' }" @click="state.authMode.value = 'login'">เข้าสู่ระบบ</button>
        <button :class="{ active: state.authMode.value === 'register' }" @click="state.authMode.value = 'register'">สมัครสมาชิก</button>
      </div>

      <form v-if="state.authMode.value === 'login'" class="auth-form fit-form" @submit.prevent="state.login">
        <p class="form-help">กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ</p>
        <label>อีเมล<input v-model="state.loginForm.email" type="email" autocomplete="email" placeholder="name@example.com" required /></label>
        <label>รหัสผ่าน<input v-model="state.loginForm.password" type="password" autocomplete="current-password" placeholder="กรอกรหัสผ่าน" required /></label>
        <button class="primary large-button">เข้าสู่ระบบ</button>
        <button type="button" class="text-button" @click="state.authMode.value = 'register'">ยังไม่มีบัญชี สมัครสมาชิก</button>
      </form>

      <form v-else class="auth-form fit-form" @submit.prevent="state.register">
        <p class="form-help">สร้างบัญชีใหม่เพื่อเริ่มจองห้องประชุม</p>
        <label>ชื่อ-นามสกุล<input v-model="state.registerForm.name" autocomplete="name" placeholder="เช่น สมชาย ใจดี" required /></label>
        <label>อีเมล<input v-model="state.registerForm.email" type="email" autocomplete="email" placeholder="name@example.com" required /></label>
        <label>รหัสผ่าน<input v-model="state.registerForm.password" type="password" autocomplete="new-password" minlength="6" placeholder="อย่างน้อย 6 ตัวอักษร" required /></label>
        <label>แผนก<input v-model="state.registerForm.department" placeholder="เช่น บัญชี, บุคคล, IT" /></label>
        <button class="primary large-button">สมัครสมาชิก</button>
        <button type="button" class="text-button" @click="state.authMode.value = 'login'">มีบัญชีแล้ว เข้าสู่ระบบ</button>
      </form>
    </section>
  </main>
</template>
