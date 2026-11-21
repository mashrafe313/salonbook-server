
import type { Request, Response } from 'express';
import { ObjectId, type Sort } from 'mongodb';

import { connectDB } from '../config/db';
import type { ServiceDocument } from '../types/entities';

import {
  createServiceSchema,
  updateServiceSchema,
  serviceQuerySchema,
} from '../validators/service.validator';

// Escape special regex characters from user search input.
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/services
export async function getServices(req: Request, res: Response) {
  const parsedQuery = serviceQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: parsedQuery.error.flatten(),
    });
  }

  const { search, category, sort, page, limit } = parsedQuery.data;

  const db = await connectDB();
  const collection = db.collection<ServiceDocument>('services');

  const filter: Record<string, unknown> = {
    status: 'active',
  };

  if (search) {
    filter.serviceName = {
      $regex: escapeRegex(search),
      $options: 'i',
    };
  }

  if (category) {
    filter.category = {
      $regex: `^${escapeRegex(category)}$`,
      $options: 'i',
    };
  }

  const sortOption: Sort =
    sort === 'price_asc'
      ? { price: 1 }
      : sort === 'price_desc'
        ? { price: -1 }
        : { createdAt: -1 };

  const skip = (page - 1) * limit;

  const [services, total] = await Promise.all([
    collection
      .find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .toArray(),

    collection.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: 'Services retrieved successfully',
    data: services,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// GET /api/services/:id
export async function getServiceById(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid service ID',
    });
  }

  const db = await connectDB();

  const service = await db
    .collection<ServiceDocument>('services')
    .findOne({
      _id: new ObjectId(id),
      status: 'active',
    });

  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Service retrieved successfully',
    data: service,
  });
}

// POST /api/services
export async function createService(req: Request, res: Response) {
  const parsedBody = createServiceSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid service information',
      errors: parsedBody.error.flatten(),
    });
  }

  const db = await connectDB();
  const collection = db.collection<ServiceDocument>('services');

  const newService: ServiceDocument = {
    ...parsedBody.data,
    createdAt: new Date(),
  };

  const result = await collection.insertOne(newService);

  const createdService = await collection.findOne({
    _id: result.insertedId,
  });

  return res.status(201).json({
    success: true,
    message: 'Service created successfully',
    data: createdService,
  });
}

// PATCH /api/services/:id
export async function updateService(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid service ID',
    });
  }

  const parsedBody = updateServiceSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid service information',
      errors: parsedBody.error.flatten(),
    });
  }

  const db = await connectDB();
  const collection = db.collection<ServiceDocument>('services');

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: parsedBody.data },
    { returnDocument: 'after' }
  );

  if (!result) {
    return res.status(404).json({
      success: false,
      message: 'Service not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Service updated successfully',
    data: result,
  });
}

// DELETE /api/services/:id
// Soft-delete: mark inactive to preserve appointment history.
export async function deleteService(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid service ID',
    });
  }

  const db = await connectDB();

  const result = await db
    .collection<ServiceDocument>('services')
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'inactive' } }
    );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'Service not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Service deactivated successfully',
  });
}
