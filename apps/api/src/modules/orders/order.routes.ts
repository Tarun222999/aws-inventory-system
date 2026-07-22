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
  createOrder,
  findOrderById,
  InsufficientStockError,
  OrderedProductNotFoundError,
  OrderTotalTooLargeError,
} from "./order.repository.js";
import { createOrderSchema, orderIdSchema } from "./order.schemas.js";

type OrderRouteContext = {
  database: Database;
  logger: ReturnType<typeof createLogger>;
  requestId: string | string[];
};

export async function handleOrderRoute(
  request: IncomingMessage,
  response: ServerResponse,
  context: OrderRouteContext,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");
  try {
    if (request.method === "POST" && url.pathname === "/orders") {
      const input = createOrderSchema.parse(await readJsonBody(request));
      const order = await createOrder(context.database, input);
      sendJson(
        response,
        201,
        { data: order },
        {
          location: `/orders/${order.id}`,
        },
      );
      return true;
    }

    const match = /^\/orders\/([^/]+)$/.exec(url.pathname);
    if (request.method === "GET" && match) {
      const id = orderIdSchema.parse(match[1]);
      const order = await findOrderById(context.database, id);
      if (!order) {
        sendJson(response, 404, {
          error: { code: "order_not_found", message: "Order not found" },
        });
      } else {
        sendJson(response, 200, { data: order });
      }
      return true;
    }

    return false;
  } catch (error) {
    if (error instanceof ZodError) {
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
    } else if (error instanceof InvalidJsonError) {
      sendJson(response, 400, {
        error: { code: "invalid_json", message: error.message },
      });
    } else if (error instanceof RequestBodyTooLargeError) {
      sendJson(response, 413, {
        error: { code: "body_too_large", message: error.message },
      });
    } else if (error instanceof OrderedProductNotFoundError) {
      sendJson(response, 404, {
        error: { code: "product_not_found", message: error.message },
      });
    } else if (error instanceof InsufficientStockError) {
      sendJson(response, 409, {
        error: { code: "insufficient_stock", message: error.message },
      });
    } else if (error instanceof OrderTotalTooLargeError) {
      sendJson(response, 400, {
        error: { code: "order_total_too_large", message: error.message },
      });
    } else {
      context.logger.error("Order request failed", error, {
        requestId: context.requestId,
      });
      sendJson(response, 503, {
        error: {
          code: "database_unavailable",
          message: "Order data is temporarily unavailable",
        },
      });
    }
    return true;
  }
}
