
<script setup>
defineProps({ state: Object });
</script>

<template>
  <section class="admin-grid">
    <form class="panel form" @submit.prevent="state.joinWaitlist">
      <h2>เข้าคิว Waitlist</h2>
      <label>ห้อง
        <select v-model="state.waitlistForm.roomId">
          <option v-for="room in state.rooms.value" :key="room.id" :value="room.id">{{ room.name }}</option>
        </select>
      </label>
      <label>หัวข้อ<input v-model="state.waitlistForm.title" /></label>
      <label>เริ่ม<input v-model="state.waitlistForm.startAt" type="datetime-local" /></label>
      <label>สิ้นสุด<input v-model="state.waitlistForm.endAt" type="datetime-local" /></label>
      <button class="primary">เข้าคิว</button>
    </form>
    <div class="panel">
      <h2>Waitlist</h2>
      <div v-for="item in state.waitlist.value" :key="item.id" class="simple-row"><strong>{{ item.title }}</strong><span>{{ item.room_name }} · {{ item.status }}</span></div>
      <p v-if="!state.waitlist.value.length" class="muted">ยังไม่มีรายการ waitlist</p>
    </div>
  </section>
</template>
