export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  pricePaise: number;
  availableQuantity: number;
  hasImage: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductImageContentType = "image/jpeg" | "image/png" | "image/webp";

export type ProductImageUploadConfirmation = {
  objectKey: string;
  contentType: ProductImageContentType;
  checksumSha256: string;
};

export type ProductImageUploadGrant = {
  objectKey: string;
  url: string;
  expiresInSeconds: number;
  requiredHeaders: {
    "content-type": ProductImageContentType;
    "x-amz-checksum-sha256": string;
    "if-none-match": "*";
  };
};

export type ProductImage = ProductImageUploadConfirmation & {
  id: string;
  productId: string;
  byteSize: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus = "pending" | "processing" | "ready_to_ship" | "failed";

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  skuSnapshot: string;
  nameSnapshot: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
};

export type Order = {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ path: string; message: string }>;
  };
};
