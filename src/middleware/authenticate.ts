
import { ObjectId } from 'mongodb';
import type { RequestHandler } from 'express';

import { env } from '../config/env';
import { connectDB } from '../config/db';

interface BetterAuthUser {
  _id: ObjectId;
  name: string;
  email: string;
  role?: string;
  isBlocked?: boolean;
}

export const authenticate: RequestHandler = async (
  req,
  res,
  next
) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication token is missing',
    });
    return;
  }

  let userId: string;

  try {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');

    const JWKS = createRemoteJWKSet(
      new URL(`${env.AUTH_BASE_URL}/api/auth/jwks`)
    );

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.AUTH_BASE_URL,
      audience: env.AUTH_BASE_URL,
    });

    if (!payload.sub) {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
      return;
    }

    userId = payload.sub;
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    });
    return;
  }

  try {
    if (!ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    const db = await connectDB();

    const user = await db
      .collection<BetterAuthUser>('users')
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User account not found',
      });
      return;
    }

    if (user.isBlocked === true) {
      res.status(403).json({
        success: false,
        message: 'Your account has been blocked',
      });
      return;
    }

    if (user.role !== 'customer' && user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Invalid account role',
      });
      return;
    }

    req.authUser = {
      id: user._id.toHexString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isBlocked: false,
    };

    next();
  } catch (error) {
    next(error);
  }
};
