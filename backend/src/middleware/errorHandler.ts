import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware.  Captures synchronous and asynchronous
 * errors passed via `next(err)` and returns a structured JSON response.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log detailed error information
  console.error(`\n🚨 ERROR - ${new Date().toISOString()}`);
  console.error(`├─ Method: ${req.method}`);
  console.error(`├─ Path: ${req.path}`);
  console.error(`├─ Status: ${status}`);
  console.error(`├─ Message: ${message}`);
  console.error(`├─ Stack: ${err.stack}`);
  console.error(`├─ Request Body: ${JSON.stringify(req.body, null, 2)}`);
  console.error(`└─ IP: ${req.ip}\n`);

  res.status(status).json({ message });
}