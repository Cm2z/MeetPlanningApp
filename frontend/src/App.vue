
<script setup>
import { computed, onMounted } from 'vue';
import AppSidebar from './components/AppSidebar.vue';
import AppTopbar from './components/AppTopbar.vue';
import ToastMessage from './components/ToastMessage.vue';
import AppDialog from './components/AppDialog.vue';
import AuthView from './views/AuthView.vue';
import BackupView from './views/BackupView.vue';
import BookingsView from './views/BookingsView.vue';
import DashboardView from './views/DashboardView.vue';
import NotificationsView from './views/NotificationsView.vue';
import ProfileView from './views/ProfileView.vue';
import RoomManagementView from './views/RoomManagementView.vue';
import ReserveView from './views/ReserveView.vue';
import SettingsView from './views/SettingsView.vue';
import StatsView from './views/StatsView.vue';
import UserHistoryView from './views/UserHistoryView.vue';
import UserManagementView from './views/UserManagementView.vue';
import { useMeetPlanning } from './composables/useMeetPlanning.js';

const state = useMeetPlanning();

const titleMap = {
  rooms: 'จัดการห้องประชุม',
  dashboard: 'หน้าหลัก',
  reserve: 'ค้นหาและจองห้อง',
  history: 'ประวัติการจองของฉัน',
  notifications: 'แจ้งเตือน',
  profile: 'โปรไฟล์ของฉัน',
  bookings: 'รายการจองและอนุมัติ',
  stats: 'สถิติการใช้งาน',
  backup: 'สำรองและกู้คืนข้อมูล',
  settings: 'ตั้งค่าระบบ',
  users: 'จัดการผู้ใช้งาน',
};

const pageTitle = computed(() => titleMap[state.view.value] || 'หน้าหลัก');
const isLoggedIn = computed(() => Boolean(state.session.value));

function go(target) {
  if (!isLoggedIn.value) {
    state.view.value = 'auth';
    state.authMode.value = 'login';
    return;
  }
  if (['recurring', 'waitlist', 'kiosk'].includes(target)) {
    state.view.value = 'dashboard';
    state.notify('เมนูนี้ถูกนำออกจากระบบแล้ว');
    return;
  }
  if (['bookings', 'rooms', 'stats'].includes(target) && !state.canManageBookings.value) { state.view.value = 'dashboard'; return state.notify('หน้านี้สำหรับผู้ดูแลระบบหรือ Staff เท่านั้น'); }
  if (['backup', 'settings', 'users'].includes(target) && !state.isAdmin.value) { state.view.value = 'dashboard'; return state.notify('หน้านี้สำหรับ Admin เท่านั้น'); }
  state.view.value = target;
  if (target === 'reserve') state.searchRooms?.();
  if (target === 'bookings') state.loadBookings?.();
  if (target === 'history') state.loadMyBookings?.();
  if (target === 'notifications') state.loadNotifications?.(true);
  if (target === 'profile') state.loadProfile?.();
  if (target === 'stats') state.loadStats?.();
  if (target === 'settings') state.loadSettings?.();
  if (target === 'users') state.loadUsers?.();
}

onMounted(async () => {
  await state.boot?.();
  if (!state.session.value) {
    state.view.value = 'auth';
    state.authMode.value = 'login';
  }
});
</script>

<template>
  <AppDialog />
  <div v-if="!isLoggedIn" class="auth-shell">
    <AuthView :state="state" />
    <ToastMessage :message="state.toast.value" />
  </div>

  <div v-else class="app-shell">
    <AppSidebar
      :view="state.view.value"
      :session="state.session.value"
      :is-admin="state.isAdmin.value"
      :can-manage="state.canManageBookings.value"
      :unread-count="state.unreadCount.value"
      @navigate="go"
      @logout="state.logout"
    />

    <main class="main-content">
      <AppTopbar
        :title="pageTitle"
        :session="state.session.value"
        :is-admin="state.isAdmin.value"
      />

      <DashboardView v-if="state.view.value === 'dashboard'" :state="state" />
      <ReserveView v-else-if="state.view.value === 'reserve'" :state="state" />
      <UserHistoryView v-else-if="state.view.value === 'history'" :state="state" />
      <NotificationsView v-else-if="state.view.value === 'notifications'" :state="state" />
      <ProfileView v-else-if="state.view.value === 'profile'" :state="state" />
      <!-- FINAL_BOOKINGS_VIEW_GUARD -->
      <BookingsView v-else-if="state.view.value === 'bookings' && state.canManageBookings.value" :state="state" />
      <DashboardView v-else-if="state.view.value === 'bookings' && !state.canManageBookings.value" :state="state" />
      <RoomManagementView v-else-if="state.view.value === 'rooms' && state.canManageBookings.value" :state="state" />
      <StatsView v-else-if="state.view.value === 'stats'" :state="state" />
      <BackupView v-else-if="state.view.value === 'backup'" :state="state" />
      <SettingsView v-else-if="state.view.value === 'settings'" :state="state" />
      <UserManagementView v-else-if="state.view.value === 'users' && state.isAdmin.value" :state="state" />
      <DashboardView v-else :state="state" />
    </main>

    <ToastMessage :message="state.toast.value" />
  </div>
</template>
