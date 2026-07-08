<script setup>
defineProps({ state: Object });
</script>

<template>
  <section class="panel">
    <div class="section-title">
      <div>
        <p>MY BOOKINGS</p>
        <h2>ประวัติการจองของฉัน</h2>
      </div>
      <button class="ghost compact" @click="state.loadMyBookings()">รีเฟรช</button>
    </div>

    <div v-if="!state.myBookings.value.length" class="empty">
      ยังไม่มีประวัติการจอง
    </div>

    <div v-else class="table booking-history">
      <div class="table-head">
        <span>รายการ</span>
        <span>เวลา</span>
        <span>สถานะ</span>
        <span>จัดการ</span>
      </div>

      <div v-for="booking in state.myBookings.value" :key="booking.id" class="booking-row table-row">
        <div>
          <strong>{{ booking.title }}</strong>
          <small>{{ booking.room_name }} · {{ booking.branch_name || '-' }}</small>
        </div>
        <div>
          <span>{{ state.formatDateTime(booking.start_at) }}</span>
          <small>ถึง {{ state.formatDateTime(booking.end_at) }}</small>
        </div>
        <span class="status" :class="booking.status">{{ state.statusText[booking.status] || booking.status }}</span>
        <div class="actions">
          <button v-if="booking.status === 'approved' && booking.can_check_in" class="primary compact" @click="state.checkInBooking(booking)">Check-in</button>
          <span v-else-if="booking.status === 'approved'" class="muted">Check-in ได้เมื่อถึงเวลา</span>
          <span v-else class="muted">-</span>
        </div>
      </div>
    </div>
  </section>
</template>
