import { Request, Response, NextFunction } from 'express';

/**
 * 自定义 HTTP 错误：携带状态码与稳定 code。
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * 404 处理（文档第九节：路径不存在 → 友好提示）。
 */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `路径不存在: ${req.method} ${req.url}`,
  });
}

/**
 * 统一错误处理（文档第九节：所有错误场景有友好提示，无白屏/卡死）。
 */
export function errorHandler(
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    console.error('[error]', err.stack || err.message);
  }

  res.status(statusCode).json({
    code,
    message: err.message || '服务器内部错误',
  });
}
