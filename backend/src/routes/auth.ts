import { Router } from 'express';
import { loginUser, registerUser } from '../services/auth';
import { AuthRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';

export const authRoutes = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 文档 7.1：POST /api/auth/register
// Body: { email, password, nickname }
// Res:  { token, user }
authRoutes.post('/register', async (req, res, next) => {
  try {
    const { email, password, nickname } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'email 和 password 必填' });
      return;
    }
    if (!EMAIL_RE.test(String(email))) {
      res.status(400).json({ code: 'BAD_REQUEST', message: '邮箱格式不正确' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ code: 'BAD_REQUEST', message: '密码至少 6 位' });
      return;
    }
    const { token, user } = await registerUser({
      email: String(email),
      password: String(password),
      nickname: nickname ? String(nickname) : undefined,
    });
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// 文档 7.1：POST /api/auth/login
// Body: { email, password }
// Res:  { token, user }
authRoutes.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'email 和 password 必填' });
      return;
    }
    const { token, user } = await loginUser({
      email: String(email),
      password: String(password),
    });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// 当前用户信息（用于前端刷新页面后还原登录态）
authRoutes.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: { id: req.user!.sub, email: req.user!.email } });
});
