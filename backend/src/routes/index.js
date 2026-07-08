
import authRoutes from './auth.js';
import roomsRoutes from './rooms.js';
import bookingsRoutes from './bookings.js';
import dashboardRoutes from './dashboard.js';
import notificationsRoutes from './notifications.js';
import settingsRoutes from './settings.js';
import backupRoutes from './backup.js';
import statsRoutes from './stats.js';
import kioskRoutes from './kiosk.js';
import recurringRoutes from './recurring.js';
import waitlistRoutes from './waitlist.js';
import profileRoutes from './profile.js';
import metaRoutes from './meta.js';
import adminRoutes from './admin.js';
import auditRoutes from './audit.js';
import reportsRoutes from './reports.js';
import rulesRoutes from './rules.js';

export function registerRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomsRoutes);
  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/kiosk', kioskRoutes);
  app.use('/api/recurring', recurringRoutes);
  app.use('/api/waitlist', waitlistRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/meta', metaRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/rules', rulesRoutes);
}
