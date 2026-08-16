import type {
  ApiErrorBody,
  Order,
  Product,
  ProductImage,
  ProductImageUploadConfirmation,
  ProductImageUploadGrant,
} from "./types";

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (configuredBase || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Array<{ path: string; message: string }> = [],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(
      0,
      "network_unavailable",
      "The local API cannot be reached.",
    );
  }

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.code ?? "request_failed",
      body.error?.message ?? `Request failed with status ${response.status}`,
      body.error?.details ?? [],
    );
  }
  return body;
}

export async function listProducts(cursor?: string) {
  const search = new URLSearchParams({ limit: "12" });
  if (cursor) search.set("cursor", cursor);
  return request<{
    data: Product[];
    pagination: { limit: number; nextCursor: string | null };
  }>(`/products?${search.toString()}`);
}

export function createProduct(input: {
  sku: string;
  name: string;
  description?: string;
  pricePaise: number;
  initialQuantity: number;
}) {
  return request<{ data: Product }>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createOrder(
  items: Array<{ productId: string; quantity: number }>,
) {
  return request<{ data: Order }>("/orders", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function getOrder(id: string) {
  return request<{ data: Order }>(`/orders/${encodeURIComponent(id)}`);
}

export function requestProductImageUploadGrant(
  productId: string,
  input: Pick<ProductImageUploadConfirmation, "contentType" | "checksumSha256">,
) {
  return request<{ data: ProductImageUploadGrant }>(
    `/products/${encodeURIComponent(productId)}/image/upload-grant`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function uploadProductImageBytes(
  grant: ProductImageUploadGrant,
  file: File,
) {
  let response: Response;
  try {
    response = await fetch(grant.url, {
      method: "PUT",
      headers: grant.requiredHeaders,
      body: file,
    });
  } catch {
    throw new ApiError(
      0,
      "image_upload_unavailable",
      "The image could not be uploaded to object storage.",
    );
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      "image_upload_failed",
      `Image upload failed with status ${response.status}`,
    );
  }
}

export function confirmProductImageUpload(
  productId: string,
  input: ProductImageUploadConfirmation,
) {
  return request<{ data: ProductImage }>(
    `/products/${encodeURIComponent(productId)}/image/confirm`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function requestProductImageDownloadGrant(productId: string) {
  return request<{
    data: {
      image: ProductImage;
      grant: { url: string; expiresInSeconds: number };
    };
  }>(`/products/${encodeURIComponent(productId)}/image/download-grant`);
}
