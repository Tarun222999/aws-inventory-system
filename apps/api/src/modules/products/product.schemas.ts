import { z } from "zod";

export const createProductSchema = z
  .object({
    sku: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2_000).nullable().optional(),
    pricePaise: z.number().int().positive(),
    initialQuantity: z.number().int().min(0),
  })
  .strict();

export const productIdSchema = z.string().uuid();

export const productListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
