import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';

/**
 * 扩展 Request，挂载已认证用户。
 */
export interface AuthRequest extends Request {
  user?: { sub: string; email: string };
}

/**
 * JWT 鉴权中间件。
 * 从 Authorization: Bearer <token> 解析，把 { sub, email } 挂到 req.user。
 * 失败返回 401（文档第九节：JWT 过期 → 跳转登录页 + 提示）。
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: '缺少认证信息' });
    return;
  }
  const token = header.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: '认证已过期，请重新登录' });
    return;
  }
  req.user = payload;
  next();
}
