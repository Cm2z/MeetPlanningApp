<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  state: { type: Object, required: true },
});

const selectedBooking = ref(null);
const isUpdating = ref(false);

const bookings = computed(() => {
  const source = props.state?.bookings;
  return Array.isArray(source?.value) ? source.value : (Array.isArray(source) ? source : []);
});

function openDetails(booking) {
  selectedBooking.value = booking;
}

function closeDetails() {
  selectedBooking.value = null;
}

function display(value) {
  return value || '-';
}

function dateTime(value) {
  return props.state?.formatDateTime ? props.state.formatDateTime(value) : display(value);
}

function statusText(booking) {
  return props.state?.statusText?.[booking.status] || booking.status || '-';
}

async function updateStatus(status) {
  if (!selectedBooking.value || isUpdating.value) return;

  isUpdating.value = true;
  try {
    await props.state.setStatus(selectedBooking.value, status);
    await props.state.loadBookings();
    const freshBooking = bookings.value.find((item) => Number(item.id) === Number(selectedBooking.value.id));
    if (freshBooking) selectedBooking.value = freshBooking;
  } finally {
    isUpdating.value = false;
  }
}
</script>

<template>
  <section class="admin-workspace bookings-page">
    <div class="admin-help">
      <div>
        <p>งานของผู้ดูแลระบบ</p>
        <h2>รายการจองและอนุมัติ</h2>
        <span>ตรวจคำขอจองใหม่ เลือกอนุมัติหรือปฏิเสธ และติดตามสถานะการใช้งานห้อง</span>
      </div>
      <button class="ghost compact" type="button" @click="state.loadBookings()">รีเฟรช</button>
    </div>

    <div class="admin-steps">
      <div><b>1</b><span>ตรวจชื่อผู้จองและห้อง</span></div>
      <div><b>2</b><span>ดูวันเวลาและจำนวนคน</span></div>
      <div><b>3</b><span>เปิดรายละเอียดเพื่อดำเนินการ</span></div>
    </div>

    <div v-if="!bookings.length" class="empty notification-empty">ยังไม่มีรายการจอง</div>

    <div v-else class="booking-admin-list">
      <article v-for="booking in bookings" :key="booking.id" class="booking-admin-card" :class="booking.status">
        <div>
          <div class="booking-title-line">
            <strong>{{ booking.title }}</strong>
            <span class="status" :class="booking.status">{{ statusText(booking) }}</span>
          </div>
          <p>{{ display(booking.room_name) }} · {{ display(booking.branch_name) }}</p>
          <small>ผู้จอง: {{ display(booking.requester_name) }}</small>
        </div>
        <div class="booking-card-time">
          <p>{{ dateTime(booking.start_at) }}</p>
          <small>ถึง {{ dateTime(booking.end_at) }}</small>
        </div>
        <button class="primary compact booking-detail-button" type="button" @click="openDetails(booking)">ดูรายละเอียด</button>
      </article>
    </div>
  </section>

  <div v-if="selectedBooking" class="booking-detail-backdrop" @click.self="closeDetails">
    <section class="booking-detail-modal" role="dialog" aria-modal="true" aria-label="รายละเอียดคำขอจอง">
      <header class="booking-detail-header">
        <div>
          <p>รายละเอียดคำขอจอง</p>
          <h2>{{ selectedBooking.title }}</h2>
        </div>
        <button class="ghost compact" type="button" @click="closeDetails">ปิด</button>
      </header>

      <div class="booking-detail-status">
        <span class="status" :class="selectedBooking.status">{{ statusText(selectedBooking) }}</span>
        <span>รหัสรายการ #{{ selectedBooking.id }}</span>
      </div>

      <div class="booking-detail-grid">
        <div><small>ห้องประชุม</small><strong>{{ display(selectedBooking.room_name) }}</strong></div>
        <div><small>สาขา / อาคาร</small><strong>{{ display(selectedBooking.branch_name) }}</strong></div>
        <div><small>ผู้จอง</small><strong>{{ display(selectedBooking.requester_name) }}</strong></div>
        <div><small>จำนวนผู้เข้าร่วม</small><strong>{{ display(selectedBooking.attendee_count) }} คน</strong></div>
        <div><small>อีเมล</small><strong>{{ display(selectedBooking.requester_email) }}</strong></div>
        <div><small>เบอร์โทร</small><strong>{{ display(selectedBooking.requester_phone) }}</strong></div>
      </div>

      <div class="booking-detail-time">
        <small>วันและเวลาใช้งาน</small>
        <strong>{{ dateTime(selectedBooking.start_at) }}</strong>
        <span>ถึง {{ dateTime(selectedBooking.end_at) }}</span>
      </div>

      <div class="booking-detail-purpose">
        <small>วัตถุประสงค์</small>
        <p>{{ display(selectedBooking.purpose) }}</p>
      </div>

      <footer class="booking-detail-actions">
        <template v-if="selectedBooking.status === 'pending'">
          <button class="primary" type="button" :disabled="isUpdating" @click="updateStatus('approved')">อนุมัติการจอง</button>
          <button class="danger ghost" type="button" :disabled="isUpdating" @click="updateStatus('rejected')">ปฏิเสธคำขอ</button>
        </template>
        <button v-else-if="selectedBooking.status === 'approved'" class="primary" type="button" :disabled="isUpdating" @click="updateStatus('completed')">ยืนยันใช้ห้องเสร็จแล้ว</button>
        <button class="ghost" type="button" @click="closeDetails">ปิดหน้าต่าง</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.booking-card-time { min-width: 190px; }
.booking-detail-button { justify-self: end; white-space: nowrap; }

.booking-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(12, 29, 51, .54);
  backdrop-filter: blur(4px);
}

.booking-detail-modal {
  width: min(760px, 100%);
  max-height: calc(100dvh - 36px);
  overflow: auto;
  padding: 24px;
  border: 1px solid #c9dbf4;
  border-radius: 14px;
  background: #fff;
  color: #102a48;
  box-shadow: 0 24px 64px rgba(8, 33, 66, .28);
}

.booking-detail-header,
.booking-detail-status,
.booking-detail-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.booking-detail-header { padding-bottom: 18px; border-bottom: 1px solid #dce8f8; }
.booking-detail-header p { margin: 0 0 4px; color: #1769c2; font-weight: 700; }
.booking-detail-header h2 { margin: 0; font-size: 1.5rem; }
.booking-detail-status { padding: 15px 0; color: #607591; font-size: .92rem; }

.booking-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.booking-detail-grid > div,
.booking-detail-time,
.booking-detail-purpose {
  border: 1px solid #d5e4f7;
  border-radius: 10px;
  background: #f7fbff;
  padding: 13px;
}

.booking-detail-grid small,
.booking-detail-time small,
.booking-detail-purpose small {
  display: block;
  margin-bottom: 5px;
  color: #54708e;
}

.booking-detail-grid strong { display: block; overflow-wrap: anywhere; }
.booking-detail-time { margin-top: 12px; }
.booking-detail-time strong { display: block; margin-bottom: 3px; }
.booking-detail-time span { color: #54708e; }
.booking-detail-purpose { margin-top: 12px; }
.booking-detail-purpose p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.booking-detail-actions { margin-top: 18px; justify-content: flex-end; border-top: 1px solid #dce8f8; padding-top: 18px; }

@media (max-width: 720px) {
  .booking-admin-card { grid-template-columns: 1fr; gap: 10px; }
  .booking-card-time { min-width: 0; }
  .booking-detail-button { justify-self: stretch; width: 100%; }
  .booking-detail-backdrop { align-items: end; padding: 10px; }
  .booking-detail-modal { max-height: calc(100dvh - 20px); padding: 18px; border-radius: 14px 14px 8px 8px; }
  .booking-detail-header { align-items: flex-start; }
  .booking-detail-grid { grid-template-columns: 1fr; }
  .booking-detail-actions { flex-wrap: wrap; }
  .booking-detail-actions button { flex: 1 1 160px; }
}
</style>
