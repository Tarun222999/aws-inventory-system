import { z } from "zod";

export const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive().max(10_000),
        }),
      )
      .min(1)
      .max(50),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Each product may appear only once",
      });
    }
  });

export const orderIdSchema = z.string().uuid();
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
