import express from 'express';
import cors from 'cors';
import { config } from './config';
import { pool, closePool } from './services/db';
import { authRoutes } from './routes/auth';
import { recordRoutes } from './routes/records';
import { tuningRoutes } from './routes/tunings';
import { layoutRoutes } from './routes/layouts';
import { notFound, errorHandler } from './middleware/error';
import { runMigrations } from './migrate';

const app = express();

// 文档第九节：所有错误场景有友好提示
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'soundshape-backend', time: new Date().toISOString() });
});

// 业务路由（文档第七节）
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/tunings', tuningRoutes);
app.use('/api/layouts', layoutRoutes);

// 404 + 错误处理
app.use(notFound);
app.use(errorHandler);

async function start(): Promise<void> {
  // 启动前执行 migration（文档第 11 节：执行 migrations/001_init.sql）
  await runMigrations();

  // 验证数据库连接
  await pool.query('SELECT 1');

  app.listen(config.port, () => {
    console.log(`✅ 声形绘后端已启动: http://localhost:${config.port}`);
  });
}

// 优雅关闭
async function shutdown(signal: string): Promise<void> {
  console.log(`\n收到 ${signal}，开始优雅关闭...`);
  await closePool();
  console.log('已关闭');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

start().catch((err) => {
  console.error('❌ 启动失败:', err.message);
  process.exit(1);
});
