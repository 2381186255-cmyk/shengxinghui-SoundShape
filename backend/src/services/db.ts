import { Pool } from 'pg';
import { config } from '../config';

/**
 * PostgreSQL 连接池（文档第 3.2 节：pg）
 * 单例，全应用共享。Express 路由通过 pool.query() 执行 SQL。
 */
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] 连接池异常:', err.message);
});

export async function closePool(): Promise<void> {
  await pool.end();
}
