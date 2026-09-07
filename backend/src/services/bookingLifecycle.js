import { pool } from '../config/db.js';

/** Mark checked-in bookings as completed when their reserved time has ended. */
export async function completeExpiredCheckedInBookings() {
  const [result] = await pool.execute(
    `UPDATE bookings
     SET status = 'completed',
         completed_at = COALESCE(completed_at, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR))
     WHERE status = 'checked_in'
       AND end_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR)`
  );
  return Number(result.affectedRows || 0);
}

export function startBookingLifecycleWorker(intervalMs = 60_000) {
  const run = async () => {
    try {
      const completed = await completeExpiredCheckedInBookings();
      if (completed) console.log(`Auto-completed ${completed} booking(s)`);
    } catch (error) {
      console.error('Booking lifecycle worker failed:', error.message);
    }
  };

  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return timer;
}
