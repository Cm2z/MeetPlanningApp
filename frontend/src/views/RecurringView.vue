
<script setup>
defineProps({ state: Object });
</script>

<template>
  <section class="admin-grid">
    <form class="panel form" @submit.prevent="state.createRecurring">
      <h2>Recurring Booking</h2>
      <label>ห้อง
        <select v-model="state.recurringForm.roomId">
          <option v-for="room in state.rooms.value" :key="room.id" :value="room.id">{{ room.name }}</option>
        </select>
      </label>
      <label>หัวข้อ<input v-model="state.recurringForm.title" /></label>
      <label>รูปแบบ<select v-model="state.recurringForm.repeatType"><option value="weekly">ทุกสัปดาห์</option><option value="monthly">ทุกเดือน</option></select></label>
      <div class="two-cols"><label>เริ่มวันที่<input v-model="state.recurringForm.startDate" type="date" /></label><label>ถึงวันที่<input v-model="state.recurringForm.endDate" type="date" /></label></div>
      <div class="two-cols"><label>เวลาเริ่ม<input v-model="state.recurringForm.startTime" type="time" /></label><label>เวลาสิ้นสุด<input v-model="state.recurringForm.endTime" type="time" /></label></div>
      <button class="primary">สร้างจองซ้ำ</button>
    </form>
    <div class="panel">
      <h2>รายการจองซ้ำ</h2>
      <div v-for="item in state.recurring.value" :key="item.id" class="simple-row"><strong>{{ item.title }}</strong><span>{{ item.room_name }} · {{ item.repeat_type }}</span></div>
      <p v-if="!state.recurring.value.length" class="muted">ยังไม่มีรายการจองซ้ำ</p>
    </div>
  </section>
</template>
