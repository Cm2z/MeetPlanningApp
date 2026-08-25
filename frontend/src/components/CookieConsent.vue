<script setup>
import { ref } from 'vue';
import { Cookie, ShieldCheck } from '@lucide/vue';

const STORAGE_KEY = 'meetplanning_cookie_preference_v1';
const visible = ref(false);
const showDetails = ref(false);

try {
  visible.value = !localStorage.getItem(STORAGE_KEY);
} catch {
  // Browsers that block storage can still use the essential session cookie.
  visible.value = true;
}

function savePreference(value) {
  try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Storage may be unavailable. */ }
  visible.value = false;
}
</script>

<template>
  <aside v-if="visible" class="cookie-consent" role="dialog" aria-modal="false"
    aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-description">
    <div class="cookie-consent-icon" aria-hidden="true"><Cookie /></div>
    <div class="cookie-consent-copy">
      <strong id="cookie-consent-title">เว็บไซต์นี้ใช้คุกกี้ที่จำเป็น</strong>
      <p id="cookie-consent-description">
        MeetPlanning ใช้คุกกี้ Session แบบ HttpOnly เพื่อให้เข้าสู่ระบบได้อย่างปลอดภัย
        ไม่มีคุกกี้โฆษณาหรือติดตามพฤติกรรม
      </p>
      <div v-if="showDetails" class="cookie-consent-details">
        <ShieldCheck aria-hidden="true" />
        <span>คุกกี้จะหมดอายุภายใน 8 ชั่วโมง และ JavaScript ไม่สามารถอ่านรหัส Session ได้</span>
      </div>
    </div>

    <div class="cookie-consent-actions">
      <button class="cookie-secondary" type="button" @click="showDetails = !showDetails">
        {{ showDetails ? 'ซ่อนรายละเอียด' : 'รายละเอียด' }}
      </button>
      <button class="cookie-secondary" type="button" @click="savePreference('essential')">
        ใช้เฉพาะที่จำเป็น
      </button>
      <button class="cookie-primary" type="button" @click="savePreference('accepted')">
        อนุญาตและใช้งาน
      </button>
    </div>
  </aside>
</template>

<style scoped>
.cookie-consent {
  position: fixed;
  z-index: 10020;
  right: 24px;
  bottom: 24px;
  width: min(720px, calc(100vw - 48px));
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border: 1px solid #b9d3f3;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  color: #102a4c;
  box-shadow: 0 22px 60px rgba(15, 45, 85, 0.24);
  backdrop-filter: blur(12px);
}

.cookie-consent-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #e8f2ff;
  color: #176ac4;
}

.cookie-consent-icon svg { width: 26px; height: 26px; }
.cookie-consent-copy { min-width: 0; }
.cookie-consent-copy strong { display: block; margin-bottom: 4px; font-size: 17px; }
.cookie-consent-copy p { margin: 0; color: #536b89; line-height: 1.55; font-size: 14px; }
.cookie-consent-details { display: flex; gap: 7px; align-items: flex-start; margin-top: 9px; color: #176143; font-size: 13px; }
.cookie-consent-details svg { width: 17px; min-width: 17px; }
.cookie-consent-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.cookie-consent-actions button { min-height: 40px; padding: 8px 13px; border-radius: 10px; font-weight: 800; }
.cookie-primary { border: 1px solid #176ac4; background: #176ac4; color: #fff; }
.cookie-secondary { border: 1px solid #c5d7ed; background: #fff; color: #174b85; }
@media (max-width: 900px) {
  .cookie-consent { grid-template-columns: auto minmax(0, 1fr); }
  .cookie-consent-actions { grid-column: 1 / -1; justify-content: stretch; }
  .cookie-consent-actions button { flex: 1 1 150px; }
}

@media (max-width: 560px) {
  .cookie-consent { right: 12px; bottom: 12px; width: calc(100vw - 24px); grid-template-columns: 1fr; padding: 18px 16px 16px; }
  .cookie-consent-icon { width: 42px; height: 42px; }
  .cookie-consent-actions { display: grid; grid-template-columns: 1fr; }
  .cookie-consent-actions button { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .cookie-consent { backdrop-filter: none; }
}
</style>
