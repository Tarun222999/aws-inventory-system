export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  pricePaise: number;
  availableQuantity: number;
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
