
<script setup>
defineProps({ state: Object });

function imageFor(room) {
  return room.image_url || room.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80';
}
</script>

<template>
  <section class="reserve-grid">
    <form class="panel search-panel" @submit.prevent="state.loadRooms">
      <h2>ค้นหาห้อง</h2>
      <label>คำค้น<input v-model="state.searchForm.q" /></label>
      <label>วันที่<input v-model="state.searchForm.date" type="date" /></label>
      <div class="two-cols">
        <label>เริ่ม<input v-model="state.searchForm.start" type="time" /></label>
        <label>สิ้นสุด<input v-model="state.searchForm.end" type="time" /></label>
      </div>
      <label>จำนวนคน<input v-model.number="state.searchForm.capacity" type="number" /></label>
      <button class="primary">ค้นหา</button>
    </form>

    <div class="rooms-list">
      <article
        v-for="room in state.rooms.value"
        :key="room.id"
        class="room-card"
        :class="{ selected: state.selectedRoom.value?.id === room.id }"
        @click="state.selectedRoom.value = room"
      >
        <img :src="imageFor(room)" :alt="room.name || 'room image'" />
        <div>
          <h3>{{ room.name || 'ไม่พบชื่อห้อง' }}</h3>
          <p>{{ room.branch_name || '-' }} · {{ room.building || '-' }} · {{ room.floor || '-' }}</p>
          <span>{{ room.capacity || 0 }} คน</span>
          <div class="tags">
            <small v-for="eq in room.equipment || []" :key="eq.id">{{ eq.name }}</small>
          </div>
        </div>
      </article>
      <div v-if="!state.rooms.value.length" class="panel muted">ไม่พบห้องตามเงื่อนไขที่ค้นหา</div>
    </div>

    <form class="panel booking-form" @submit.prevent="state.createBooking">
      <h2>จองห้อง</h2>
      <p class="muted">{{ state.selectedRoom.value?.name || 'เลือกห้องก่อน' }}</p>
      <label>หัวข้อ<input v-model="state.bookingForm.title" /></label>
      <label>จำนวนคน<input v-model.number="state.bookingForm.attendeeCount" type="number" /></label>
      <label>วัตถุประสงค์<textarea v-model="state.bookingForm.purpose"></textarea></label>
      <button class="primary">ส่งคำขอจอง</button>
    </form>
  </section>
</template>
