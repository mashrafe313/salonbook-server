
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { connectDB } from '../config/db';

interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  role?: string;
  isBlocked?: boolean;
  image?: string | null;
  createdAt?: Date;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/users
// Admin-only: list customer accounts without exposing auth data.
export async function getUsers(req: Request, res: Response) {
  const search =
    typeof req.query.search === 'string'
      ? req.query.search.trim()
      : '';

  const db = await connectDB();

  const filter: Record<string, unknown> = {
    role: 'customer',
  };

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const users = await db
    .collection<UserDocument>('users')
    .find(filter, {
      projection: {
        name: 1,
        email: 1,
        role: 1,
        isBlocked: 1,
        image: 1,
        createdAt: 1,
      },
    })
    .sort({ createdAt: -1 })
    .toArray();

  return res.status(200).json({
    success: true,
    message: 'Customers retrieved successfully',
    data: users.map((user) => ({
      _id: user._id.toHexString(),
      name: user.name,
      email: user.email,
      role: user.role ?? 'customer',
      isBlocked: user.isBlocked === true,
      image: user.image ?? null,
      createdAt: user.createdAt ?? null,
    })),
  });
}

// PATCH /api/users/:id/block
export async function blockUser(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID',
    });
  }

  const db = await connectDB();

  const result = await db.collection<UserDocument>('users').updateOne(
    {
      _id: new ObjectId(id),
      role: 'customer',
    },
    {
      $set: {
        isBlocked: true,
      },
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'Customer account not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Customer blocked successfully',
  });
}

// PATCH /api/users/:id/unblock
export async function unblockUser(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID',
    });
  }

  const db = await connectDB();

  const result = await db.collection<UserDocument>('users').updateOne(
    {
      _id: new ObjectId(id),
      role: 'customer',
    },
    {
      $set: {
        isBlocked: false,
      },
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'Customer account not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Customer unblocked successfully',
  });
}
