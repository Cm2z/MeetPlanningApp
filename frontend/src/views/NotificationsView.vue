
<script setup>
import { computed, reactive, ref } from 'vue';

const props = defineProps({ state: Object });
const selected = ref(null);
const openedGroups = reactive({});
const confirmBox = reactive({
  show: false,
  title: '',
  message: '',
  requiresCode: false,
  code: '',
  resolver: null,
});

const items = computed(() => props.state?.notificationItems?.value || []);
const isAdmin = computed(() => Boolean(props.state?.isAdmin?.value));
const hasMore = computed(() => Boolean(props.state?.notificationHasMore?.value));
const filter = computed(() => props.state?.notificationFilter?.value || 'all');
const query = computed({
  get: () => props.state?.notificationSearch?.value || '',
  set: (value) => {
    if (props.state?.notificationSearch) props.state.notificationSearch.value = value;
  },
});

function initials(name) {
  return String(name || 'ผู้ใช้').trim().slice(0, 1).toUpperCase();
}

function userName(item) {
  const text = String(item.message || '').trim();
  const match = text.match(/^(.+?)\s*[:：|-]\s*(.+)$/);
  if (match && match[1].length <= 80) return match[1].trim();
  return item.requester_name || item.user_name || 'ผู้ใช้ทั่วไป';
}

function cleanMessage(message = '') {
  const text = String(message || '').trim();
  const match = text.match(/^(.+?)\s*[:：|-]\s*(.+)$/);
  return match ? match[2].trim() : text;
}

function isRead(item) {
  return Boolean(item?.is_read || item?.read_at);
}

const adminGroups = computed(() => {
  const groups = new Map();
  for (const item of items.value) {
    const name = userName(item);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  return Array.from(groups.entries()).map(([name, groupItems]) => ({
    name,
    items: groupItems,
    unread: groupItems.filter((item) => !isRead(item)).length,
    latest: groupItems[0],
  }));
});

function askConfirm(options) {
  confirmBox.title = options.title;
  confirmBox.message = options.message;
  confirmBox.requiresCode = Boolean(options.requiresCode);
  confirmBox.code = '';
  confirmBox.show = true;
  return new Promise((resolve) => {
    confirmBox.resolver = resolve;
  });
}

function confirmNo() {
  confirmBox.show = false;
  confirmBox.resolver?.(null);
  confirmBox.resolver = null;
}

function confirmYes() {
  const payload = confirmBox.requiresCode ? { deleteCode: confirmBox.code.trim() } : {};
  confirmBox.show = false;
  confirmBox.resolver?.(payload);
  confirmBox.resolver = null;
}

async function refresh() {
  await props.state?.loadNotifications?.(true);
}

async function markAll() {
  await props.state?.markAllNotificationsRead?.();
}

async function setFilter(value) {
  await props.state?.setNotificationFilter?.(value);
}

async function loadMore() {
  await props.state?.loadMoreNotifications?.();
}

async function openItem(item) {
  selected.value = item;
  await props.state?.markNotificationRead?.(item);
}

async function goToWork(item) {
  await props.state?.openNotification?.(item);
}

async function deleteItem(item) {
  const confirmation = await askConfirm({
    title: 'ลบแจ้งเตือนจริง',
    message: 'รายการนี้จะถูกลบออกจากฐานข้อมูลจริง กรุณากรอกรหัส 1234 เพื่อยืนยัน',
    requiresCode: true,
  });
  if (!confirmation) return;
  await props.state?.deleteNotification?.(item, confirmation);
  if (selected.value?.id === item.id) selected.value = null;
}

async function deleteGroup(group) {
  const confirmation = await askConfirm({
    title: 'ลบแจ้งเตือนทั้งกลุ่ม',
    message: 'จะลบ ' + group.items.length + ' รายการของ ' + group.name + ' ออกจากฐานข้อมูลจริง กรุณากรอกรหัส 1234',
    requiresCode: true,
  });
  if (!confirmation) return;
  await props.state?.deleteNotificationGroup?.(group, confirmation);
  selected.value = null;
}
</script>

<template>
  <div class="notify-page">
    <section class="panel notify-hero">
      <div>
        <p class="eyebrow">ศูนย์แจ้งเตือน</p>
        <h2>{{ isAdmin ? 'จัดการแจ้งเตือน' : 'แจ้งเตือนของฉัน' }}</h2>
        <p>{{ isAdmin ? 'เลือกกลุ่มทางซ้ายเพื่อดูรายละเอียด อ่านแล้ว หรือลบรายการจริง' : 'ดูรายละเอียดและทำเครื่องหมายว่าอ่านแล้วได้' }}</p>
      </div>
      <div class="notify-actions">
        <button class="ghost compact" type="button" @click="refresh">รีเฟรช</button>
        <button class="primary compact" type="button" @click="markAll">อ่านทั้งหมด</button>
      </div>
    </section>

    <section class="panel notify-toolbar">
      <input v-model="query" class="notify-search" placeholder="ค้นหาแจ้งเตือน" @keyup.enter="refresh" />
      <button :class="{ active: filter === 'all' }" type="button" @click="setFilter('all')">ทั้งหมด</button>
      <button :class="{ active: filter === 'unread' }" type="button" @click="setFilter('unread')">ยังไม่อ่าน</button>
    </section>

    <div class="notify-layout">
      <section class="notify-list">
        <template v-if="isAdmin">
          <article v-for="group in adminGroups" :key="group.name" class="notify-card group-card" :class="{ selected: selected && userName(selected) === group.name }">
            <button class="group-main" type="button" @click="openedGroups[group.name] = !openedGroups[group.name]; selected = group.latest">
              <span class="avatar">{{ initials(group.name) }}</span>
              <span>
                <strong>{{ group.name }}</strong>
                <small>{{ cleanMessage(group.latest?.message || group.latest?.title) }}</small>
              </span>
              <span class="pill">{{ group.items.length }} รายการ</span>
              <span v-if="group.unread" class="pill unread">{{ group.unread }} ยังไม่อ่าน</span>
            </button>
            <div v-if="openedGroups[group.name]" class="group-items">
              <article v-for="item in group.items" :key="item.id" class="notify-subitem" :class="{ unread: !isRead(item) }">
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ cleanMessage(item.message) }}</p>
                  <small>{{ props.state?.formatDateTime?.(item.created_at) }}</small>
                </div>
                <div class="row-actions">
                  <button type="button" @click="openItem(item)">ดูรายละเอียด</button>
                  <button type="button" @click="goToWork(item)">ไปหน้ารายการ</button>
                  <button class="danger" type="button" @click="deleteItem(item)">ลบ</button>
                </div>
              </article>
            </div>
            <button class="danger soft" type="button" @click="deleteGroup(group)">ลบกลุ่มนี้</button>
          </article>
        </template>

        <template v-else>
          <article v-for="item in items" :key="item.id" class="notify-card" :class="{ unread: !isRead(item), selected: selected?.id === item.id }">
            <button class="item-main" type="button" @click="openItem(item)">
              <strong>{{ item.title }}</strong>
              <span>{{ cleanMessage(item.message) }}</span>
              <small>{{ props.state?.formatDateTime?.(item.created_at) }}</small>
            </button>
            <div class="row-actions">
              <button type="button" @click="openItem(item)">ดูรายละเอียด</button>
            </div>
          </article>
        </template>

        <div v-if="!items.length" class="empty-box">ยังไม่มีแจ้งเตือน</div>
        <button v-if="hasMore" class="ghost load-more" type="button" @click="loadMore">โหลดเพิ่ม</button>
      </section>

      <aside class="panel notify-detail">
        <template v-if="selected">
          <p class="eyebrow">รายละเอียด</p>
          <h3>{{ selected.title }}</h3>
          <p>{{ cleanMessage(selected.message) }}</p>
          <small>{{ props.state?.formatDateTime?.(selected.created_at) }}</small>
          <div class="detail-actions">
            <button class="primary compact" type="button" @click="goToWork(selected)">ไปหน้ารายการ</button>
            <button v-if="isAdmin" class="danger compact" type="button" @click="deleteItem(selected)">ลบ</button>
          </div>
        </template>
        <template v-else>
          <p class="eyebrow">คำแนะนำ</p>
          <h3>เลือกแจ้งเตือนด้านซ้าย</h3>
          <p>กดดูรายละเอียดก่อน ระบบจะทำเครื่องหมายว่าอ่านแล้วให้ทันที</p>
        </template>
      </aside>
    </div>

    <div v-if="confirmBox.show" class="modal-backdrop">
      <div class="confirm-modal">
        <h3>{{ confirmBox.title }}</h3>
        <p>{{ confirmBox.message }}</p>
        <label v-if="confirmBox.requiresCode">รหัสยืนยัน
          <input v-model="confirmBox.code" placeholder="กรอก 1234" />
        </label>
        <div class="confirm-actions">
          <button class="ghost compact" type="button" @click="confirmNo">ยกเลิก</button>
          <button class="danger compact" type="button" @click="confirmYes">ยืนยันลบ</button>
        </div>
      </div>
    </div>
  </div>
</template>
