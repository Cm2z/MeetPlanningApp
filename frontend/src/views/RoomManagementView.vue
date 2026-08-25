<script setup>
import { appConfirm, appPrompt } from '../dialog.js';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api } from '../api.js';
import { Building2, ImagePlus, Pencil, Plus, Power, RefreshCw, Save, X } from '@lucide/vue';

const props = defineProps({ state: Object });

const loading = ref(false);
const saving = ref(false);
const rooms = ref([]);
const meta = ref({ branches: [], equipment: [] });
const editorOpen = ref(false);
const editingId = ref(null);
const selectedEquipment = ref([]);
const additionalImages = ref('');
const query = ref('');
const statusFilter = ref('all');
const branchFilter = ref('all');
const buildingFilter = ref('all');
const sortBy = ref('name');
const page = ref(1);
const pageSize = 12;

function freshForm() {
  return {
    name: '', code: '', branchId: '', building: '', floor: '', capacity: 4,
    status: 'available', description: '', imageUrl: '',
  };
}

const form = reactive(freshForm());
const isEditing = computed(() => Boolean(editingId.value));
const activeRooms = computed(() => rooms.value.filter((room) => room.status === 'available').length);
const maintenanceRooms = computed(() => rooms.value.filter((room) => room.status === 'maintenance').length);
const disabledRooms = computed(() => rooms.value.filter((room) => room.status === 'disabled').length);
const buildings = computed(() => [...new Set(rooms.value.map((room) => room.building).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')));
const filteredRooms = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  const rows = rooms.value.filter((room) => {
    const text = [room.name, room.code, room.branch_name, room.building, room.floor, room.description]
      .map((value) => String(value || '').toLowerCase()).join(' ');
    return (!keyword || text.includes(keyword))
      && (statusFilter.value === 'all' || room.status === statusFilter.value)
      && (branchFilter.value === 'all' || String(room.branch_id) === String(branchFilter.value))
      && (buildingFilter.value === 'all' || room.building === buildingFilter.value);
  });
  return [...rows].sort((a, b) => {
    if (sortBy.value === 'capacity_desc') return Number(b.capacity) - Number(a.capacity);
    if (sortBy.value === 'capacity_asc') return Number(a.capacity) - Number(b.capacity);
    if (sortBy.value === 'building') return String(a.building || '').localeCompare(String(b.building || ''), 'th') || String(a.name).localeCompare(String(b.name), 'th');
    return String(a.name || '').localeCompare(String(b.name || ''), 'th');
  });
});
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRooms.value.length / pageSize)));
const pagedRooms = computed(() => filteredRooms.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const resultStart = computed(() => filteredRooms.value.length ? (page.value - 1) * pageSize + 1 : 0);
const resultEnd = computed(() => Math.min(page.value * pageSize, filteredRooms.value.length));

watch([query, statusFilter, branchFilter, buildingFilter, sortBy], () => { page.value = 1; });
watch(totalPages, (value) => { if (page.value > value) page.value = value; });

function clearFilters() {
  query.value = '';
  statusFilter.value = 'all';
  branchFilter.value = 'all';
  buildingFilter.value = 'all';
  sortBy.value = 'name';
}

function statusText(status) {
  return ({ available: 'พร้อมใช้งาน', maintenance: 'ปรับปรุง', disabled: 'ปิดใช้งาน' })[status] || status;
}

function resetForm() {
  Object.assign(form, freshForm());
  form.branchId = meta.value.branches[0]?.id || '';
  selectedEquipment.value = [];
  additionalImages.value = '';
  editingId.value = null;
}

function normalizeImages(room) {
  return (room.images || []).map((image) => image.image_url || image.imageUrl).filter(Boolean);
}

async function loadData() {
  loading.value = true;
  try {
    const [roomData, metaData] = await Promise.all([api('/rooms?status='), api('/rooms/meta')]);
    rooms.value = Array.isArray(roomData) ? roomData : [];
    meta.value = metaData || { branches: [], equipment: [] };
    if (!form.branchId) form.branchId = meta.value.branches?.[0]?.id || '';
  } catch (error) {
    props.state.notify(error.message);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  resetForm();
  editorOpen.value = true;
}

function openEdit(room) {
  editingId.value = room.id;
  form.name = room.name || '';
  form.code = room.code || '';
  form.branchId = room.branch_id || room.branchId || meta.value.branches[0]?.id || '';
  form.building = room.building || '';
  form.floor = room.floor || '';
  form.capacity = Number(room.capacity || 1);
  form.status = room.status || 'available';
  form.description = room.description || '';
  form.imageUrl = room.image_url || room.imageUrl || '';
  selectedEquipment.value = (room.equipment || []).map((item) => ({ id: Number(item.id), quantity: Number(item.quantity || 1) }));
  additionalImages.value = normalizeImages(room).filter((url) => url !== form.imageUrl).join('\\n');
  editorOpen.value = true;
}

function isSelected(equipmentId) {
  return selectedEquipment.value.some((item) => Number(item.id) === Number(equipmentId));
}

function toggleEquipment(equipmentId) {
  const id = Number(equipmentId);
  if (isSelected(id)) {
    selectedEquipment.value = selectedEquipment.value.filter((item) => Number(item.id) !== id);
  } else {
    selectedEquipment.value = [...selectedEquipment.value, { id, quantity: 1 }];
  }
}

function buildImages() {
  const urls = [form.imageUrl, ...additionalImages.value.split(/\r?\n/)]
    .map((url) => url.trim())
    .filter(Boolean);
  return [...new Set(urls)].map((imageUrl, index) => ({ imageUrl, caption: '', sortOrder: index }));
}

async function saveRoom() {
  if (!form.name.trim() || !form.building.trim() || !String(form.floor).trim()) {
    props.state.notify('กรุณากรอกชื่อห้อง อาคาร และชั้นให้ครบ');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...form,
      branchId: Number(form.branchId) || 1,
      capacity: Math.max(1, Number(form.capacity) || 1),
      equipment: selectedEquipment.value,
      images: buildImages(),
    };
    const endpoint = isEditing.value ? '/rooms/' + editingId.value : '/rooms';
    await api(endpoint, { method: isEditing.value ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
    props.state.notify(isEditing.value ? 'บันทึกการแก้ไขห้องแล้ว' : 'เพิ่มห้องประชุมแล้ว');
    editorOpen.value = false;
    await loadData();
  } catch (error) {
    props.state.notify(error.message);
  } finally {
    saving.value = false;
  }
}

async function disableRoom(room) {
  if (!await appConfirm('ต้องการปิดใช้งานห้อง “' + room.name + '” ใช่หรือไม่', { title: 'ปิดใช้งานห้องประชุม', confirmText: 'ดำเนินการต่อ', variant: 'warning' })) return;
  const typedName = await appPrompt('พิมพ์ชื่อห้อง “' + room.name + '” ให้ตรงกันเพื่อยืนยัน', { title: 'ยืนยันชื่อห้อง', inputLabel: 'ชื่อห้องประชุม', placeholder: room.name, confirmText: 'ปิดใช้งานห้อง', variant: 'danger' });
  if (typedName !== room.name) {
    props.state.notify('ชื่อห้องไม่ตรงกัน จึงยังไม่ปิดใช้งาน');
    return;
  }
  try {
    await api('/rooms/' + room.id, { method: 'DELETE' });
    props.state.notify('ปิดใช้งานห้องแล้ว สามารถเปิดใช้งานใหม่ภายหลังได้');
    await loadData();
  } catch (error) {
    props.state.notify(error.message);
  }
}

async function enableRoom(room) {
  try {
    await api('/rooms/' + room.id, { method: 'PATCH', body: JSON.stringify({
      name: room.name, code: room.code || '', branchId: room.branch_id || 1,
      building: room.building, floor: room.floor, capacity: room.capacity,
      status: 'available', description: room.description || '', imageUrl: room.image_url || '',
      equipment: (room.equipment || []).map((item) => ({ id: item.id, quantity: item.quantity || 1 })),
      images: normalizeImages(room).map((imageUrl, index) => ({ imageUrl, sortOrder: index })),
    }) });
    props.state.notify('เปิดใช้งานห้องแล้ว');
    await loadData();
  } catch (error) {
    props.state.notify(error.message);
  }
}

onMounted(loadData);
</script>

<template>
  <section class="room-admin-page">
    <header class="room-admin-header panel">
      <div>
        <p class="eyebrow">ผู้ดูแลระบบ</p>
        <h2>จัดการห้องประชุม</h2>
        <p>เพิ่ม แก้ไขรูปภาพและอุปกรณ์ หรือปิดใช้งานห้องที่ไม่พร้อมให้จอง</p>
      </div>
      <div class="room-admin-summary">
        <strong>{{ activeRooms }}</strong><span>ห้องพร้อมใช้</span>
        <button class="ghost compact icon-text" type="button" @click="loadData" :disabled="loading"><RefreshCw />รีเฟรช</button>
        <button class="primary compact icon-text" type="button" @click="openCreate"><Plus />เพิ่มห้อง</button>
      </div>
    </header>

    <section class="room-admin-metrics" aria-label="สรุปสถานะห้องประชุม">
      <button :class="{ active: statusFilter === 'all' }" type="button" @click="statusFilter = 'all'"><span>ทั้งหมด</span><strong>{{ rooms.length }}</strong></button>
      <button class="available" :class="{ active: statusFilter === 'available' }" type="button" @click="statusFilter = 'available'"><span>พร้อมใช้งาน</span><strong>{{ activeRooms }}</strong></button>
      <button class="maintenance" :class="{ active: statusFilter === 'maintenance' }" type="button" @click="statusFilter = 'maintenance'"><span>ปรับปรุง</span><strong>{{ maintenanceRooms }}</strong></button>
      <button class="disabled" :class="{ active: statusFilter === 'disabled' }" type="button" @click="statusFilter = 'disabled'"><span>ปิดใช้งาน</span><strong>{{ disabledRooms }}</strong></button>
    </section>

    <section class="room-admin-toolbar panel" aria-label="ค้นหาและกรองห้องประชุม">
      <label class="room-search-field">ค้นหาห้อง<input v-model="query" type="search" placeholder="ชื่อ รหัสห้อง อาคาร ชั้น หรือรายละเอียด" /></label>
      <label>สาขา<select v-model="branchFilter"><option value="all">ทุกสาขา</option><option v-for="branch in meta.branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option></select></label>
      <label>อาคาร<select v-model="buildingFilter"><option value="all">ทุกอาคาร</option><option v-for="building in buildings" :key="building" :value="building">{{ building }}</option></select></label>
      <label>เรียงลำดับ<select v-model="sortBy"><option value="name">ชื่อห้อง ก–ฮ</option><option value="building">อาคาร</option><option value="capacity_desc">ความจุมากสุด</option><option value="capacity_asc">ความจุน้อยสุด</option></select></label>
      <button class="ghost compact" type="button" @click="clearFilters">ล้างตัวกรอง</button>
    </section>

    <div v-if="loading" class="room-admin-loading">กำลังโหลดข้อมูลห้องประชุม...</div>
    <div v-else-if="!rooms.length" class="room-admin-empty panel">
      <Building2 /><h3>ยังไม่มีห้องประชุม</h3><p>เริ่มต้นเพิ่มห้องแรกเพื่อให้ผู้ใช้ค้นหาและส่งคำขอจองได้</p>
      <button class="primary" type="button" @click="openCreate">เพิ่มห้องประชุม</button>
    </div>
    <div v-else-if="filteredRooms.length" class="room-admin-results">
      <div class="room-admin-results-head"><div><strong>รายการห้องประชุม</strong><span>พบ {{ filteredRooms.length }} ห้อง</span></div><small>แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredRooms.length }}</small></div>
      <div class="room-admin-grid">
      <article v-for="room in pagedRooms" :key="room.id" class="room-admin-card" :class="room.status">
        <img v-if="room.image_url || room.imageUrl" :src="room.image_url || room.imageUrl" :alt="room.name" />
        <div v-else class="room-admin-placeholder"><Building2 /></div>
        <div class="room-admin-card-body">
          <div class="room-admin-card-title">
            <div><h3>{{ room.name }}</h3><p>{{ room.branch_name || 'ไม่ระบุสาขา' }} · {{ room.building }} · ชั้น {{ room.floor }}</p></div>
            <span class="room-status" :class="room.status">{{ statusText(room.status) }}</span>
          </div>
          <div class="room-admin-facts"><span>{{ room.capacity }} คน</span><span>{{ (room.images || []).length || (room.image_url ? 1 : 0) }} รูป</span><span>{{ (room.equipment || []).length }} อุปกรณ์</span></div>
          <p class="room-admin-description">{{ room.description || 'ยังไม่มีรายละเอียดห้อง' }}</p>
          <div class="room-admin-actions">
            <button class="ghost compact icon-text" type="button" @click="openEdit(room)"><Pencil />แก้ไข</button>
            <button v-if="room.status === 'disabled'" class="primary compact icon-text" type="button" @click="enableRoom(room)"><Power />เปิดใช้งาน</button>
            <button v-else class="danger ghost compact icon-text" type="button" @click="disableRoom(room)"><Power />ปิดใช้งาน</button>
          </div>
        </div>
      </article>
      </div>
      <nav v-if="totalPages > 1" class="room-pagination" aria-label="เปลี่ยนหน้ารายการห้อง">
        <button class="ghost compact" type="button" :disabled="page <= 1" @click="page--">ก่อนหน้า</button>
        <span>หน้า {{ page }} จาก {{ totalPages }}</span>
        <button class="ghost compact" type="button" :disabled="page >= totalPages" @click="page++">ถัดไป</button>
      </nav>
    </div>
    <div v-else-if="rooms.length" class="room-admin-empty panel"><Building2 /><h3>ไม่พบห้องที่ค้นหา</h3><p>ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p><button class="ghost" type="button" @click="clearFilters">ล้างตัวกรอง</button></div>

    <div v-if="editorOpen" class="room-editor-backdrop" @click.self="editorOpen = false">
      <form class="room-editor" @submit.prevent="saveRoom">
        <header><div><p class="eyebrow">{{ isEditing ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล' }}</p><h2>{{ isEditing ? 'แก้ไขห้องประชุม' : 'เพิ่มห้องประชุม' }}</h2></div><button class="icon-button" type="button" aria-label="ปิด" @click="editorOpen = false"><X /></button></header>
        <div class="room-editor-content">
          <section>
            <h3>ข้อมูลห้อง</h3>
            <div class="room-form-grid">
              <label>ชื่อห้อง<input v-model="form.name" required placeholder="เช่น ห้องประชุมใหญ่" /></label>
              <label>รหัสห้อง<input v-model="form.code" placeholder="เช่น A-201" /></label>
              <label>สาขา<select v-model="form.branchId"><option v-for="branch in meta.branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option></select></label>
              <label>สถานะ<select v-model="form.status"><option value="available">พร้อมใช้งาน</option><option value="maintenance">ปรับปรุง</option><option value="disabled">ปิดใช้งาน</option></select></label>
              <label>อาคาร<input v-model="form.building" required placeholder="เช่น อาคาร A" /></label>
              <label>ชั้น<input v-model="form.floor" required placeholder="เช่น 2" /></label>
              <label>ความจุ (คน)<input v-model.number="form.capacity" type="number" min="1" required /></label>
              <label class="full">รายละเอียด<textarea v-model="form.description" rows="3" placeholder="อธิบายขนาดหรือจุดเด่นของห้อง"></textarea></label>
            </div>
          </section>
          <section>
            <h3><ImagePlus /> รูปภาพห้อง</h3>
            <div class="room-form-grid"><label class="full">ลิงก์รูปหลัก<input v-model="form.imageUrl" type="url" placeholder="https://..." /></label><label class="full">ลิงก์รูปเพิ่มเติม (หนึ่งลิงก์ต่อบรรทัด)<textarea v-model="additionalImages" rows="4" placeholder="https://...
https://..."></textarea></label></div>
          </section>
          <section>
            <h3>อุปกรณ์ประจำห้อง</h3>
            <div class="equipment-checks"><label v-for="item in meta.equipment" :key="item.id" :class="{ checked: isSelected(item.id) }"><input type="checkbox" :checked="isSelected(item.id)" @change="toggleEquipment(item.id)" /><span>{{ item.name }}</span></label></div>
          </section>
        </div>
        <footer><button class="ghost" type="button" @click="editorOpen = false">ยกเลิก</button><button class="primary icon-text" :disabled="saving"><Save />{{ saving ? 'กำลังบันทึก...' : 'บันทึกห้องประชุม' }}</button></footer>
      </form>
    </div>
  </section>
</template>

<style scoped>
.room-admin-page { display: grid; gap: 16px; }
.room-admin-header { display: flex; justify-content: space-between; gap: 20px; align-items: center; padding: 22px; }
.room-admin-header h2, .room-editor h2, .room-admin-card h3 { margin: 0; color: #102b4d; }
.room-admin-header p:not(.eyebrow) { margin: 6px 0 0; color: #65758c; }
.eyebrow { margin: 0 0 5px; color: #176ac4; font-weight: 800; font-size: 13px; }
.room-admin-summary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.room-admin-summary strong { color: #176ac4; font-size: 26px; }.room-admin-summary > span { color: #64748b; margin-right: 8px; }
.room-admin-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.room-admin-metrics button { min-height: 84px; display: grid; align-content: center; gap: 4px; padding: 14px 16px; text-align: left; border: 1px solid #cadcf2; border-radius: 12px; background: #fff; color: #65758c; }
.room-admin-metrics button strong { color: #176ac4; font-size: 27px; line-height: 1; }.room-admin-metrics button.active { border-color: #2279dc; box-shadow: 0 0 0 2px rgba(34,121,220,.1); }.room-admin-metrics button.available strong { color: #087b4d; }.room-admin-metrics button.maintenance strong { color: #aa6500; }.room-admin-metrics button.disabled strong { color: #65758c; }
.room-admin-toolbar { position: sticky; top: 10px; z-index: 8; display: grid; grid-template-columns: minmax(260px, 1.6fr) repeat(3, minmax(150px, .7fr)) auto; gap: 10px; align-items: end; padding: 15px; box-shadow: 0 8px 24px rgba(17,54,91,.07); }
.room-admin-toolbar label { display: grid; gap: 5px; color: #345474; font-size: 12px; font-weight: 800; }.room-admin-toolbar input,.room-admin-toolbar select { min-height: 44px; border: 1px solid #c3d7ed; border-radius: 9px; padding: 8px 10px; background: #fff; color: #183a60; }
.room-admin-results { overflow: hidden; border: 1px solid #cadcf2; border-radius: 13px; background: #fff; }.room-admin-results-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid #dce7f3; }.room-admin-results-head > div { display: flex; align-items: baseline; gap: 9px; }.room-admin-results-head strong { color: #102b4d; font-size: 18px; }.room-admin-results-head span,.room-admin-results-head small { color: #6b7c91; }
.room-admin-results .room-admin-grid { padding: 15px; }.room-pagination { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 14px 18px; border-top: 1px solid #dce7f3; color: #526b87; font-weight: 800; }.room-pagination button:disabled { opacity: .45; cursor: not-allowed; }
.icon-text { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }.icon-text svg { width: 16px; height: 16px; }
.room-admin-loading, .room-admin-empty { min-height: 200px; display: grid; place-items: center; align-content: center; text-align: center; gap: 8px; color: #62748d; }.room-admin-empty svg { width: 36px; height: 36px; color: #176ac4; }.room-admin-empty h3 { margin: 0; color: #102b4d; }
.room-admin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 15px; }
.room-admin-card { display: grid; grid-template-columns: 124px 1fr; overflow: hidden; border: 1px solid #cadcf2; border-radius: 12px; background: #fff; min-height: 190px; }.room-admin-card.disabled { opacity: .72; }.room-admin-card.maintenance { border-color: #f1c675; }
.room-admin-card > img { width: 100%; height: 100%; min-height: 190px; object-fit: cover; }.room-admin-placeholder { min-height: 190px; display: grid; place-items: center; color: #7398c7; background: #eaf3ff; }.room-admin-placeholder svg { width: 40px; height: 40px; }
.room-admin-card-body { padding: 15px; display: flex; flex-direction: column; gap: 9px; min-width: 0; }.room-admin-card-title { display: flex; justify-content: space-between; gap: 8px; }.room-admin-card-title p, .room-admin-description { margin: 4px 0 0; color: #64748b; font-size: 13px; }.room-admin-description { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.room-status, .room-admin-facts span { border-radius: 999px; padding: 4px 8px; font-size: 12px; font-weight: 700; white-space: nowrap; }.room-status.available { background: #e1f8ed; color: #087b4d; }.room-status.maintenance { background: #fff0cf; color: #a15d00; }.room-status.disabled { background: #f2f4f8; color: #5f6d80; }.room-admin-facts { display: flex; gap: 6px; flex-wrap: wrap; }.room-admin-facts span { background: #edf5ff; color: #176ac4; }.room-admin-actions { margin-top: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.room-editor-backdrop { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; background: rgba(15, 32, 55, .52); padding: 20px; }.room-editor { width: min(820px, 100%); max-height: min(88vh, 860px); display: flex; flex-direction: column; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 22px 60px rgba(7, 31, 59, .32); }.room-editor > header, .room-editor > footer { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #dbe7f6; }.room-editor > footer { border-top: 1px solid #dbe7f6; border-bottom: 0; gap: 10px; justify-content: flex-end; }.room-editor-content { overflow: auto; padding: 20px 22px; display: grid; gap: 20px; }.room-editor-content section h3 { margin: 0 0 10px; color: #19385d; font-size: 16px; display: flex; gap: 7px; align-items: center; }.room-editor-content section h3 svg { width: 18px; color: #176ac4; }.room-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }.room-form-grid label { display: grid; gap: 6px; color: #35516f; font-size: 13px; font-weight: 700; }.room-form-grid .full { grid-column: 1 / -1; }.room-form-grid input, .room-form-grid select, .room-form-grid textarea { width: 100%; border: 1px solid #bcd4ef; border-radius: 8px; padding: 10px 11px; font: inherit; color: #172e4d; background: #fff; box-sizing: border-box; }.room-form-grid textarea { resize: vertical; }.equipment-checks { display: flex; flex-wrap: wrap; gap: 8px; }.equipment-checks label { display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; background: #f4f8fd; border: 1px solid #d5e4f5; border-radius: 8px; cursor: pointer; color: #3c5877; }.equipment-checks label.checked { background: #e5f2ff; border-color: #4c9be7; color: #125ba4; }.equipment-checks input { accent-color: #176ac4; }
@media (max-width: 1100px) { .room-admin-toolbar { position: static; grid-template-columns: repeat(2, minmax(0, 1fr)); }.room-search-field { grid-column: 1 / -1; }.room-admin-toolbar > button { min-height: 44px; } }
@media (max-width: 720px) { .room-admin-header { align-items: flex-start; flex-direction: column; padding: 17px; }.room-admin-summary { justify-content: flex-start; }.room-admin-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }.room-admin-metrics button { min-height: 72px; }.room-admin-toolbar { grid-template-columns: 1fr; }.room-search-field { grid-column: auto; }.room-admin-results-head { align-items: flex-start; flex-direction: column; }.room-admin-card { grid-template-columns: 108px 1fr; min-height: 165px; }.room-admin-card > img, .room-admin-placeholder { min-height: 165px; }.room-editor-backdrop { align-items: end; padding: 0; }.room-editor { width: 100%; max-height: 92vh; border-radius: 18px 18px 0 0; }.room-editor > header, .room-editor > footer { padding: 15px 16px; }.room-editor-content { padding: 16px; }.room-form-grid { grid-template-columns: 1fr; }.room-form-grid .full { grid-column: auto; } }
</style>
