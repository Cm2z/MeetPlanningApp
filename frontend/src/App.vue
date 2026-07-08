
<script setup>
import { computed, onMounted } from 'vue';
import AppSidebar from './components/AppSidebar.vue';
import AppTopbar from './components/AppTopbar.vue';
import ToastMessage from './components/ToastMessage.vue';
import AuthView from './views/AuthView.vue';
import BackupView from './views/BackupView.vue';
import BookingsView from './views/BookingsView.vue';
import DashboardView from './views/DashboardView.vue';
import KioskView from './views/KioskView.vue';
import NotificationsView from './views/NotificationsView.vue';
import ProfileView from './views/ProfileView.vue';
import RecurringView from './views/RecurringView.vue';
import ReserveView from './views/ReserveView.vue';
import SettingsView from './views/SettingsView.vue';
import StatsView from './views/StatsView.vue';
import UserHistoryView from './views/UserHistoryView.vue';
import WaitlistView from './views/WaitlistView.vue';
import { useMeetPlanning } from './composables/useMeetPlanning.js';

const state = useMeetPlanning();

const titleMap = {
  dashboard: 'หน้าหลัก',
  reserve: 'ค้นหาและจองห้อง',
  recurring: 'จองซ้ำ',
  waitlist: 'รายการรอคิว',
  history: 'ประวัติการจองของฉัน',
  notifications: 'แจ้งเตือน',
  profile: 'โปรไฟล์ของฉัน',
  bookings: 'รายการจองและอนุมัติ',
  stats: 'สถิติการใช้งาน',
  backup: 'สำรองและกู้คืนข้อมูล',
  settings: 'ตั้งค่าระบบ',
  kiosk: 'หน้าจอหน้าห้องประชุม',
};

const pageTitle = computed(() => titleMap[state.view.value] || 'หน้าหลัก');
const isLoggedIn = computed(() => Boolean(state.session.value));

function go(target) {
  if (!isLoggedIn.value) {
    state.view.value = 'auth';
    state.authMode.value = 'login';
    return;
  }
  if (target === 'bookings' && !state.isAdmin.value) { state.view.value = 'dashboard'; return state.notify('หน้านี้สำหรับผู้ดูแลระบบเท่านั้น'); }
  state.view.value = target;
  if (target === 'reserve') state.searchRooms?.();
  if (target === 'bookings') state.loadBookings?.();
  if (target === 'history') state.loadMyBookings?.();
  if (target === 'notifications') state.loadNotifications?.(true);
  if (target === 'profile') state.loadProfile?.();
  if (target === 'waitlist') state.loadWaitlist?.();
  if (target === 'stats') state.loadStats?.();
  if (target === 'settings') state.loadSettings?.();
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
  <div v-if="!isLoggedIn" class="auth-shell">
    <AuthView :state="state" />
    <ToastMessage :message="state.toast.value" />
  </div>

  <div v-else class="app-shell">
    <AppSidebar
      :view="state.view.value"
      :session="state.session.value"
      :is-admin="state.isAdmin.value"
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
      <RecurringView v-else-if="state.view.value === 'recurring'" :state="state" />
      <WaitlistView v-else-if="state.view.value === 'waitlist'" :state="state" />
      <UserHistoryView v-else-if="state.view.value === 'history'" :state="state" />
      <NotificationsView v-else-if="state.view.value === 'notifications'" :state="state" />
      <ProfileView v-else-if="state.view.value === 'profile'" :state="state" />
      <!-- FINAL_BOOKINGS_VIEW_GUARD -->
      <BookingsView v-else-if="state.view.value === 'bookings' && state.isAdmin.value" :state="state" />
      <DashboardView v-else-if="state.view.value === 'bookings' && !state.isAdmin.value" :state="state" />
      <StatsView v-else-if="state.view.value === 'stats'" :state="state" />
      <BackupView v-else-if="state.view.value === 'backup'" :state="state" />
      <SettingsView v-else-if="state.view.value === 'settings'" :state="state" />
      <KioskView v-else-if="state.view.value === 'kiosk'" :state="state" />
      <DashboardView v-else :state="state" />
    </main>

    <ToastMessage :message="state.toast.value" />
  </div>
</template>
