import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl
  ? mysql.createPool({
      uri: databaseUrl,
      connectionLimit: 8,
      enableKeepAlive: true,
      timezone: 'Z',
      decimalNumbers: true,
    })
  : null;

export const db = pool ? drizzle(pool, { schema, mode: 'default' }) : null;

export function requirePool(): mysql.Pool {
  if (!pool) throw new Error('Managed database is not configured (DATABASE_URL is missing).');
  return pool;
}
