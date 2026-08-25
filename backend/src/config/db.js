
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const databaseConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'meetplanning',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  multipleStatements: false,
  charset: 'utf8mb4',
  // Bookings use Thailand wall-clock time. This keeps MySQL DATETIME values
  // aligned with the time selected in the browser instead of Railway's UTC.
  timezone: '+07:00'
};

export const pool = mysql.createPool(databaseConfig);

export function createRestoreConnection() {
  return mysql.createConnection({ ...databaseConfig, multipleStatements: true });
}

export async function pingDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}
