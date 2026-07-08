
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function scalar(sql, params = [], fallback = 0) {
  try {
    const [[row]] = await pool.execute(sql, params);
    const value = row ? Object.values(row)[0] : fallback;
    return Number(value || 0);
  } catch {
    return fallback;
  }
}

async function rows(sql, params = [], fallback = []) {
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch {
    return fallback;
  }
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const bookableRoomWhere = "(r.status IS NULL OR r.status IN ('active','available','ready','พร้อมใช้'))";
    const activeBookingWhere = "b.status IN ('approved','checked_in') AND NOW() >= b.start_at AND NOW() < b.end_at";

    const totalRooms = await scalar(
      "SELECT COUNT(*) AS total FROM rooms r WHERE " + bookableRoomWhere
    );

    const occupiedRooms = await scalar(
      "SELECT COUNT(DISTINCT r.id) AS total FROM rooms r JOIN bookings b ON b.room_id = r.id WHERE " + bookableRoomWhere + " AND " + activeBookingWhere
    );

    const roomsReady = await scalar(
      "SELECT COUNT(*) AS total FROM rooms r WHERE " + bookableRoomWhere + " AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.room_id = r.id AND " + activeBookingWhere + ")"
    );

    const todayBookings = await scalar(
      "SELECT COUNT(*) AS total FROM bookings WHERE DATE(start_at) = CURDATE() AND status NOT IN ('cancelled','rejected')"
    );

    const pendingBookings = await scalar(
      "SELECT COUNT(*) AS total FROM bookings WHERE status = 'pending'"
    );

    const unread = await scalar(
      "SELECT COUNT(*) AS total FROM notifications WHERE is_read = 0 AND (user_id = ? OR role_target IN (?, 'admin_staff'))",
      [req.user.id, req.user.role]
    );

    const upcoming = await rows(
      "SELECT b.id, b.title, b.status, b.start_at, b.end_at, r.name AS room_name " +
      "FROM bookings b JOIN rooms r ON r.id = b.room_id " +
      "WHERE b.start_at >= NOW() AND b.status IN ('pending','approved','checked_in') " +
      "AND (b.user_id = ? OR ? IN ('admin','staff')) " +
      "ORDER BY b.start_at ASC LIMIT 5",
      [req.user.id, req.user.role]
    );

    res.json({
      roomsReady,
      occupiedRooms,
      totalRooms,
      todayBookings,
      pendingBookings,
      unread,
      upcoming,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
