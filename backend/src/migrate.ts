import fs from 'fs';
import path from 'path';
import { pool } from './services/db';

/**
 * 执行 migrations/001_init.sql（文档原文）。
 * 幂等：先检查 users 表是否存在，存在则跳过，保持 SQL 文件原样不动。
 */
export async function runMigrations(): Promise<void> {
  const { rowCount } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  `);
  if (rowCount && rowCount > 0) {
    console.log('[db] 表已存在，跳过 migration');
    return;
  }
  const sqlPath = path.resolve(__dirname, '..', 'migrations', '001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('[db] 已执行 001_init.sql');
}

// 允许直接运行：npm run migrate
if (require.main === module) {
  runMigrations()
    .then(async () => {
      const { pool } = await import('./services/db');
      await pool.end();
      console.log('[db] 迁移完成');
    })
    .catch((err) => {
      console.error('[db] 迁移失败:', err.message);
      process.exit(1);
    });
}
