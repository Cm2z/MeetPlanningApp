<script setup>
import { onBeforeUnmount, onMounted } from 'vue';

const props = defineProps({
  booking: { type: Object, required: true },
  state: { type: Object, required: true },
});

const emit = defineEmits(['close']);

function close() {
  emit('close');
}

function handleKeydown(event) {
  if (event.key === 'Escape') close();
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="booking-detail-backdrop" @click.self="close">
      <section class="booking-detail-modal" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title">
        <header class="booking-detail-header">
          <div>
            <p>รายละเอียดคำขอจอง</p>
            <h2 id="booking-detail-title">{{ booking.title || '-' }}</h2>
          </div>
          <button class="ghost compact" type="button" aria-label="ปิดหน้าต่างรายละเอียด" @click="close">ปิด</button>
        </header>

        <div class="booking-detail-summary">
          <span class="status" :class="booking.status">{{ state.statusText[booking.status] || booking.status }}</span>
          <span>รหัสรายการ #{{ booking.id }}</span>
        </div>

        <div class="booking-detail-grid">
          <div class="booking-detail-field"><small>ห้องประชุม</small><strong>{{ booking.room_name || '-' }}</strong></div>
          <div class="booking-detail-field"><small>สาขา / อาคาร</small><strong>{{ booking.branch_name || booking.building || '-' }}</strong></div>
          <div class="booking-detail-field"><small>ผู้จอง</small><strong>{{ booking.requester_name || '-' }}</strong></div>
          <div class="booking-detail-field"><small>จำนวนผู้เข้าร่วม</small><strong>{{ booking.attendee_count || '-' }} คน</strong></div>
          <div class="booking-detail-field"><small>อีเมล</small><strong>{{ booking.requester_email || '-' }}</strong></div>
          <div class="booking-detail-field"><small>เบอร์โทร</small><strong>{{ booking.requester_phone || '-' }}</strong></div>
          <div class="booking-detail-field booking-detail-wide">
            <small>วันและเวลาใช้งาน</small>
            <strong>{{ state.formatDateTime(booking.start_at) }}</strong>
            <span>ถึง {{ state.formatDateTime(booking.end_at) }}</span>
          </div>
          <div class="booking-detail-field booking-detail-wide"><small>วัตถุประสงค์</small><span>{{ booking.purpose || '-' }}</span></div>
          <div v-if="booking.note" class="booking-detail-field booking-detail-wide"><small>หมายเหตุ</small><span>{{ booking.note }}</span></div>
        </div>

        <footer class="booking-detail-footer">
          <button class="ghost" type="button" @click="close">ปิดหน้าต่าง</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.booking-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 39, 59, 0.55);
  backdrop-filter: blur(3px);
}

.booking-detail-modal {
  width: min(760px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid #d7e5f2;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 28px 80px rgba(14, 37, 63, 0.3);
}

.booking-detail-header,
.booking-detail-summary,
.booking-detail-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.booking-detail-header {
  padding-bottom: 18px;
  border-bottom: 1px solid #dce7f1;
}

.booking-detail-header p {
  margin: 0 0 4px;
  color: #0968c8;
  font-weight: 800;
}

.booking-detail-header h2 {
  margin: 0;
  color: #142b45;
  font-size: 24px;
}

.booking-detail-summary {
  padding: 15px 0;
  color: #647892;
}

.booking-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.booking-detail-field {
  min-width: 0;
  display: grid;
  gap: 5px;
  padding: 13px;
  border: 1px solid #cee0f2;
  border-radius: 10px;
  background: #f7faff;
  color: #18324f;
}

.booking-detail-field small {
  color: #657f9e;
}

.booking-detail-field strong,
.booking-detail-field span {
  overflow-wrap: anywhere;
}

.booking-detail-wide {
  grid-column: 1 / -1;
}

.booking-detail-footer {
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #dce7f1;
}

@media (max-width: 640px) {
  .booking-detail-backdrop { padding: 10px; }
  .booking-detail-modal { max-height: calc(100vh - 20px); padding: 17px; border-radius: 12px; }
  .booking-detail-grid { grid-template-columns: 1fr; }
  .booking-detail-wide { grid-column: auto; }
  .booking-detail-header h2 { font-size: 20px; }
}
</style>
