<script setup>
import { computed } from 'vue';
import { BarChart3, CalendarDays, CircleCheck, PieChart, Users } from '@lucide/vue';

const props = defineProps({ state: Object });
const report = computed(() => props.state.stats.value || {});
const statuses = computed(() => Array.isArray(report.value.byStatus) ? report.value.byStatus : []);
const rooms = computed(() => Array.isArray(report.value.topRooms) ? report.value.topRooms : []);
const users = computed(() => Array.isArray(report.value.topUsers) ? report.value.topUsers : []);
const totalBookings = computed(() => statuses.value.reduce((sum, item) => sum + Number(item.total || 0), 0));
const approvedBookings = computed(() => statuses.value.filter((item) => ['approved', 'checked_in', 'completed'].includes(item.status)).reduce((sum, item) => sum + Number(item.total || 0), 0));
const pendingBookings = computed(() => statuses.value.filter((item) => item.status === 'pending').reduce((sum, item) => sum + Number(item.total || 0), 0));
const maxRoomTotal = computed(() => Math.max(1, ...rooms.value.map((item) => Number(item.total || 0))));
const pieStyle = computed(() => {
  if (!statuses.value.length) return { background: '#e9f0f8' };
  const colors = ['#176ac4', '#27a36a', '#ef9b28', '#e55c5c', '#6d7f98', '#7562d8'];
  let cursor = 0;
  const sections = statuses.value.map((item, index) => {
    const start = cursor;
    cursor += (Number(item.total || 0) / Math.max(1, totalBookings.value)) * 100;
    return colors[index % colors.length] + ' ' + start + '% ' + cursor + '%';
  });
  return { background: 'conic-gradient(' + sections.join(', ') + ')' };
});

function statusLabel(status) {
  return ({ pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก', checked_in: 'เช็กอินแล้ว', completed: 'เสร็จสิ้น', no_show: 'ไม่มาใช้งาน' })[status] || status;
}

function statusColor(index) {
  return ['#176ac4', '#27a36a', '#ef9b28', '#e55c5c', '#6d7f98', '#7562d8'][index % 6];
}
</script>

<template>
  <section class="stats-page">
    <header class="stats-heading panel">
      <div><p>ภาพรวมผู้ดูแลระบบ</p><h2>สถิติการใช้งาน</h2><span>สรุปจากข้อมูลการจองจริงในระบบ</span></div>
      <button class="primary compact" type="button" @click="state.loadStats"><BarChart3 />รีเฟรชข้อมูล</button>
    </header>

    <div class="stats-metrics">
      <article class="stat-summary blue"><CalendarDays /><span>การจองทั้งหมด</span><strong>{{ totalBookings }}</strong><small>ทุกสถานะ</small></article>
      <article class="stat-summary green"><CircleCheck /><span>อนุมัติหรือเสร็จสิ้น</span><strong>{{ approvedBookings }}</strong><small>พร้อมใช้งาน</small></article>
      <article class="stat-summary amber"><Users /><span>รออนุมัติ</span><strong>{{ pendingBookings }}</strong><small>ต้องตรวจสอบ</small></article>
    </div>

    <div class="stats-charts">
      <article class="stats-panel panel">
        <header><div><p>ห้องยอดนิยม</p><h3>จำนวนการจองแยกตามห้อง</h3></div><BarChart3 /></header>
        <div v-if="rooms.length" class="room-bars">
          <div v-for="room in rooms" :key="room.room_name" class="bar-row">
            <span class="bar-label">{{ room.room_name }}</span>
            <div class="bar-track"><i :style="{ width: (Number(room.total || 0) / maxRoomTotal * 100) + '%' }"></i></div>
            <b>{{ room.total }}</b>
          </div>
        </div>
        <div v-else class="stats-empty">ยังไม่มีข้อมูลการจอง</div>
      </article>

      <article class="stats-panel panel">
        <header><div><p>สถานะการจอง</p><h3>สัดส่วนรายการทั้งหมด</h3></div><PieChart /></header>
        <div v-if="statuses.length" class="status-chart">
          <div class="donut" :style="pieStyle"><span><b>{{ totalBookings }}</b><small>รายการ</small></span></div>
          <div class="status-legend"><div v-for="(item, index) in statuses" :key="item.status"><i :style="{ background: statusColor(index) }"></i><span>{{ statusLabel(item.status) }}</span><b>{{ item.total }}</b></div></div>
        </div>
        <div v-else class="stats-empty">ยังไม่มีข้อมูลสถานะ</div>
      </article>
    </div>

    <article class="stats-panel panel">
      <header><div><p>ผู้ใช้งาน</p><h3>ผู้ส่งคำขอจองมากที่สุด</h3></div><Users /></header>
      <div v-if="users.length" class="user-stat-list"><div v-for="(user, index) in users" :key="user.requester_name"><span>{{ index + 1 }}</span><strong>{{ user.requester_name }}</strong><b>{{ user.total }} รายการ</b></div></div>
      <div v-else class="stats-empty">ยังไม่มีข้อมูลผู้ใช้งาน</div>
    </article>
  </section>
</template>

<style scoped>
.stats-page { display: grid; gap: 16px; }.stats-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 22px; }.stats-heading p, .stats-panel header p { margin: 0 0 4px; color: #176ac4; font-weight: 800; font-size: 13px; }.stats-heading h2, .stats-panel h3 { margin: 0; color: #102b4d; }.stats-heading span { display: block; margin-top: 6px; color: #687a92; }.stats-heading button { display: inline-flex; align-items: center; gap: 7px; }.stats-heading svg { width: 16px; }
.stats-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }.stat-summary { min-height: 138px; position: relative; overflow: hidden; border: 1px solid #d8e4f3; border-radius: 12px; padding: 18px; background: #fff; display: grid; align-content: start; gap: 5px; }.stat-summary svg { width: 23px; height: 23px; }.stat-summary span, .stat-summary small { color: #667a94; }.stat-summary strong { font-size: 42px; line-height: 1; color: #102b4d; margin-top: 4px; }.stat-summary.blue { background: #f4f9ff; border-color: #bcd8f8; }.stat-summary.blue svg { color: #176ac4; }.stat-summary.green { background: #f2fbf6; border-color: #bce5cc; }.stat-summary.green svg { color: #21955f; }.stat-summary.amber { background: #fffaf0; border-color: #f3daab; }.stat-summary.amber svg { color: #c8810a; }
.stats-charts { display: grid; grid-template-columns: 1.25fr 1fr; gap: 14px; }.stats-panel { padding: 20px; }.stats-panel header { display: flex; align-items: start; justify-content: space-between; gap: 10px; margin-bottom: 20px; }.stats-panel header > svg { color: #176ac4; width: 23px; height: 23px; }.room-bars { display: grid; gap: 15px; }.bar-row { display: grid; grid-template-columns: minmax(90px, 150px) 1fr 32px; gap: 10px; align-items: center; }.bar-label { color: #385775; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.bar-track { height: 12px; border-radius: 999px; background: #eaf2fb; overflow: hidden; }.bar-track i { display: block; height: 100%; background: #176ac4; border-radius: inherit; min-width: 5px; }.bar-row b { color: #102b4d; text-align: right; }
.status-chart { display: flex; align-items: center; justify-content: center; gap: 24px; min-height: 182px; }.donut { width: 142px; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; flex: 0 0 auto; }.donut > span { width: 84px; aspect-ratio: 1; border-radius: 50%; background: #fff; display: grid; place-content: center; text-align: center; }.donut b { color: #102b4d; font-size: 24px; }.donut small { color: #6d7f98; }.status-legend { display: grid; gap: 9px; width: min(100%, 205px); }.status-legend div { display: grid; grid-template-columns: 10px 1fr auto; gap: 7px; align-items: center; color: #48617d; }.status-legend i { width: 10px; height: 10px; border-radius: 50%; }.status-legend b { color: #102b4d; }.user-stat-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }.user-stat-list > div { display: grid; grid-template-columns: 30px 1fr auto; gap: 8px; align-items: center; padding: 11px; border: 1px solid #dce8f5; border-radius: 8px; }.user-stat-list span { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 50%; background: #eaf3ff; color: #176ac4; font-weight: 800; }.user-stat-list strong { color: #284867; }.user-stat-list b { color: #176ac4; font-size: 13px; }.stats-empty { min-height: 130px; display: grid; place-items: center; color: #7b8da3; border: 1px dashed #c9d9e9; border-radius: 9px; }
@media (max-width: 760px) { .stats-heading { padding: 16px; align-items: flex-start; flex-direction: column; }.stats-heading h2 { font-size: 23px; }.stats-metrics, .stats-charts { grid-template-columns: 1fr; }.stat-summary { min-height: 105px; }.stat-summary strong { font-size: 36px; }.stats-panel { padding: 16px; }.status-chart { gap: 15px; align-items: start; }.donut { width: 118px; }.donut > span { width: 70px; }.user-stat-list { grid-template-columns: 1fr; }.bar-row { grid-template-columns: 95px 1fr 28px; gap: 7px; } }
</style>
