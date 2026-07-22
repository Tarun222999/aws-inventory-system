import type { IncomingMessage, ServerResponse } from "node:http";
import { ZodError } from "zod";

import type { Database } from "@order-platform/database";
import type { createLogger } from "@order-platform/logger";

import {
  InvalidJsonError,
  readJsonBody,
  RequestBodyTooLargeError,
  sendJson,
} from "../../http/json.js";
import {
  decodeProductCursor,
  encodeProductCursor,
  InvalidProductCursorError,
} from "./product.cursor.js";
import {
  createProduct,
  DuplicateSkuError,
  findProductById,
  listProducts,
} from "./product.repository.js";
import {
  createProductSchema,
  productIdSchema,
  productListQuerySchema,
} from "./product.schemas.js";

type ProductRouteContext = {
  database: Database;
  logger: ReturnType<typeof createLogger>;
  requestId: string | string[];
};

function sendValidationError(response: ServerResponse, error: ZodError) {
  sendJson(response, 400, {
    error: {
      code: "validation_error",
      message: "Request validation failed",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
  });
}

export async function handleProductRoute(
  request: IncomingMessage,
  response: ServerResponse,
  context: ProductRouteContext,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");

  try {
    if (request.method === "POST" && url.pathname === "/products") {
      const input = createProductSchema.parse(await readJsonBody(request));
      const product = await createProduct(context.database, input);
      sendJson(
        response,
        201,
        { data: product },
        {
          location: `/products/${product.id}`,
        },
      );
      return true;
    }

    if (request.method === "GET" && url.pathname === "/products") {
      const query = productListQuerySchema.parse({
        limit: url.searchParams.get("limit") ?? undefined,
        cursor: url.searchParams.get("cursor") ?? undefined,
      });
      const cursor = query.cursor
        ? decodeProductCursor(query.cursor)
        : undefined;
      const rows = await listProducts(context.database, query.limit, cursor);
      const data = rows.slice(0, query.limit);
      const last = data.at(-1);
      const nextCursor =
        rows.length > query.limit && last
          ? encodeProductCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null;

      sendJson(response, 200, {
        data,
        pagination: { limit: query.limit, nextCursor },
      });
      return true;
    }

    const match = /^\/products\/([^/]+)$/.exec(url.pathname);
    if (request.method === "GET" && match) {
      const id = productIdSchema.parse(match[1]);
      const product = await findProductById(context.database, id);
      if (!product) {
        sendJson(response, 404, {
          error: { code: "product_not_found", message: "Product not found" },
        });
        return true;
      }
      sendJson(response, 200, { data: product });
      return true;
    }

    return false;
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(response, error);
    } else if (error instanceof InvalidJsonError) {
      sendJson(response, 400, {
        error: { code: "invalid_json", message: error.message },
      });
    } else if (error instanceof RequestBodyTooLargeError) {
      sendJson(response, 413, {
        error: { code: "body_too_large", message: error.message },
      });
    } else if (error instanceof DuplicateSkuError) {
      sendJson(response, 409, {
        error: { code: "duplicate_sku", message: error.message },
      });
    } else if (error instanceof InvalidProductCursorError) {
      sendJson(response, 400, {
        error: { code: "invalid_cursor", message: error.message },
      });
    } else {
      context.logger.error("Product request failed", error, {
        requestId: context.requestId,
      });
      sendJson(response, 503, {
        error: {
          code: "database_unavailable",
          message: "Product data is temporarily unavailable",
        },
      });
    }
    return true;
  }
}
