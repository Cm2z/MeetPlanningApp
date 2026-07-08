
<script setup>
import { computed, ref } from 'vue';
import {
  BarChart3,
  Bell,
  CalendarCheck,
  Database,
  DoorOpen,
  History,
  Home,
  LogOut,
  Menu,
  Repeat2,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from '@lucide/vue';

const props = defineProps({
  view: String,
  session: Object,
  authMode: String,
  isAdmin: Boolean,
  unreadCount: Number,
});

const emit = defineEmits(['navigate', 'logout']);
const menuOpen = ref(false);

const roleText = computed(() => props.isAdmin ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน');
const userName = computed(() => props.session?.user?.name || props.session?.user?.email || 'ผู้ใช้งาน');

const menuItems = computed(() => {
  const items = [
    { key: 'dashboard', label: 'หน้าหลัก', icon: Home, show: true },
    { key: 'reserve', label: 'ค้นหาและจองห้อง', icon: Search, show: true },
    { key: 'recurring', label: 'จองซ้ำ', icon: Repeat2, show: true },
    { key: 'waitlist', label: 'รายการรอคิว', icon: Users, show: true },
    { key: 'history', label: 'ประวัติการจอง', icon: History, show: !props.isAdmin },
    { key: 'notifications', label: 'แจ้งเตือน', icon: Bell, show: true, badge: props.unreadCount || 0 },
    { key: 'bookings', label: 'รายการจอง/อนุมัติ', icon: CalendarCheck, show: props.isAdmin },
    { key: 'stats', label: 'สถิติ', icon: BarChart3, show: props.isAdmin },
    { key: 'backup', label: 'สำรองข้อมูล', icon: Database, show: props.isAdmin },
    { key: 'settings', label: 'ตั้งค่าระบบ', icon: Settings, show: props.isAdmin },
    { key: 'kiosk', label: 'หน้าจอหน้าห้อง', icon: DoorOpen, show: true },
    { key: 'profile', label: 'โปรไฟล์', icon: UserRound, show: Boolean(props.session) },
  ];
  return items.filter((item) => item.show);
});

function go(target) {
  menuOpen.value = false;
  emit('navigate', target);
}

function logout() {
  menuOpen.value = false;
  emit('logout');
}
</script>

<template>
  <aside class="sidebar" :class="{ open: menuOpen }">
    <div class="mobile-nav-bar">
      <button class="mobile-logo" type="button" @click="go('dashboard')" aria-label="ไปหน้าหลัก">
        <DoorOpen />
        <span>MeetPlanning</span>
      </button>
      <button class="hamburger-button" type="button" :aria-expanded="menuOpen" aria-label="เปิดเมนู" @click="menuOpen = !menuOpen">
        <X v-if="menuOpen" />
        <Menu v-else />
      </button>
    </div>

    <button class="sidebar-brand" type="button" @click="go('dashboard')">
      <DoorOpen />
      <span>MeetPlanning</span>
    </button>

    <div v-if="session" class="sidebar-user">
      <ShieldCheck />
      <span>{{ userName }}</span>
      <small>{{ roleText }}</small>
    </div>

    <nav class="sidebar-menu" aria-label="เมนูหลัก">
      <button
        v-for="item in menuItems"
        :key="item.key"
        type="button"
        :class="{ active: view === item.key }"
        @click="go(item.key)"
      >
        <component :is="item.icon" />
        <span>{{ item.label }}</span>
        <small v-if="item.badge">{{ item.badge }}</small>
      </button>
    </nav>

    <button v-if="session" class="logout" type="button" @click="logout">
      <LogOut />
      <span>ออกจากระบบ</span>
    </button>
  </aside>

  <button v-if="menuOpen" class="mobile-menu-backdrop" type="button" aria-label="ปิดเมนู" @click="menuOpen = false"></button>
</template>
