import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db';
import { config } from '../config';

export interface AuthUser {
  id: string;
  email: string;
  nickname: string | null;
  created_at: string;
}

interface JwtPayload {
  sub: string;
  email: string;
}

const BCRYPT_ROUNDS = 10;

function pickUser(row: Record<string, unknown>): AuthUser {
  return {
    id: String(row.id),
    email: String(row.email),
    nickname: row.nickname === null ? null : String(row.nickname),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

/** 注册（文档 7.1：POST /api/auth/register） */
export async function registerUser(input: {
  email: string;
  password: string;
  nickname?: string;
}): Promise<{ token: string; user: AuthUser }> {
  const email = input.email.trim().toLowerCase();
  const nickname = input.nickname?.trim() || null;

  // 邮箱查重
  const existed = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existed.rowCount && existed.rowCount > 0) {
    const err = new Error('该邮箱已被注册') as Error & { statusCode: number; code: string };
    err.statusCode = 409;
    err.code = 'CONFLICT';
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, nickname)
     VALUES ($1, $2, $3)
     RETURNING id, email, nickname, created_at`,
    [email, passwordHash, nickname]
  );
  const user = pickUser(result.rows[0]);
  const token = signToken(user);
  return { token, user };
}

/** 登录（文档 7.1：POST /api/auth/login） */
export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const email = input.email.trim().toLowerCase();
  const result = await pool.query(
    'SELECT id, email, nickname, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );
  if (result.rowCount === 0) {
    const err = new Error('邮箱或密码错误') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  const row = result.rows[0];
  const ok = await bcrypt.compare(input.password, row.password_hash);
  if (!ok) {
    const err = new Error('邮箱或密码错误') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  const user = pickUser(row);
  const token = signToken(user);
  return { token, user };
}

/** 签发 JWT */
export function signToken(user: AuthUser): string {
  const payload: JwtPayload = { sub: user.id, email: user.email };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

/** 验证 JWT，失败返回 null */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
    return { sub: decoded.sub as string, email: decoded.email as string };
  } catch {
    return null;
  }
}
