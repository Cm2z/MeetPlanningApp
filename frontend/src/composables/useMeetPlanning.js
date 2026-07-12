
import { computed, reactive, ref } from 'vue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const STORAGE_KEY = 'meetplanning_session';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function useMeetPlanning() {
  const session = ref(readStoredSession());
  const view = ref(session.value ? 'dashboard' : 'auth');
  const authMode = ref('login');
  const loading = ref(false);
  const toast = ref('');

  const rooms = ref([]);
  const bookings = ref([]);
  const myBookings = ref([]);
  const recurring = ref([]);
  const waitlist = ref([]);
  const notifications = ref([]);
  const stats = ref({});
  const dashboard = ref({ roomsReady: 0, todayBookings: 0, unread: 0, upcoming: [] });
  const meta = ref({ branches: [], equipment: [], settings: {} });
  const selectedRoom = ref(null);
  const restoreSql = ref('');
  const kioskRoomId = ref('');
  const kioskData = ref(null);

  const notificationPage = ref(1);
  const notificationHasMore = ref(false);
  const notificationSearch = ref('');
  const notificationFilter = ref('all');

  const loginForm = reactive({ email: '', password: '' });
  const registerForm = reactive({ name: '', email: '', password: '', department: '' });
  const searchForm = reactive({ keyword: '', date: today(), start: '09:00', end: '10:00', capacity: 4, branchId: '', building: '', equipment: [] });
  const bookingForm = reactive({ title: '', purpose: '', attendeeCount: 4, requesterPhone: '', note: '' });
  const recurringForm = reactive({ roomId: '', title: '', startDate: today(), endDate: today(), startTime: '09:00', endTime: '10:00', daysOfWeek: [] });
  const waitlistForm = reactive({ roomId: '', title: '', date: today(), startTime: '09:00', endTime: '10:00' });
  const settings = reactive({ org_name: 'MeetPlanning', primary_color: '#12805c', admin_email: '', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', smtp_from: '' });
  const profile = reactive({ id: null, name: '', email: '', department: '', phone: '', role: '' });
  const passwordForm = reactive({ currentPassword: '', newPassword: '' });

  const isAdmin = computed(() => session.value?.user?.role === 'admin');
  const unreadCount = computed(() => notifications.value.filter((item) => !(item.is_read || item.read_at)).length);
  const notificationItems = computed(() => Array.isArray(notifications.value) ? notifications.value : []);

  const statusText = {
    pending: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธ',
    cancelled: 'ยกเลิก',
    checked_in: 'Check-in แล้ว',
    completed: 'เสร็จสิ้น',
    no_show: 'ไม่มาใช้งาน',
  };

  function notify(message) {
    toast.value = message || '';
    window.setTimeout(() => {
      if (toast.value === message) toast.value = '';
    }, 2800);
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (session.value?.token) headers.Authorization = 'Bearer ' + session.value.token;
    const response = await fetch(API_URL + path, { ...options, headers });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      if (response.status === 401 && session.value?.user?.role !== 'admin') {
        clearSession();
        view.value = 'auth';
        authMode.value = 'login';
      }
      throw new Error(data.message || 'เกิดข้อผิดพลาด');
    }
    return data;
  }

  function saveSession(data) {
    const sessionData = {
      ...data,
      savedAt: Date.now(),
      expiresAt: null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    session.value = sessionData;
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    session.value = null;
  }

  function formatDateTime(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  function toDateTime(date, time) {
    return date + 'T' + time + ':00';
  }

  function requireLogin() {
    if (session.value) return true;
    authMode.value = 'login';
    view.value = 'auth';
    notify('กรุณาเข้าสู่ระบบก่อน');
    return false;
  }

  function requireAdmin() {
    if (isAdmin.value) return true;
    notify('เฉพาะผู้ดูแลระบบเท่านั้น');
    return false;
  }

  async function loadMeta() {
    try {
      meta.value = await api('/meta');
      if (meta.value?.settings?.primary_color) document.documentElement.style.setProperty('--primary', meta.value.settings.primary_color);
    } catch (error) {
      notify(error.message);
    }
  }

  async function loadDashboard() {
    const emptyDashboard = { roomsReady: 0, todayBookings: 0, unread: 0, upcoming: [] };
    if (!session.value?.token) {
      dashboard.value = emptyDashboard;
      return;
    }
    try {
      dashboard.value = { ...emptyDashboard, ...(await api('/dashboard')) };
    } catch {
      dashboard.value = emptyDashboard;
    }
  }

  async function searchRooms() {
    try {
      const params = new URLSearchParams({
        keyword: searchForm.keyword || '',
        date: searchForm.date,
        start: searchForm.start,
        end: searchForm.end,
        capacity: String(searchForm.capacity || 1),
        branchId: searchForm.branchId || '',
        building: searchForm.building || '',
        equipment: Array.isArray(searchForm.equipment) ? searchForm.equipment.join(',') : '',
      });
      rooms.value = await api('/rooms?' + params.toString());
      if (!selectedRoom.value || !rooms.value.some((room) => room.id === selectedRoom.value?.id)) selectedRoom.value = rooms.value[0] || null;
    } catch (error) {
      notify(error.message);
    }
  }

  async function loadBookings() {
    if (!session.value) return;
    bookings.value = await api('/bookings');
  }

  async function loadMyBookings() {
    if (!session.value) return;
    myBookings.value = await api('/bookings?mine=true');
  }

  async function loadRecurring() {
    if (!session.value) return;
    try { recurring.value = await api('/recurring'); } catch { recurring.value = []; }
  }

  async function loadWaitlist() {
    if (!session.value) return;
    try { waitlist.value = await api('/waitlist'); } catch { waitlist.value = []; }
  }

  function normalizeNotifications(result) {
    if (Array.isArray(result)) return { rows: result, hasMore: false, unreadCount: result.filter((item) => !(item.is_read || item.read_at)).length };
    return {
      rows: Array.isArray(result?.data) ? result.data : [],
      hasMore: Boolean(result?.hasMore),
      unreadCount: Number(result?.unreadCount || 0),
    };
  }

  async function loadNotifications(reset = true) {
    if (!session.value) return;
    if (reset) notificationPage.value = 1;
    const params = new URLSearchParams({ page: String(notificationPage.value), limit: '30' });
    if (notificationFilter.value === 'unread') params.set('unread', 'true');
    if (notificationSearch.value.trim()) params.set('q', notificationSearch.value.trim());
    const result = await api('/notifications?' + params.toString());
    const normalized = normalizeNotifications(result);
    notifications.value = reset ? normalized.rows : [...notifications.value, ...normalized.rows];
    notificationHasMore.value = normalized.hasMore;
  }

  async function loadMoreNotifications() {
    if (!notificationHasMore.value) return;
    notificationPage.value += 1;
    await loadNotifications(false);
  }

  async function setNotificationFilter(filter) {
    notificationFilter.value = filter;
    await loadNotifications(true);
  }

  function isNotificationRead(item) {
    return Boolean(item?.is_read || item?.read_at);
  }

  function cleanNotificationMessage(message = '') {
    const text = String(message || '').trim();
    const match = text.match(/^(.+?)\s*[:：|-]\s*(.+)$/);
    return match ? match[2].trim() : text;
  }

  async function markNotificationRead(item) {
    if (!item?.id || item.is_read || item.read_at) return;
    await api('/notifications/' + item.id + '/read', { method: 'PATCH' });
    item.is_read = 1;
    item.read_at = new Date().toISOString();
  }

  async function markAllNotificationsRead() {
    await api('/notifications/read-all', { method: 'POST' });
    notifications.value = notifications.value.map((item) => ({ ...item, is_read: 1, read_at: item.read_at || new Date().toISOString() }));
    await loadNotifications(true);
    notify('อ่านแจ้งเตือนทั้งหมดแล้ว');
  }

  function ownerDeleteConfirmation(label) {
    if (!isAdmin.value) {
      notify('เฉพาะผู้ดูแลระบบเท่านั้นที่ลบแจ้งเตือนได้');
      return null;
    }
    if (!window.confirm('ต้องการลบ "' + label + '" ใช่หรือไม่')) return null;
    const deleteCode = window.prompt('กรอกรหัสยืนยัน 1234');
    if (deleteCode !== '1234') {
      notify('รหัสยืนยันไม่ถูกต้อง');
      return null;
    }
    return { deleteCode };
  }

  async function deleteNotification(item, confirmation = {}) {
    if (!item?.id) return;
    if (!isAdmin.value) {
      notify('เฉพาะผู้ดูแลระบบเท่านั้นที่ลบแจ้งเตือนได้');
      return;
    }
    try {
      const options = { method: 'DELETE', body: JSON.stringify({ deleteCode: confirmation.deleteCode || '1234' }) };
      await api('/notifications/' + item.id, options);
      notifications.value = notifications.value.filter((entry) => entry.id !== item.id);
      notify('ลบแจ้งเตือนแล้ว');
      await loadNotifications(true);
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteNotificationGroup(group, confirmation = {}) {
    const ids = Array.isArray(group?.items) ? group.items.map((item) => item.id).filter(Boolean) : [];
    if (!ids.length) return;
    try {
      await api('/notifications/bulk-delete', { method: 'POST', body: JSON.stringify({ ids, deleteCode: confirmation.deleteCode || '' }) });
      notifications.value = notifications.value.filter((entry) => !ids.includes(entry.id));
      notify('ลบแจ้งเตือนกลุ่มนี้แล้ว');
      await loadNotifications(true);
    } catch (error) {
      notify(error.message);
    }
  }

  async function openNotification(item) {
    if (!item) return;
    if (!isNotificationRead(item)) await markNotificationRead(item);
    const link = String(item.link || '').toLowerCase();
    const title = String(item.title || '');
    if (link.includes('bookings') || title.includes('จอง')) {
      if (isAdmin.value) {
        view.value = 'bookings';
        await loadBookings();
      } else {
        view.value = 'history';
        await loadMyBookings();
      }
      return;
    }
    if (link.includes('history')) {
      view.value = 'history';
      await loadMyBookings();
      return;
    }
    if (link.includes('waitlist')) {
      view.value = 'waitlist';
      await loadWaitlist();
    }
  }

  async function login() {
    loading.value = true;
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(loginForm) });
      saveSession(data);
      await loadProfile();
      view.value = 'dashboard';
      await boot();
    } catch (error) {
      notify(error.message);
    } finally {
      loading.value = false;
    }
  }

  async function register() {
    loading.value = true;
    try {
      const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(registerForm) });
      saveSession(data);
      await loadProfile();
      view.value = 'dashboard';
      await boot();
    } catch (error) {
      notify(error.message);
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    clearSession();
    view.value = 'auth';
    authMode.value = 'login';
    notifications.value = [];
    bookings.value = [];
    myBookings.value = [];
  }

  async function createBooking() {
    if (!requireLogin()) return;
    if (!selectedRoom.value) return notify('กรุณาเลือกห้องก่อน');
    const bookingTitle = String(bookingForm.title || '').trim() || 'รายการนี้';
    try {
      const result = await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: selectedRoom.value.id,
          title: bookingForm.title,
          purpose: bookingForm.purpose,
          attendeeCount: bookingForm.attendeeCount,
          startAt: toDateTime(searchForm.date, searchForm.start),
          endAt: toDateTime(searchForm.date, searchForm.end),
          requesterPhone: bookingForm.requesterPhone,
          note: bookingForm.note,
          equipment: Array.isArray(searchForm.equipment) ? searchForm.equipment.map((id) => ({ id, quantity: 1 })) : [],
        }),
      });
      const created = result.booking || null;
      notify(result.message || ('การจอง "' + bookingTitle + '" ได้รับอนุมัติแล้ว'));
      bookingForm.title = '';
      bookingForm.purpose = '';
      bookingForm.note = '';
      await Promise.all([searchRooms(), loadMyBookings(), loadNotifications(true), loadDashboard()]);
      if (created && !myBookings.value.some((booking) => booking.id === created.id)) {
        myBookings.value = [created, ...myBookings.value];
      }
      view.value = 'history';
    } catch (error) {
      notify(error.message);
    }
  }

  async function setStatus(booking, status) {
    if (!requireAdmin()) return;
    try {
      await api('/bookings/' + booking.id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
      notify('อัปเดตสถานะแล้ว');
      await Promise.all([loadBookings(), loadNotifications(true)]);
    } catch (error) {
      notify(error.message);
    }
  }

  async function checkInBooking(booking) {
    try {
      await api('/bookings/' + booking.id + '/check-in', { method: 'PATCH' });
      notify('Check-in สำเร็จ');
      await loadMyBookings();
    } catch (error) {
      notify(error.message);
    }
  }

  async function createRecurring() {
    if (!requireLogin()) return;
    try {
      await api('/recurring', { method: 'POST', body: JSON.stringify(recurringForm) });
      notify('สร้างรายการจองซ้ำแล้ว');
      await loadRecurring();
    } catch (error) {
      notify(error.message);
    }
  }

  async function joinWaitlist() {
    if (!requireLogin()) return;
    try {
      await api('/waitlist', { method: 'POST', body: JSON.stringify(waitlistForm) });
      notify('เพิ่มเข้ารายการรอคิวแล้ว');
      await loadWaitlist();
    } catch (error) {
      notify(error.message);
    }
  }

  async function loadStats() {
    if (!requireAdmin()) return;
    try { stats.value = await api('/reports/summary'); } catch { stats.value = {}; }
  }

  async function loadSettings() {
    if (!isAdmin.value) return;
    try { Object.assign(settings, await api('/settings')); } catch (error) { notify(error.message); }
  }

  async function saveSettings() {
    if (!requireAdmin()) return;
    try {
      await api('/settings', { method: 'PATCH', body: JSON.stringify(settings) });
      document.documentElement.style.setProperty('--primary', settings.primary_color || '#12805c');
      notify('บันทึกการตั้งค่าแล้ว');
    } catch (error) {
      notify(error.message);
    }
  }

  async function testEmail() {
    try {
      await api('/settings/test-email', { method: 'POST', body: JSON.stringify({ to: settings.admin_email }) });
      notify('ส่งคำขอทดสอบอีเมลแล้ว');
    } catch (error) {
      notify(error.message);
    }
  }

  async function restoreBackup() {
    if (!requireAdmin()) return;
    if (!restoreSql.value.trim()) return notify('กรุณาวางข้อมูลสำรอง SQL ก่อน');
    try {
      await api('/backup/restore', { method: 'POST', body: JSON.stringify({ sql: restoreSql.value }) });
      notify('กู้คืนข้อมูลเรียบร้อย');
    } catch (error) {
      notify(error.message);
    }
  }

  async function loadKiosk() {
    try {
      kioskData.value = await api('/kiosk/' + kioskRoomId.value);
    } catch (error) {
      notify(error.message);
    }
  }

  async function loadProfile() {
    if (!session.value) return;
    try {
      const data = await api('/profile');
      Object.assign(profile, data);
      if (session.value?.user) Object.assign(session.value.user, data);
    } catch (error) {
      notify(error.message);
    }
  }

  async function saveProfile() {
    try {
      const data = await api('/profile', { method: 'PATCH', body: JSON.stringify(profile) });
      Object.assign(profile, data);
      if (session.value?.user) Object.assign(session.value.user, data);
      notify('บันทึกโปรไฟล์แล้ว');
    } catch (error) {
      notify(error.message);
    }
  }

  async function changePassword() {
    try {
      await api('/profile/password', { method: 'PATCH', body: JSON.stringify(passwordForm) });
      passwordForm.currentPassword = '';
      passwordForm.newPassword = '';
      notify('เปลี่ยนรหัสผ่านแล้ว');
    } catch (error) {
      notify(error.message);
    }
  }

  async function boot() {
    await loadMeta();
    await searchRooms();
    if (session.value?.token) {
      await loadDashboard();
      await Promise.all([
        loadProfile(),
        loadNotifications(true),
        isAdmin.value ? loadBookings() : loadMyBookings(),
      ]);
    } else {
      dashboard.value = { roomsReady: 0, todayBookings: 0, unread: 0, upcoming: [] };
    }
  }

  return {
    API_URL,
    session,
    view,
    authMode,
    loading,
    toast,
    rooms,
    bookings,
    myBookings,
    recurring,
    waitlist,
    notifications,
    notificationItems,
    notificationHasMore,
    notificationSearch,
    notificationFilter,
    stats,
    dashboard,
    settings,
    meta,
    selectedRoom,
    restoreSql,
    kioskRoomId,
    kioskData,
    loginForm,
    registerForm,
    searchForm,
    bookingForm,
    recurringForm,
    waitlistForm,
    profile,
    passwordForm,
    isAdmin,
    unreadCount,
    statusText,
    notify,
    api,
    formatDateTime,
    requireLogin,
    requireAdmin,
    boot,
    login,
    register,
    logout,
    loadMeta,
    loadDashboard,
    searchRooms,
    loadRooms: searchRooms,
    loadBookings,
    loadMyBookings,
    loadRecurring,
    loadWaitlist,
    loadNotifications,
    loadMoreNotifications,
    setNotificationFilter,
    isNotificationRead,
    cleanNotificationMessage,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteNotificationGroup,
    openNotification,
    createBooking,
    setStatus,
    checkInBooking,
    createRecurring,
    joinWaitlist,
    loadStats,
    loadSettings,
    saveSettings,
    testEmail,
    restoreBackup,
    loadKiosk,
    loadProfile,
    saveProfile,
    changePassword,
  };
}
