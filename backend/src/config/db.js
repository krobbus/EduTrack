import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT),
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

const pgErrors = {
  '23502': { status: 400, message: 'A required field was left empty (NOT NULL violation).' },
  '23503': { status: 400, message: 'Referenced record does not exist (foreign key violation).' },
  '23505': { status: 409, message: 'A record with that value already exists (unique constraint violation).' },
  '42P01': { status: 500, message: 'Database table does not exist.' },
  '42703': { status: 500, message: 'Database column does not exist.' },
  '22P02': { status: 400, message: 'Invalid input syntax for the given type.' },
};

export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    const mapped = pgErrors[err.code];
    if (mapped) {
      err.statusCode = mapped.status;
      err.message = mapped.message;
    }
    throw err;
  }
};

export const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('Database connected successfully.');
  } finally {
    client.release();
  }
};

export const closePool = async () => {
  await pool.end();
};

export const db = { query, testConnection, closePool, pool };
export default db;