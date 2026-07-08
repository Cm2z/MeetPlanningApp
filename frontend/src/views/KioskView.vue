
<script setup>
defineProps({ state: Object });
</script>

<template>
  <main class="kiosk">
    <section class="kiosk-board">
      <h1>{{ state.kioskData.value?.room?.name || 'Kiosk Mode' }}</h1>
      <label>เลือกห้อง
        <select v-model="state.kioskRoomId.value">
          <option value="">เลือกห้อง</option>
          <option v-for="room in state.rooms.value" :key="room.id" :value="room.id">{{ room.name }}</option>
        </select>
      </label>
      <button class="primary" @click="state.loadKiosk">เปิดหน้าห้อง</button>
      <div v-if="state.kioskData.value" class="kiosk-status">{{ state.kioskData.value.current ? 'กำลังใช้งาน: ' + state.kioskData.value.current.title : 'ว่างอยู่ตอนนี้' }}</div>
      <p v-if="state.kioskData.value?.next">ถัดไป: {{ state.kioskData.value.next.title }} เวลา {{ state.formatDateTime(state.kioskData.value.next.start_at) }}</p>
      <button class="ghost" @click="state.view.value = 'dashboard'">กลับระบบหลัก</button>
    </section>
  </main>
</template>
