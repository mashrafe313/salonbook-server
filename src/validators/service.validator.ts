import { z } from 'zod';

export const createServiceSchema = z.object({
  serviceName: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(2000),
  price: z.coerce.number().positive(),
  duration: z.coerce.number().int().positive(),
  image: z.string().url(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const serviceQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sort: z.enum(['price_asc', 'price_desc']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;