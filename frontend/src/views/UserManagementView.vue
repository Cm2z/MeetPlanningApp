<script setup>
import { computed, onMounted, ref } from 'vue';

const props = defineProps({ state: Object });
const query = ref('');
const busyId = ref(null);

const filteredUsers = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return props.state.users.value;
  return props.state.users.value.filter((user) =>
    [user.name, user.email, user.department].some((value) => String(value || '').toLowerCase().includes(keyword))
  );
});

async function changeRole(user) {
  const nextRole = user.role === 'staff' ? 'user' : 'staff';
  const label = nextRole === 'staff' ? 'แต่งตั้งเป็น Staff' : 'ถอด Staff กลับเป็น User';
  if (!window.confirm(label + ' สำหรับ ' + user.name + ' ใช่หรือไม่')) return;
  busyId.value = user.id;
  await props.state.updateUserRole(user, nextRole);
  busyId.value = null;
}

async function clearHistory(user) {
  if (!window.confirm('ลบประวัติการจองและแจ้งเตือนของ ' + user.name + ' เท่านั้นใช่หรือไม่?\nการดำเนินการนี้ย้อนกลับไม่ได้')) return;
  busyId.value = user.id;
  await props.state.clearUserBookingHistory(user);
  busyId.value = null;
}

onMounted(() => props.state.loadUsers());
</script>

<template>
  <section class="user-management-page">
    <div class="panel user-management-hero">
      <div><p>ADMIN ONLY</p><h2>จัดการผู้ใช้งานและ Staff</h2><span>บัญชีใหม่เริ่มต้นเป็น User เสมอ และมีเพียง Admin ที่แต่งตั้งหรือถอด Staff ได้</span></div>
      <button class="ghost compact" type="button" @click="state.loadUsers">รีเฟรช</button>
    </div>
    <div class="panel user-toolbar"><input v-model="query" placeholder="ค้นหาชื่อ อีเมล หรือแผนก" /></div>
    <div class="user-card-list">
      <article v-for="user in filteredUsers" :key="user.id" class="panel user-role-card">
        <div class="user-avatar">{{ String(user.name || 'U').slice(0, 1) }}</div>
        <div class="user-info"><strong>{{ user.name }}</strong><span>{{ user.email }}</span><small>{{ user.department || 'ไม่ระบุแผนก' }}</small></div>
        <span class="role-badge" :class="user.role">{{ user.role === 'admin' ? 'Admin' : user.role === 'staff' ? 'Staff' : 'User' }}</span>
        <div class="actions">
          <button v-if="user.role !== 'admin'" class="primary compact" type="button" :disabled="busyId === user.id" @click="changeRole(user)">
            {{ user.role === 'staff' ? 'ถอด Staff' : 'แต่งตั้ง Staff' }}
          </button>
          <button v-if="user.role !== 'admin'" class="danger ghost compact" type="button" :disabled="busyId === user.id" @click="clearHistory(user)">ล้างประวัติ</button>
        </div>
      </article>
      <div v-if="!filteredUsers.length" class="panel empty">ไม่พบผู้ใช้งาน</div>
    </div>
  </section>
</template>

<style scoped>
.user-management-page,.user-card-list{display:grid;gap:14px}.user-management-hero{display:flex;justify-content:space-between;gap:18px;align-items:center}.user-management-hero p{margin:0;color:#087653;font-weight:800}.user-management-hero h2{margin:4px 0}.user-toolbar input{width:100%;min-height:46px}.user-role-card{display:grid;grid-template-columns:48px minmax(0,1fr) auto auto;gap:14px;align-items:center}.user-avatar{width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:#e8f5ff;color:#0968c8;font-size:20px;font-weight:900}.user-info{display:grid;gap:3px}.user-info span,.user-info small{color:#65758a}.role-badge{padding:7px 12px;border-radius:999px;font-weight:800;background:#edf2f7}.role-badge.admin{background:#e7efff;color:#1557b0}.role-badge.staff{background:#ddf8eb;color:#087653}.role-badge.user{color:#5f6f82}@media(max-width:760px){.user-management-hero{align-items:flex-start;flex-direction:column}.user-role-card{grid-template-columns:48px 1fr}.role-badge{justify-self:start}.user-role-card .actions{grid-column:1/-1}}
</style>
