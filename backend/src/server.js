import { app } from './app.js';
import { pingDatabase } from './config/db.js';
import { startBookingLifecycleWorker } from './services/bookingLifecycle.js';
import { migrateLegacyPlaintextPasswords } from './services/passwordMigration.js';

const port = Number(process.env.PORT || 4000);

pingDatabase().then(async () => {
  await migrateLegacyPlaintextPasswords();
  startBookingLifecycleWorker();
  app.listen(port, () => console.log('MeetPlanning API running on http://localhost:' + port));
}).catch((error) => {
  console.error('Cannot connect to MySQL:', error.message);
  process.exit(1);
});
