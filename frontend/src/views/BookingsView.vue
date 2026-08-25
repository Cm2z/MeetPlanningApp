<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BookingDetailModal from '../components/BookingDetailModal.vue';
import { appConfirm } from '../dialog.js';

const props = defineProps({ state: Object });

const selectedBooking = ref(null);
const search = ref('');
const statusFilter = ref('all');
const dateFilter = ref('');
const sortBy = ref('pending_first');
const page = ref(1);
const pageSize = 10;
let refreshTimer = null;

const bookings = computed(() => props.state.bookings.value || []);
const counts = computed(() => ({
  all: bookings.value.length,
  pending: bookings.value.filter((item) => item.status === 'pending').length,
  approved: bookings.value.filter((item) => item.status === 'approved').length,
  completed: bookings.value.filter((item) => ['completed', 'checked_in'].includes(item.status)).length,
}));

function localDate(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

const filteredBookings = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  const rows = bookings.value.filter((booking) => {
    const searchable = [booking.title, booking.requester_name, booking.room_name, booking.branch_name, booking.requester_email, booking.id]
      .map((value) => String(value || '').toLowerCase()).join(' ');
    const matchesSearch = !keyword || searchable.includes(keyword);
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'completed' ? ['completed', 'checked_in'].includes(booking.status) : booking.status === statusFilter.value);
    const matchesDate = !dateFilter.value || localDate(booking.start_at) === dateFilter.value;
    return matchesSearch && matchesStatus && matchesDate;
  });

  return [...rows].sort((a, b) => {
    if (sortBy.value === 'start_asc') return new Date(a.start_at) - new Date(b.start_at);
    if (sortBy.value === 'start_desc') return new Date(b.start_at) - new Date(a.start_at);
    if (sortBy.value === 'newest') return new Date(b.created_at || b.start_at) - new Date(a.created_at || a.start_at);
    const priority = { pending: 0, approved: 1, checked_in: 2, completed: 3, rejected: 4, cancelled: 5, no_show: 6 };
    return (priority[a.status] ?? 9) - (priority[b.status] ?? 9) || new Date(b.created_at || b.start_at) - new Date(a.created_at || a.start_at);
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredBookings.value.length / pageSize)));
const pagedBookings = computed(() => filteredBookings.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const resultStart = computed(() => filteredBookings.value.length ? (page.value - 1) * pageSize + 1 : 0);
const resultEnd = computed(() => Math.min(page.value * pageSize, filteredBookings.value.length));

watch([search, statusFilter, dateFilter, sortBy], () => { page.value = 1; });
watch(totalPages, (value) => { if (page.value > value) page.value = value; });

function setQuickFilter(status) {
  statusFilter.value = status;
}

function clearFilters() {
  search.value = '';
  statusFilter.value = 'all';
  dateFilter.value = '';
  sortBy.value = 'pending_first';
}

async function updateStatus(booking, status) {
  const text = status === 'approved' ? 'อนุมัติ' : status === 'rejected' ? 'ปฏิเสธ' : 'ยืนยันว่าเสร็จสิ้น';
  const variant = status === 'rejected' ? 'danger' : status === 'approved' ? 'success' : 'primary';
  if (!await appConfirm(text + 'รายการ “' + booking.title + '” ใช่หรือไม่?', { title: text + 'รายการจอง', confirmText: text, variant })) return;
  await props.state.setStatus(booking, status);
}

onMounted(() => {
  refreshTimer = window.setInterval(() => props.state.loadBookings?.(), 60_000);
});

onBeforeUnmount(() => window.clearInterval(refreshTimer));
</script>

<template>
  <section class="booking-console">
    <header class="booking-hero">
      <div>
        <p>BOOKING OPERATIONS</p>
        <h2>รายการจองและอนุมัติ</h2>
        <span>ค้นหา ตรวจสอบ และจัดการคำขอจองทั้งหมดได้จากที่เดียว</span>
      </div>
      <button class="hero-refresh" type="button" @click="state.loadBookings()">↻ รีเฟรชข้อมูล</button>
    </header>

    <div class="booking-metrics">
      <button :class="{ active: statusFilter === 'all' }" type="button" @click="setQuickFilter('all')">
        <span>รายการทั้งหมด</span><strong>{{ counts.all }}</strong><small>รายการในระบบ</small>
      </button>
      <button class="pending" :class="{ active: statusFilter === 'pending' }" type="button" @click="setQuickFilter('pending')">
        <span>รอการตรวจสอบ</span><strong>{{ counts.pending }}</strong><small>ควรดำเนินการก่อน</small>
      </button>
      <button class="approved" :class="{ active: statusFilter === 'approved' }" type="button" @click="setQuickFilter('approved')">
        <span>อนุมัติแล้ว</span><strong>{{ counts.approved }}</strong><small>กำลังรอใช้งาน</small>
      </button>
      <button class="completed" :class="{ active: statusFilter === 'completed' }" type="button" @click="setQuickFilter('completed')">
        <span>ดำเนินการแล้ว</span><strong>{{ counts.completed }}</strong><small>Check-in / เสร็จสิ้น</small>
      </button>
    </div>

    <section class="booking-tools" aria-label="ค้นหาและกรองรายการจอง">
      <label class="search-field">
        <span>ค้นหารายการ</span>
        <input v-model="search" type="search" placeholder="ชื่อการประชุม ผู้จอง ห้อง หรือรหัสรายการ" />
      </label>
      <label><span>สถานะ</span>
        <select v-model="statusFilter">
          <option value="all">ทุกสถานะ</option><option value="pending">รออนุมัติ</option><option value="approved">อนุมัติแล้ว</option>
          <option value="checked_in">Check-in แล้ว</option><option value="completed">เสร็จสิ้น</option><option value="rejected">ปฏิเสธ</option><option value="cancelled">ยกเลิก</option>
        </select>
      </label>
      <label><span>วันที่ใช้งาน</span><input v-model="dateFilter" type="date" /></label>
      <label><span>เรียงลำดับ</span>
        <select v-model="sortBy"><option value="pending_first">งานรอดำเนินการก่อน</option><option value="newest">คำขอล่าสุด</option><option value="start_asc">วันใช้งานใกล้สุด</option><option value="start_desc">วันใช้งานไกลสุด</option></select>
      </label>
      <button class="clear-button" type="button" @click="clearFilters">ล้างตัวกรอง</button>
    </section>

    <section class="booking-results">
      <div class="result-heading">
        <div><h3>{{ statusFilter === 'pending' ? 'คำขอที่รออนุมัติ' : 'ประวัติและรายการจอง' }}</h3><span>พบ {{ filteredBookings.length }} รายการ</span></div>
        <small v-if="filteredBookings.length">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredBookings.length }}</small>
      </div>

      <div v-if="!bookings.length" class="booking-empty"><b>ยังไม่มีรายการจอง</b><span>คำขอใหม่จะแสดงที่หน้านี้โดยอัตโนมัติ</span></div>
      <div v-else-if="!filteredBookings.length" class="booking-empty"><b>ไม่พบรายการที่ค้นหา</b><span>ลองเปลี่ยนคำค้นหา วันที่ หรือสถานะ</span><button type="button" @click="clearFilters">ล้างตัวกรอง</button></div>

      <div v-else class="booking-list">
        <article v-for="booking in pagedBookings" :key="booking.id" class="booking-item" :class="booking.status">
          <div class="status-rail"></div>
          <div class="booking-main">
            <div class="booking-title-row">
              <span class="booking-id">#{{ booking.id }}</span>
              <strong>{{ booking.title }}</strong>
              <span class="status" :class="booking.status">{{ state.statusText[booking.status] || booking.status }}</span>
            </div>
            <div class="booking-meta"><span>ห้อง {{ booking.room_name || '-' }}</span><i>•</i><span>{{ booking.branch_name || booking.building || '-' }}</span></div>
            <div class="requester"><span class="requester-avatar">{{ String(booking.requester_name || 'U').slice(0, 1) }}</span><span><small>ผู้จอง</small><b>{{ booking.requester_name || '-' }}</b></span></div>
          </div>
          <div class="booking-schedule"><small>วันและเวลาใช้งาน</small><strong>{{ state.formatDateTime(booking.start_at) }}</strong><span>ถึง {{ state.formatDateTime(booking.end_at) }}</span></div>
          <div class="booking-actions">
            <button class="detail-button" type="button" @click="selectedBooking = booking">ดูรายละเอียด</button>
            <button v-if="booking.status === 'pending'" class="approve-button" type="button" @click="updateStatus(booking, 'approved')">อนุมัติ</button>
            <button v-if="booking.status === 'pending'" class="reject-button" type="button" @click="updateStatus(booking, 'rejected')">ปฏิเสธ</button>
            <button v-if="booking.status === 'approved'" class="complete-button" type="button" @click="updateStatus(booking, 'completed')">เสร็จสิ้น</button>
          </div>
        </article>
      </div>

      <nav v-if="totalPages > 1" class="pagination" aria-label="แบ่งหน้ารายการจอง">
        <button type="button" :disabled="page === 1" @click="page--">ก่อนหน้า</button>
        <span>หน้า {{ page }} จาก {{ totalPages }}</span>
        <button type="button" :disabled="page === totalPages" @click="page++">ถัดไป</button>
      </nav>
    </section>

    <BookingDetailModal v-if="selectedBooking" :booking="selectedBooking" :state="state" @close="selectedBooking = null" />
  </section>
</template>

<style scoped>
.booking-console{display:grid;gap:16px;color:#142f50}.booking-hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:28px 30px;border-radius:12px;background:#102d5c;color:#fff;box-shadow:0 14px 30px rgba(16,45,92,.16)}.booking-hero:after{content:"";position:absolute;right:-60px;top:-95px;width:260px;height:260px;border-radius:50%;background:rgba(55,133,224,.2)}.booking-hero>div,.hero-refresh{position:relative;z-index:1}.booking-hero p{margin:0 0 6px;color:#80b4f3;font-size:12px;font-weight:900;letter-spacing:.08em}.booking-hero h2{margin:0;font-size:29px}.booking-hero span{display:block;margin-top:7px;color:#cad9ec}.hero-refresh{min-height:42px;padding:0 16px;border:1px solid rgba(255,255,255,.28);border-radius:7px;background:rgba(255,255,255,.1);color:#fff;font-weight:800}.hero-refresh:hover{background:#fff;color:#174d8e}.booking-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.booking-metrics button{display:grid;gap:3px;padding:16px 18px;text-align:left;border:1px solid #d5e2f2;border-radius:9px;background:#fff;color:#667d98;box-shadow:0 6px 16px rgba(22,55,94,.04)}.booking-metrics button:hover,.booking-metrics button.active{border-color:#2d78ce;box-shadow:0 0 0 2px #deebfb}.booking-metrics span{font-size:13px;font-weight:800}.booking-metrics strong{color:#15385f;font-size:27px}.booking-metrics small{font-size:11px}.booking-metrics .pending strong{color:#b86b00}.booking-metrics .approved strong{color:#176bbb}.booking-metrics .completed strong{color:#10805c}.booking-tools{display:grid;grid-template-columns:minmax(260px,1.7fr) repeat(3,minmax(150px,.75fr)) auto;gap:12px;align-items:end;padding:18px;border:1px solid #d5e2f2;border-radius:10px;background:#f8fbff}.booking-tools label{display:grid;gap:6px;color:#365574;font-size:12px;font-weight:800}.booking-tools input,.booking-tools select{height:44px;border:1px solid #bfd3ea;border-radius:7px;background:#fff;color:#183a60}.booking-tools input:focus,.booking-tools select:focus{outline:0;border-color:#1f6fca;box-shadow:0 0 0 3px #deebfb}.clear-button{height:44px;padding:0 14px;border:1px solid #bfd3ea;border-radius:7px;background:#fff;color:#35618e;font-weight:800}.booking-results{overflow:hidden;border:1px solid #d5e2f2;border-radius:10px;background:#fff;box-shadow:0 10px 26px rgba(22,55,94,.05)}.result-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #e1eaf5}.result-heading>div{display:flex;align-items:baseline;gap:10px}.result-heading h3{margin:0;color:#15385f;font-size:18px}.result-heading span,.result-heading small{color:#70849d}.booking-list{display:grid}.booking-item{position:relative;display:grid;grid-template-columns:5px minmax(280px,1.35fr) minmax(235px,.75fr) minmax(260px,auto);gap:18px;align-items:center;padding:17px 18px 17px 0;border-bottom:1px solid #e4ebf4}.booking-item:last-child{border-bottom:0}.booking-item:hover{background:#fbfdff}.status-rail{align-self:stretch;border-radius:0 5px 5px 0;background:#9caabd}.booking-item.pending .status-rail{background:#e6a42c}.booking-item.approved .status-rail{background:#2b79cf}.booking-item.completed .status-rail,.booking-item.checked_in .status-rail{background:#16966a}.booking-item.rejected .status-rail,.booking-item.cancelled .status-rail{background:#db5c5c}.booking-main{display:grid;gap:9px}.booking-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.booking-title-row strong{font-size:16px;color:#102d50}.booking-id{color:#7a8fa8;font-size:12px;font-weight:800}.booking-meta{display:flex;gap:7px;flex-wrap:wrap;color:#536d8a;font-size:13px}.booking-meta i{color:#a6b6c8}.requester{display:flex;align-items:center;gap:8px}.requester-avatar{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#e8f2fd;color:#1769bd;font-size:12px;font-weight:900}.requester>span:last-child{display:grid}.requester small{color:#8294aa;font-size:10px}.requester b{font-size:12px}.booking-schedule{display:grid;gap:4px;padding-left:18px;border-left:1px solid #e0e9f3}.booking-schedule small{color:#7a8fa8}.booking-schedule strong{color:#173d67;font-size:14px}.booking-schedule span{color:#637b96;font-size:12px}.booking-actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap}.booking-actions button{min-height:38px;padding:0 12px;border-radius:6px;font-weight:800}.detail-button,.complete-button{border:1px solid #bcd2eb;background:#fff;color:#155da9}.approve-button{border:1px solid #1f6fca;background:#1f6fca;color:#fff}.reject-button{border:1px solid #efb3b3;background:#fff7f7;color:#b62c2c}.booking-actions button:hover{filter:brightness(.95)}.booking-empty{min-height:220px;display:grid;place-content:center;gap:8px;text-align:center;color:#71859d}.booking-empty b{color:#284b70;font-size:18px}.booking-empty button{justify-self:center;padding:9px 14px;border:1px solid #bcd2eb;border-radius:6px;background:#fff;color:#1767b9;font-weight:800}.pagination{display:flex;align-items:center;justify-content:center;gap:14px;padding:16px;border-top:1px solid #e1eaf5;color:#5e7692}.pagination button{padding:8px 13px;border:1px solid #bfd3ea;border-radius:6px;background:#fff;color:#1a61a8;font-weight:800}.pagination button:disabled{opacity:.4;cursor:not-allowed}@media(max-width:1180px){.booking-metrics{grid-template-columns:repeat(2,1fr)}.booking-tools{grid-template-columns:repeat(2,1fr)}.search-field{grid-column:1/-1}.booking-item{grid-template-columns:5px minmax(260px,1fr) minmax(220px,.75fr)}.booking-actions{grid-column:2/-1;justify-content:flex-start}}@media(max-width:700px){.booking-hero{align-items:flex-start;flex-direction:column;padding:22px}.booking-hero h2{font-size:24px}.booking-metrics,.booking-tools{grid-template-columns:1fr}.search-field{grid-column:auto}.booking-item{grid-template-columns:5px 1fr;padding-right:14px}.booking-schedule,.booking-actions{grid-column:2;padding-left:0;border-left:0}.booking-actions{justify-content:flex-start}.booking-actions button{flex:1}.result-heading{align-items:flex-start;flex-direction:column}.result-heading>div{display:grid}.pagination{gap:8px}}
</style>
