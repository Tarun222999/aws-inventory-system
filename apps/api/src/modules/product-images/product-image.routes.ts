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
  ProductImageObjectNotFoundError,
  type ProductImageStorage,
} from "../../storage/product-image.js";
import { ProductForImageNotFoundError } from "./product-image.repository.js";
import {
  confirmProductImageUploadSchema,
  createProductImageUploadGrantSchema,
  productImageProductIdSchema,
} from "./product-image.schemas.js";
import {
  confirmProductImageUpload,
  ProductImageNotFoundError,
  ProductImageUploadNotVerifiedError,
  requestProductImageDownload,
  requestProductImageUpload,
} from "./product-image.service.js";

type ProductImageRouteContext = {
  database: Database;
  logger: ReturnType<typeof createLogger>;
  requestId: string | string[];
  storage?: ProductImageStorage;
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

export async function handleProductImageRoute(
  request: IncomingMessage,
  response: ServerResponse,
  context: ProductImageRouteContext,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const match =
    /^\/products\/([^/]+)\/image\/(upload-grant|confirm|download-grant)$/.exec(
      url.pathname,
    );
  if (!match) return false;

  const [, rawProductId, operation] = match;
  const methodMatches =
    (operation === "upload-grant" && request.method === "POST") ||
    (operation === "confirm" && request.method === "POST") ||
    (operation === "download-grant" && request.method === "GET");
  if (!methodMatches) return false;

  if (!context.storage) {
    sendJson(response, 503, {
      error: {
        code: "product_image_storage_unavailable",
        message: "Product image storage is not configured",
      },
    });
    return true;
  }

  try {
    const productId = productImageProductIdSchema.parse(rawProductId);
    const dependencies = {
      database: context.database,
      storage: context.storage,
      onCleanupFailure: (error: unknown, objectKey: string) =>
        context.logger.error("Old product image cleanup failed", error, {
          requestId: context.requestId,
          objectKey,
        }),
    };

    if (operation === "upload-grant") {
      const input = createProductImageUploadGrantSchema.parse(
        await readJsonBody(request),
      );
      const grant = await requestProductImageUpload(dependencies, {
        productId,
        ...input,
      });
      sendJson(response, 200, { data: grant });
      return true;
    }

    if (operation === "confirm") {
      const input = confirmProductImageUploadSchema.parse(
        await readJsonBody(request),
      );
      const image = await confirmProductImageUpload(
        dependencies,
        productId,
        input,
      );
      sendJson(response, 201, { data: image });
      return true;
    }

    const result = await requestProductImageDownload(dependencies, productId);
    sendJson(response, 200, { data: result });
    return true;
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
    } else if (error instanceof ProductForImageNotFoundError) {
      sendJson(response, 404, {
        error: { code: "product_not_found", message: error.message },
      });
    } else if (error instanceof ProductImageNotFoundError) {
      sendJson(response, 404, {
        error: { code: "product_image_not_found", message: error.message },
      });
    } else if (
      error instanceof ProductImageObjectNotFoundError ||
      error instanceof ProductImageUploadNotVerifiedError
    ) {
      sendJson(response, 409, {
        error: { code: "upload_not_verified", message: error.message },
      });
    } else {
      context.logger.error("Product image request failed", error, {
        requestId: context.requestId,
      });
      sendJson(response, 503, {
        error: {
          code: "product_image_service_unavailable",
          message: "Product image service is temporarily unavailable",
        },
      });
    }
    return true;
  }
}
