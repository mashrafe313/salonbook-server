
import type { RequestHandler } from 'express';

export const requireAdmin: RequestHandler = (
  req,
  res,
  next
) => {
  if (!req.authUser) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (req.authUser.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  next();
};
