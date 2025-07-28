import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware.  Captures synchronous and asynchronous
 * errors passed via `next(err)` and returns a structured JSON response.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error(err);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message });
}