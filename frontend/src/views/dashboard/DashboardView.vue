
<script setup>
import { computed } from 'vue';

const props = defineProps({ state: Object });
const dashboard = computed(() => props.state?.dashboard?.value || props.state?.dashboard || {});
const upcoming = computed(() => Array.isArray(dashboard.value.upcoming) ? dashboard.value.upcoming : []);
const unread = computed(() => props.state?.unreadCount?.value ?? dashboard.value.unread ?? 0);

function goReserve() {
  if (props.state?.view) props.state.view.value = 'reserve';
}

function goNotifications() {
  if (props.state?.view) props.state.view.value = 'notifications';
  props.state?.loadNotifications?.(true);
}
</script>

<template>
  <section class="dashboard-mobile-page">
    <div class="dashboard-summary">
      <article class="metric-card ready">
        <span>ห้องว่างตอนนี้</span>
        <strong>{{ dashboard.roomsReady || 0 }}</strong>
        <small>จากทั้งหมด {{ dashboard.totalRooms || 0 }} ห้อง</small>
      </article>
      <article class="metric-card busy">
        <span>กำลังใช้งาน</span>
        <strong>{{ dashboard.occupiedRooms || 0 }}</strong>
        <small>อิงจากการจองที่อนุมัติแล้ว</small>
      </article>
      <article class="metric-card today">
        <span>จองวันนี้</span>
        <strong>{{ dashboard.todayBookings || 0 }}</strong>
        <small>รออนุมัติ {{ dashboard.pendingBookings || 0 }} รายการ</small>
      </article>
      <article class="metric-card notice">
        <span>แจ้งเตือนใหม่</span>
        <strong>{{ unread }}</strong>
        <small>รายการที่ยังไม่อ่าน</small>
      </article>
    </div>

    <div class="quick-actions">
      <button type="button" class="primary" @click="goReserve">ค้นหาและจองห้อง</button>
      <button type="button" class="ghost" @click="goNotifications">ดูแจ้งเตือน</button>
    </div>

    <section class="panel upcoming-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">ตารางถัดไป</p>
          <h2>กำหนดการใกล้เข้ามา</h2>
        </div>
      </div>
      <div v-if="!upcoming.length" class="empty-state">
        <strong>ยังไม่มีกำหนดการ</strong>
        <span>เมื่อมีการจองหรืออนุมัติ รายการจะแสดงตรงนี้</span>
      </div>
      <div v-else class="upcoming-list">
        <article v-for="item in upcoming" :key="item.id" class="upcoming-item">
          <div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.room_name }}</span>
          </div>
          <time>{{ props.state?.formatDateTime?.(item.start_at) || item.start_at }}</time>
        </article>
      </div>
    </section>
  </section>
</template>
