<script setup>
defineProps({
  state: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <main class="mp-auth-page">
    <section class="mp-auth-showcase" aria-label="แนะนำระบบ MeetPlanning">
      <header class="mp-auth-brand">
        <img class="mp-auth-logo" src="/meetplanning-logo.png" alt="MeetPlanning ระบบจัดการห้องประชุม" />
      </header>

      <div class="mp-auth-copy">
        <p class="mp-auth-eyebrow">จัดการการจองให้เป็นระบบ</p>
        <h1>ทุกการประชุม<br />เริ่มต้นได้ง่ายขึ้น</h1>
        <p>ค้นหาห้องว่าง ส่งคำขอจอง และติดตามสถานะการอนุมัติได้ในที่เดียว</p>
      </div>

      <div class="mp-auth-preview" aria-hidden="true">
        <div class="mp-auth-preview-head">
          <span>ตารางห้องประชุมวันนี้</span>
          <b>3 ห้องพร้อมใช้</b>
        </div>
        <div class="mp-auth-preview-row active">
          <time>09:00</time>
          <span>ประชุมทีมประจำสัปดาห์</span>
          <i>Orchid</i>
        </div>
        <div class="mp-auth-preview-row">
          <time>13:00</time>
          <span>นำเสนอแผนงาน</span>
          <i>Siam</i>
        </div>
        <div class="mp-auth-preview-row">
          <time>15:30</time>
          <span>ช่วงเวลาว่าง</span>
          <i>River</i>
        </div>
      </div>

      <div class="mp-auth-steps" aria-label="ขั้นตอนการใช้งาน">
        <span><b>1</b> ค้นหาห้องว่าง</span>
        <span><b>2</b> ส่งคำขอจอง</span>
        <span><b>3</b> ติดตามผลอนุมัติ</span>
      </div>
    </section>

    <section class="mp-auth-form-side">
      <article class="mp-auth-card">
        <p class="mp-auth-overline">{{ state.authMode.value === 'login' ? 'ยินดีต้อนรับกลับ' : 'เริ่มต้นใช้งานMeetPlanning' }}</p>
        <h2>{{ state.authMode.value === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่' }}</h2>
        <p class="mp-auth-description">
          {{ state.authMode.value === 'login'
            ? 'กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน'
            : 'กรอกข้อมูลสำหรับสร้างบัญชีเพื่อจองห้องประชุม' }}
        </p>

        <div class="mp-auth-tabs" role="tablist" aria-label="เลือกวิธีเข้าใช้งาน">
          <button type="button" :class="{ active: state.authMode.value === 'login' }"
            :aria-selected="state.authMode.value === 'login'"
            @click="state.authMode.value = 'login'">เข้าสู่ระบบ</button>
          <button type="button" :class="{ active: state.authMode.value === 'register' }"
            :aria-selected="state.authMode.value === 'register'"
            @click="state.authMode.value = 'register'">สมัครสมาชิก</button>
        </div>

        <form v-if="state.authMode.value === 'login'" class="mp-auth-form" @submit.prevent="state.login">
          <label class="mp-auth-field">
            <span>อีเมล</span>
            <input v-model="state.loginForm.email" type="email" autocomplete="email" placeholder="name@example.com"
              required />
          </label>
          <label class="mp-auth-field">
            <span>รหัสผ่าน</span>
            <input v-model="state.loginForm.password" type="password" autocomplete="current-password"
              placeholder="กรอกรหัสผ่าน" required />
          </label>
          <button class="mp-auth-submit" type="submit">เข้าสู่ระบบ</button>
          <p class="mp-auth-switch">ยังไม่มีบัญชี? <button type="button"
              @click="state.authMode.value = 'register'">สมัครสมาชิก</button></p>
        </form>

        <form v-else class="mp-auth-form" @submit.prevent="state.register">
          <label class="mp-auth-field">
            <span>ชื่อ-นามสกุล</span>
            <input v-model="state.registerForm.name" autocomplete="name" placeholder="เช่น สมชาย ใจดี" required />
          </label>
          <label class="mp-auth-field">
            <span>อีเมล</span>
            <input v-model="state.registerForm.email" type="email" autocomplete="email" placeholder="name@example.com"
              required />
          </label>
          <label class="mp-auth-field">
            <span>รหัสผ่าน</span>
            <input v-model="state.registerForm.password" type="password" autocomplete="new-password" minlength="8" maxlength="128"
              placeholder="อย่างน้อย 6 ตัวอักษร" required />
          </label>
          <label class="mp-auth-field">
            <span>แผนก <small>ไม่บังคับ</small></span>
            <input v-model="state.registerForm.department" placeholder="เช่น บัญชี, บุคคล, IT" />
          </label>
          <button class="mp-auth-submit" type="submit">สร้างบัญชี</button>
          <p class="mp-auth-switch">มีบัญชีอยู่แล้ว? <button type="button"
              @click="state.authMode.value = 'login'">เข้าสู่ระบบ</button></p>
        </form>
      </article>
    </section>
  </main>
</template>

<style scoped>
.mp-auth-page {
  min-height: 100svh;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(390px, .88fr);
  background: #f4f7fb;
  color: #102c4f;
}

.mp-auth-showcase {
  min-height: 100svh;
  padding: 64px 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 34px;
  background: #102d5c;
  color: #fff;
}

.mp-auth-brand {
  display: inline-flex;
  align-items: center;
  width: min(360px, 100%);
  padding: 10px 12px;
  border: 1px solid rgba(214, 230, 255, .26);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 26px rgba(2, 20, 52, .2);
}

.mp-auth-logo {
  display: block;
  width: 100%;
  max-width: 336px;
  height: auto;
  object-fit: contain;
}

.mp-auth-copy {
  max-width: 590px;
}

.mp-auth-eyebrow,
.mp-auth-overline {
  margin: 0 0 10px;
  color: #80b4f3;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
}

.mp-auth-copy h1 {
  margin: 0;
  max-width: 540px;
  font-size: 46px;
  line-height: 1.18;
  letter-spacing: 0;
}

.mp-auth-copy>p:last-child {
  max-width: 540px;
  margin: 18px 0 0;
  color: #c9d7ea;
  font-size: 17px;
  line-height: 1.75;
}

.mp-auth-preview {
  width: min(100%, 610px);
  padding: 20px;
  border: 1px solid #d7e4f5;
  border-radius: 8px;
  background: #f9fbfe;
  color: #17375d;
  box-shadow: 0 18px 42px rgba(0, 0, 0, .2);
}

.mp-auth-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 800;
}

.mp-auth-preview-head b {
  padding: 6px 10px;
  border-radius: 999px;
  background: #e5f1ff;
  color: #1b65bc;
  font-size: 12px;
}

.mp-auth-preview-row {
  min-height: 49px;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  border-top: 1px solid #e1eaf5;
  color: #49617e;
  font-size: 14px;
}

.mp-auth-preview-row.active {
  margin: 0 -4px;
  border: 1px solid #bdd5f4;
  border-radius: 6px;
  background: #edf6ff;
  color: #153f70;
}

.mp-auth-preview-row time {
  color: #1e6fc9;
  font-weight: 800;
}

.mp-auth-preview-row i {
  color: #607b9d;
  font-size: 12px;
  font-style: normal;
}

.mp-auth-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  color: #cbd9eb;
  font-size: 14px;
}

.mp-auth-steps span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.mp-auth-steps b {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #2474d3;
  color: #fff;
  font-size: 12px;
}

.mp-auth-form-side {
  padding: 44px 32px;
  display: grid;
  place-items: center;
}

.mp-auth-card {
  width: min(100%, 438px);
  padding: 36px;
  border: 1px solid #dbe6f3;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 42px rgba(30, 66, 108, .1);
}

.mp-auth-card h2 {
  margin: 0;
  color: #112c4e;
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: 0;
}

.mp-auth-description {
  margin: 10px 0 24px;
  color: #657b98;
  font-size: 14px;
  line-height: 1.65;
}

.mp-auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 24px;
  padding: 4px;
  border-radius: 7px;
  background: #edf4fc;
}

.mp-auth-tabs button {
  min-height: 40px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #406386;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.mp-auth-tabs button.active {
  background: #1f6fca;
  color: #fff;
  box-shadow: 0 3px 8px rgba(31, 111, 202, .24);
}

.mp-auth-form {
  display: grid;
  gap: 16px;
}

.mp-auth-field {
  display: grid;
  gap: 7px;
  color: #254464;
  font-size: 14px;
  font-weight: 800;
}

.mp-auth-field span {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.mp-auth-field small {
  color: #7890ab;
  font-size: 12px;
  font-weight: 500;
}

.mp-auth-field input {
  width: 100%;
  min-height: 47px;
  padding: 0 13px;
  border: 1px solid #bcd2eb;
  border-radius: 6px;
  outline: none;
  color: #142f50;
  background: #fff;
  font: inherit;
  font-size: 15px;
}

.mp-auth-field input::placeholder {
  color: #94a5b9;
}

.mp-auth-field input:focus {
  border-color: #1f6fca;
  box-shadow: 0 0 0 3px #deebfb;
}

.mp-auth-submit {
  min-height: 48px;
  margin-top: 4px;
  border: 0;
  border-radius: 6px;
  background: #1f6fca;
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 5px 12px rgba(31, 111, 202, .2);
}

.mp-auth-submit:hover {
  background: #185fac;
}

.mp-auth-switch {
  margin: 2px 0 0;
  text-align: center;
  color: #6d829c;
  font-size: 13px;
}

.mp-auth-switch button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #1d67bc;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 900px) {
  .mp-auth-page {
    grid-template-columns: 1fr;
  }

  .mp-auth-showcase {
    min-height: auto;
    padding: 34px 28px;
    gap: 20px;
  }

  .mp-auth-copy h1 {
    font-size: 36px;
  }

  .mp-auth-preview,
  .mp-auth-steps {
    display: none;
  }

  .mp-auth-form-side {
    padding: 32px 20px 44px;
  }
}

@media (max-width: 480px) {
  .mp-auth-showcase {
    padding: 26px 20px;
  }

  .mp-auth-brand {
    width: min(250px, 100%);
    padding: 7px 9px;
    border-radius: 8px;
  }

  .mp-auth-logo {
    max-width: 232px;
  }

  .mp-auth-copy h1 {
    font-size: 30px;
  }

  .mp-auth-copy>p:last-child {
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.6;
  }

  .mp-auth-form-side {
    padding: 20px 14px 34px;
  }

  .mp-auth-card {
    padding: 26px 20px;
  }

  .mp-auth-card h2 {
    font-size: 26px;
  }
}
</style>
