import type { RequestHandler } from 'express';

export const requireAdmin: RequestHandler = (_req, res) => {
  return res.status(401).json({
    success: false,
    message: 'Admin authentication is not configured yet',
  });
};