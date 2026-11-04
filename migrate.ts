import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to run database migrations.');

const migrationDirectory = new URL('./migrations/', import.meta.url);
const files = (await readdir(migrationDirectory))
  .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(file))
  .sort();
const connection = await mysql.createConnection({ uri: databaseUrl, multipleStatements: false });

try {
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  for (const file of files) {
    const version = file.slice(0, -4);
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT version FROM schema_migrations WHERE version = ?',
      [version],
    );
    if (rows.length) {
      console.log(`Migration ${version} is already applied.`);
      continue;
    }
    const migrationPath = fileURLToPath(new URL(file, migrationDirectory));
    const migration = await readFile(migrationPath, 'utf8');
    const statements = migration.split(';').map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) await connection.query(statement);
    await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
    console.log(`Applied migration ${version}.`);
  }
} finally {
  await connection.end();
}
