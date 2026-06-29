import { Router } from 'express';
import { pool } from '../services/db';
import { AuthRequest, requireAuth } from '../middleware/auth';

export const recordRoutes = Router();

const ALLOWED = ['piano', 'guitar', 'violin', 'flute', 'drums'];

// 文档 7.2：GET /api/records?limit=20&offset=0
recordRoutes.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const result = await pool.query(
      `SELECT id, instrument, notes_played, duration_sec, created_at
       FROM play_records WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user!.sub, limit, offset]
    );
    res.json({ items: result.rows, limit, offset });
  } catch (err) {
    next(err);
  }
});

// 文档 7.2：POST /api/records
// Body: { instrument, notes_played, duration_sec }
recordRoutes.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { instrument, notes_played, duration_sec } = req.body ?? {};
    if (!instrument || !ALLOWED.includes(instrument)) {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'instrument 不合法' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO play_records (user_id, instrument, notes_played, duration_sec)
       VALUES ($1, $2, $3, $4)
       RETURNING id, instrument, notes_played, duration_sec, created_at`,
      [req.user!.sub, instrument, notes_played ? JSON.stringify(notes_played) : null, duration_sec ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 文档 7.2：DELETE /api/records/:id
recordRoutes.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM play_records WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.sub]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ code: 'NOT_FOUND', message: '演奏记录不存在' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
