import { Router } from 'express';
import { pool } from '../services/db';
import { AuthRequest, requireAuth } from '../middleware/auth';

export const tuningRoutes = Router();

const ALLOWED = ['piano', 'guitar', 'violin', 'flute', 'drums'];

// 文档 7.3：GET /api/tunings?limit=20
tuningRoutes.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const result = await pool.query(
      `SELECT id, instrument, target_note, measured_freq, deviation_cents, created_at
       FROM tuning_records WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user!.sub, limit, offset]
    );
    res.json({ items: result.rows, limit, offset });
  } catch (err) {
    next(err);
  }
});

// 文档 7.3：POST /api/tunings
// Body: { instrument, target_note, measured_freq, deviation_cents }
tuningRoutes.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { instrument, target_note, measured_freq, deviation_cents } = req.body ?? {};
    if (!instrument || !ALLOWED.includes(instrument)) {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'instrument 不合法' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO tuning_records (user_id, instrument, target_note, measured_freq, deviation_cents)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, instrument, target_note, measured_freq, deviation_cents, created_at`,
      [req.user!.sub, instrument, target_note ?? null, measured_freq ?? null, deviation_cents ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 文档 7.3：DELETE /api/tunings/:id
tuningRoutes.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM tuning_records WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.sub]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ code: 'NOT_FOUND', message: '调音记录不存在' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
