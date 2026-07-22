import { z } from "zod";

const cursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

export type ProductCursor = z.infer<typeof cursorSchema>;
export class InvalidProductCursorError extends Error {}

export function encodeProductCursor(cursor: ProductCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeProductCursor(value: string): ProductCursor {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    return cursorSchema.parse(JSON.parse(decoded) as unknown);
  } catch {
    throw new InvalidProductCursorError("Product cursor is invalid");
  }
}
