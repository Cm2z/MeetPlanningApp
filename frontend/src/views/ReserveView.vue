<script setup>
import { ref, watch } from 'vue';
import { api } from '../api.js';

const props = defineProps({ state: Object });

const showRoomModal = ref(false);
const previewIndex = ref(0);
const availabilityStatus = ref('idle');
const availabilityMessage = ref('เลือกวันและเวลาเพื่อเช็กสถานะห้อง');
let availabilityTimer = null;
let availabilityRun = 0;

const fallbackImages = [
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1100&q=80',
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1100&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1100&q=80',
];

function imageFor(room) {
  return room?.image_url || room?.images?.[0]?.image_url || fallbackImages[0];
}

function roomGallery(room) {
  const dbImages = Array.isArray(room?.images)
    ? room.images.map((image) => image.image_url).filter(Boolean)
    : [];
  const primary = room?.image_url ? [room.image_url] : [];
  return [...new Set([...primary, ...dbImages, ...fallbackImages])].slice(0, 6);
}

function openRoom(room) {
  props.state.selectedRoom.value = room;
  previewIndex.value = 0;
  showRoomModal.value = true;
  scheduleAvailabilityCheck(0);
}

function closeRoom() {
  showRoomModal.value = false;
}

function setAvailability(status, message) {
  availabilityStatus.value = status;
  availabilityMessage.value = message;
}

async function checkRoomAvailability() {
  const room = props.state.selectedRoom.value;
  if (!room) return false;
  const attendeeCount = Number(props.state.bookingForm.attendeeCount || props.state.searchForm.capacity || 1);
  if (attendeeCount > Number(room.capacity || 0)) {
    setAvailability('busy', 'ไม่ว่าง: จำนวนผู้เข้าร่วมเกินความจุห้อง');
    return false;
  }

  const runId = ++availabilityRun;
  setAvailability('checking', 'กำลังตรวจสอบเวลาว่าง...');
  try {
    const params = new URLSearchParams({
      keyword: '',
      date: props.state.searchForm.date || '',
      start: props.state.searchForm.start || '',
      end: props.state.searchForm.end || '',
      capacity: String(attendeeCount || 1),
      branchId: props.state.searchForm.branchId || '',
      building: props.state.searchForm.building || '',
      equipment: Array.isArray(props.state.searchForm.equipment) ? props.state.searchForm.equipment.join(',') : '',
    });
    const availableRooms = await api('/rooms?' + params.toString());
    if (runId !== availabilityRun) return availabilityStatus.value === 'free';
    const isFree = Array.isArray(availableRooms) && availableRooms.some((item) => Number(item.id) === Number(room.id));
    setAvailability(
      isFree ? 'free' : 'busy',
      isFree ? 'ว่างในช่วงเวลานี้ สามารถจองได้' : 'ไม่ว่างในช่วงเวลานี้ กรุณาเลือกเวลาอื่น'
    );
    return isFree;
  } catch (error) {
    if (runId === availabilityRun) setAvailability('busy', error.message || 'ตรวจสอบห้องว่างไม่ได้');
    return false;
  }
}

function scheduleAvailabilityCheck(delay = 350) {
  window.clearTimeout(availabilityTimer);
  availabilityTimer = window.setTimeout(() => {
    if (showRoomModal.value) checkRoomAvailability();
  }, delay);
}

async function submitBooking() {
  const canBook = await checkRoomAvailability();
  if (!canBook) return;
  await props.state.createBooking();
  showRoomModal.value = false;
}

watch(() => props.state.selectedRoom.value?.id, () => {
  previewIndex.value = 0;
  if (showRoomModal.value) scheduleAvailabilityCheck(0);
});

watch(
  () => [props.state.searchForm.date, props.state.searchForm.start, props.state.searchForm.end, props.state.bookingForm.attendeeCount],
  () => {
    if (showRoomModal.value) scheduleAvailabilityCheck();
  }
);
</script>

<template>
  <section class="reserve-popup-page">
    <div class="reserve-mobile-intro">
      <div>
        <p class="eyebrow">ค้นหาและจองห้อง</p>
        <h2>เลือกเวลาที่ต้องการ แล้วกดห้องเพื่อดูรายละเอียด</h2>
      </div>
      <span class="soft-pill">{{ state.rooms.value.length }} ห้องว่าง</span>
    </div>

    <form class="panel reserve-search-wide" @submit.prevent="state.loadRooms">
      <div class="reserve-search-head">
        <div>
          <p class="eyebrow">ค้นหาและจองห้อง</p>
          <h2>เลือกเวลาที่ต้องการ แล้วกดห้องเพื่อดูรายละเอียด</h2>
        </div>
        <span class="soft-pill">{{ state.rooms.value.length }} ห้องว่าง</span>
      </div>

      <div class="reserve-search-fields reserve-search-fields-simple">
        <label>ค้นหาห้อง
          <input v-model="state.searchForm.keyword" placeholder="ชื่อห้อง อาคาร หรือรายละเอียด" />
        </label>
        <button class="primary reserve-search-button" type="submit">ค้นหา</button>
      </div>
    </form>

    <div class="reserve-room-section">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">ห้องที่พร้อมจอง</p>
          <h2>กดเลือกห้องเพื่อดูรูปและจอง</h2>
        </div>
        <p class="muted">ฟอร์มจองจะอยู่ในหน้าต่าง popup เพื่อลดความรกของหน้า</p>
      </div>

      <div class="room-picker-grid">
        <article
          v-for="room in state.rooms.value"
          :key="room.id"
          class="room-picker-card"
          :class="{ selected: state.selectedRoom.value?.id === room.id }"
          @click="openRoom(room)"
        >
          <img :src="imageFor(room)" :alt="room.name || 'รูปห้องประชุม'" />
          <div class="room-picker-body">
            <div>
              <h3>{{ room.name || 'ไม่พบชื่อห้อง' }}</h3>
              <p>{{ room.branch_name || '-' }} · {{ room.building || '-' }} · {{ room.floor || '-' }}</p>
            </div>
            <div class="room-picker-meta">
              <span>รองรับ {{ room.capacity || 0 }} คน</span>
              <span>{{ roomGallery(room).length }} รูป</span>
            </div>
            <div class="tags">
              <small v-for="eq in room.equipment || []" :key="eq.id">{{ eq.name }}</small>
            </div>
            <button class="primary ghost-open-button" type="button" @click.stop="openRoom(room)">
              ดูรายละเอียดและจอง
            </button>
          </div>
        </article>

        <div v-if="!state.rooms.value.length" class="panel empty-room-state">
          ไม่พบห้องตามเงื่อนไขที่ค้นหา ลองเปลี่ยนเวลา วันที่ หรือจำนวนคน
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showRoomModal && state.selectedRoom.value" class="room-modal-backdrop" @click.self="closeRoom">
        <section class="room-booking-modal" role="dialog" aria-modal="true">
          <button class="modal-close" type="button" @click="closeRoom">ปิด</button>

          <div class="room-modal-gallery">
            <img
              class="room-modal-main-image"
              :src="roomGallery(state.selectedRoom.value)[previewIndex]"
              :alt="state.selectedRoom.value.name || 'รูปห้องประชุม'"
            />
            <div class="room-modal-thumbs">
              <button
                v-for="(image, index) in roomGallery(state.selectedRoom.value)"
                :key="image"
                type="button"
                :class="{ active: previewIndex === index }"
                @click="previewIndex = index"
              >
                <img :src="image" alt="รูปเพิ่มเติมของห้อง" />
              </button>
            </div>
          </div>

          <div class="room-modal-info">
            <p class="eyebrow">รายละเอียดสถานที่</p>
            <h2>{{ state.selectedRoom.value.name }}</h2>
            <p class="muted">
              {{ state.selectedRoom.value.branch_name || '-' }} ·
              {{ state.selectedRoom.value.building || '-' }} ·
              {{ state.selectedRoom.value.floor || '-' }}
            </p>
            <div class="room-modal-facts room-modal-facts-editable">
              <span class="fact-static">รองรับ {{ state.selectedRoom.value.capacity || 0 }} คน</span>
              <label class="fact-control date-fact-control">
                <small>วันที่</small>
                <input v-model="state.searchForm.date" type="date" />
              </label>
              <div class="fact-control time-fact-control">
                <label>
                  <small>เริ่ม</small>
                  <input v-model="state.searchForm.start" type="time" />
                </label>
                <label>
                  <small>สิ้นสุด</small>
                  <input v-model="state.searchForm.end" type="time" />
                </label>
              </div>
              <span class="availability-pill" :class="availabilityStatus">
                {{ availabilityMessage }}
              </span>
            </div>
            <p v-if="state.selectedRoom.value.description" class="room-description">
              {{ state.selectedRoom.value.description }}
            </p>
            <div class="tags">
              <small v-for="eq in state.selectedRoom.value.equipment || []" :key="eq.id">{{ eq.name }}</small>
            </div>

            <form class="modal-booking-form" @submit.prevent="submitBooking">
              <h3>รายละเอียดการจอง</h3>
              <label>หัวข้อการจอง
                <input v-model="state.bookingForm.title" placeholder="เช่น ประชุมทีมประจำสัปดาห์" required />
              </label>
              <label>จำนวนผู้เข้าร่วม
                <input v-model.number="state.bookingForm.attendeeCount" type="number" min="1" required />
              </label>
              <label>วัตถุประสงค์
                <textarea v-model="state.bookingForm.purpose" rows="4" placeholder="ใส่รายละเอียดสั้นๆ"></textarea>
              </label>
              <button class="primary modal-submit-button" type="submit" :disabled="availabilityStatus !== 'free'">
                {{ availabilityStatus === 'free' ? 'ยืนยันการจองห้องนี้' : 'เลือกเวลาว่างก่อนจอง' }}
              </button>
            </form>
          </div>
        </section>
      </div>
    </Teleport>
  </section>
</template>
