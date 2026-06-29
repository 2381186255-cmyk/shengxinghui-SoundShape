import { Router } from 'express';
import { pool } from '../services/db';
import { AuthRequest, requireAuth } from '../middleware/auth';

export const layoutRoutes = Router();

const ALLOWED = ['piano', 'guitar', 'violin', 'flute', 'drums'];

// 文档 7.4：GET /api/layouts?limit=20
layoutRoutes.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const result = await pool.query(
      `SELECT id, name, instrument, shapes, created_at
       FROM layouts WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user!.sub, limit, offset]
    );
    res.json({ items: result.rows, limit, offset });
  } catch (err) {
    next(err);
  }
});

// 文档 7.4：POST /api/layouts
// Body: { name, instrument, shapes: [...] }
layoutRoutes.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { name, instrument, shapes } = req.body ?? {};
    if (!name || !instrument || !ALLOWED.includes(instrument)) {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'name/instrument 不合法' });
      return;
    }
    if (!Array.isArray(shapes) || shapes.length === 0) {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'shapes 必须是非空数组' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO layouts (user_id, name, instrument, shapes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, instrument, shapes, created_at`,
      [req.user!.sub, String(name), instrument, JSON.stringify(shapes)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 文档 7.4：DELETE /api/layouts/:id
layoutRoutes.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM layouts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.sub]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ code: 'NOT_FOUND', message: '键位布局不存在' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
