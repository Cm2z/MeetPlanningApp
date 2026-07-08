
<script setup>
defineProps({ state: Object });
</script>

<template>
  <section class="admin-workspace bookings-page">
    <div class="admin-help">
      <div>
        <p>งานของผู้ดูแลระบบ</p>
        <h2>รายการจองและอนุมัติ</h2>
        <span>ตรวจคำขอจองใหม่ เลือกอนุมัติหรือปฏิเสธ และติดตามสถานะการใช้งานห้อง</span>
      </div>
      <button class="ghost compact" @click="state.loadBookings()">รีเฟรช</button>
    </div>

    <div class="admin-steps">
      <div><b>1</b><span>ตรวจชื่อผู้จองและห้อง</span></div>
      <div><b>2</b><span>ดูวันเวลาและจำนวนคน</span></div>
      <div><b>3</b><span>กดอนุมัติหรือปฏิเสธ</span></div>
    </div>

    <div v-if="!state.bookings.value.length" class="empty notification-empty">ยังไม่มีรายการจอง</div>

    <div v-else class="booking-admin-list">
      <article v-for="booking in state.bookings.value" :key="booking.id" class="booking-admin-card" :class="booking.status">
        <div>
          <div class="booking-title-line">
            <strong>{{ booking.title }}</strong>
            <span class="status" :class="booking.status">{{ state.statusText[booking.status] || booking.status }}</span>
          </div>
          <p>{{ booking.room_name }} · {{ booking.branch_name || '-' }}</p>
          <small>ผู้จอง: {{ booking.requester_name || '-' }}</small>
        </div>
        <div>
          <p>{{ state.formatDateTime(booking.start_at) }}</p>
          <small>ถึง {{ state.formatDateTime(booking.end_at) }}</small>
        </div>
        <div class="actions">
          <button v-if="booking.status === 'pending'" class="primary compact" @click="state.setStatus(booking, 'approved')">อนุมัติ</button>
          <button v-if="booking.status === 'pending'" class="danger ghost compact" @click="state.setStatus(booking, 'rejected')">ปฏิเสธ</button>
          <button v-if="booking.status === 'approved'" class="ghost compact" @click="state.setStatus(booking, 'completed')">เสร็จสิ้น</button>
        </div>
      </article>
    </div>
  </section>
</template>
