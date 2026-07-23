import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  createOrder,
  createProduct,
  getOrder,
  listProducts,
} from "./api";
import { formatDate, formatMoney } from "./format";
import type { Order, Product } from "./types";

type View = "inventory" | "add-product" | "order";
type Cart = Record<string, number>;

const statusCopy = {
  pending: { label: "Accepted", detail: "Waiting for the background worker." },
  processing: {
    label: "Fulfilling",
    detail: "The worker is processing this order.",
  },
  ready_to_ship: {
    label: "Ready to ship",
    detail: "Asynchronous fulfillment completed.",
  },
  failed: {
    label: "Needs attention",
    detail: "Background fulfillment did not complete.",
  },
} as const;

function errorMessage(error: unknown) {
  if (!(error instanceof ApiError))
    return "Something unexpected happened. Please try again.";
  if (error.code === "network_unavailable")
    return "The local API is unavailable. Start it, then try again.";
  if (error.code === "database_unavailable" || error.status === 503)
    return "Product and order data are temporarily unavailable because a dependency is offline.";
  if (error.code === "duplicate_sku")
    return "That SKU is already in use. Choose a unique SKU.";
  if (error.code === "insufficient_stock")
    return "Stock changed before checkout. Review the available quantities and try again.";
  if (error.code === "product_not_found")
    return "A selected product no longer exists. Refresh the catalog and try again.";
  if (error.code === "order_not_found")
    return "No order was found for that ID.";
  return error.message;
}

function Notice({
  kind,
  children,
}: {
  kind: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`notice notice--${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

function Header({
  view,
  onNavigate,
  cartCount,
}: {
  view: View;
  onNavigate: (view: View) => void;
  cartCount: number;
}) {
  return (
    <header className="site-header">
      <button
        className="brand"
        type="button"
        onClick={() => onNavigate("inventory")}
        aria-label="Stockroom home"
      >
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <span>
          <strong>Stockroom</strong>
          <small>Order & inventory</small>
        </span>
      </button>
      <nav aria-label="Primary navigation">
        <button
          className={view === "inventory" ? "active" : ""}
          onClick={() => onNavigate("inventory")}
        >
          Inventory
        </button>
        <button
          className={view === "add-product" ? "active" : ""}
          onClick={() => onNavigate("add-product")}
        >
          Add product
        </button>
        <button
          className={`cart-button ${view === "order" ? "active" : ""}`}
          onClick={() => onNavigate("order")}
        >
          Create order <span>{cartCount}</span>
        </button>
      </nav>
    </header>
  );
}

function Inventory({
  products,
  loading,
  loadingMore,
  nextCursor,
  error,
  cart,
  onQuantity,
  onReload,
  onLoadMore,
  onAddProduct,
}: {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  nextCursor: string | null;
  error: string | null;
  cart: Cart;
  onQuantity: (product: Product, quantity: number) => void;
  onReload: () => void;
  onLoadMore: () => void;
  onAddProduct: () => void;
}) {
  return (
    <section aria-labelledby="inventory-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 id="inventory-title">Inventory at a glance</h1>
          <p>Choose quantities here, then review them as one transaction.</p>
        </div>
        <button className="primary" onClick={onAddProduct}>
          Add a product
        </button>
      </div>
      {error && (
        <Notice kind="error">
          <strong>Catalog unavailable.</strong> {error}{" "}
          <button className="text-button" onClick={onReload}>
            Try again
          </button>
        </Notice>
      )}
      {loading ? (
        <div className="loading-grid" aria-label="Loading products">
          <span />
          <span />
          <span />
        </div>
      ) : products.length === 0 && !error ? (
        <div className="empty-state">
          <span aria-hidden="true">□</span>
          <h2>No products yet</h2>
          <p>Add the first product and its opening stock to begin.</p>
          <button className="primary" onClick={onAddProduct}>
            Add first product
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => {
            const quantity = cart[product.id] ?? 0;
            const unavailable = product.availableQuantity === 0;
            return (
              <article className="product-card" key={product.id}>
                <div className="card-top">
                  <span className="sku">{product.sku}</span>
                  <span className={`stock ${unavailable ? "stock--out" : ""}`}>
                    {unavailable
                      ? "Out of stock"
                      : `${product.availableQuantity} in stock`}
                  </span>
                </div>
                <h2>{product.name}</h2>
                <p className="description">
                  {product.description || "No description provided."}
                </p>
                <div className="product-footer">
                  <strong>{formatMoney(product.pricePaise)}</strong>
                  <label>
                    <span className="sr-only">Quantity for {product.name}</span>
                    <input
                      type="number"
                      min="0"
                      max={product.availableQuantity}
                      value={quantity}
                      disabled={unavailable}
                      onChange={(event) =>
                        onQuantity(product, Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {nextCursor && !loading && (
        <div className="load-more">
          <button
            className="secondary"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? "Loading…" : "Load more products"}
          </button>
        </div>
      )}
    </section>
  );
}

function ProductForm({ onCreated }: { onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setDone(false);
    const form = new FormData(formElement);
    const stringValue = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" ? value : "";
    };
    const price = Number(form.get("priceRupees"));
    const stock = Number(form.get("initialQuantity"));
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(price * 100)
    ) {
      setError("Enter a positive price with no more than two decimal places.");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setError("Opening stock must be a whole number of zero or more.");
      return;
    }
    setSubmitting(true);
    try {
      await createProduct({
        sku: stringValue("sku"),
        name: stringValue("name"),
        description: stringValue("description") || undefined,
        pricePaise: Math.round(price * 100),
        initialQuantity: stock,
      });
      onCreated();
      formElement.reset();
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section className="narrow" aria-labelledby="add-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Inventory setup</p>
          <h1 id="add-title">Add a product</h1>
          <p>Create the catalog record and opening inventory together.</p>
        </div>
      </div>
      {done && (
        <Notice kind="success">Product and opening stock were created.</Notice>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      <form className="panel form" onSubmit={(event) => void submit(event)}>
        <div className="form-row">
          <label>
            SKU<span>Unique stock-keeping code</span>
            <input name="sku" required maxLength={64} autoComplete="off" />
          </label>
          <label>
            Product name<span>Shown to order creators</span>
            <input name="name" required maxLength={200} />
          </label>
        </div>
        <label>
          Description <span>Optional, up to 2,000 characters</span>
          <textarea name="description" maxLength={2000} rows={4} />
        </label>
        <div className="form-row">
          <label>
            Price (₹)<span>For example, 499.00</span>
            <input
              name="priceRupees"
              type="number"
              required
              min="0.01"
              step="0.01"
              inputMode="decimal"
            />
          </label>
          <label>
            Opening stock<span>May be zero</span>
            <input
              name="initialQuantity"
              type="number"
              required
              min="0"
              step="1"
              inputMode="numeric"
            />
          </label>
        </div>
        <div className="form-actions">
          <button className="primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create product"}
          </button>
        </div>
      </form>
    </section>
  );
}

function OrderView({
  products,
  cart,
  onQuantity,
  onClear,
  onRefreshCatalog,
}: {
  products: Product[];
  cart: Cart;
  onQuantity: (product: Product, quantity: number) => void;
  onClear: () => void;
  onRefreshCatalog: () => Promise<void>;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = products.filter((product) => (cart[product.id] ?? 0) > 0);
  const total = selected.reduce(
    (sum, product) => sum + product.pricePaise * (cart[product.id] ?? 0),
    0,
  );
  const refreshOrder = useCallback(async (id: string) => {
    setError(null);
    try {
      const result = await getOrder(id);
      setOrder(result.data);
      setLookupId(result.data.id);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, []);
  useEffect(() => {
    if (!order || (order.status !== "pending" && order.status !== "processing"))
      return;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      let shouldContinue = true;
      try {
        const result = await getOrder(order.id);
        if (cancelled) return;
        setOrder(result.data);
        setLookupId(result.data.id);
        setError(null);
        shouldContinue =
          result.data.status === "pending" ||
          result.data.status === "processing";
      } catch (caught) {
        if (cancelled) return;
        setError(errorMessage(caught));
      } finally {
        if (!cancelled && shouldContinue) {
          timer = window.setTimeout(() => void poll(), 1500);
        }
      }
    };

    timer = window.setTimeout(() => void poll(), 1500);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [order?.id, order?.status]);
  async function submitOrder() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await createOrder(
        selected.map((product) => ({
          productId: product.id,
          quantity: cart[product.id] ?? 0,
        })),
      );
      setOrder(result.data);
      setLookupId(result.data.id);
      onClear();
      await onRefreshCatalog();
    } catch (caught) {
      const isStockConflict =
        caught instanceof ApiError &&
        (caught.code === "insufficient_stock" ||
          caught.code === "product_not_found");
      if (isStockConflict) {
        onClear();
        await onRefreshCatalog();
        setError(
          `${errorMessage(caught)} Your selection was cleared; reselect from the refreshed catalog.`,
        );
      } else {
        setError(errorMessage(caught));
      }
    } finally {
      setSubmitting(false);
    }
  }
  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    if (lookupId.trim()) await refreshOrder(lookupId.trim());
  }
  if (order) {
    const copy = statusCopy[order.status];
    return (
      <section className="narrow" aria-labelledby="status-title">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Order status</p>
            <h1 id="status-title">{copy.label}</h1>
            <p>{copy.detail}</p>
          </div>
          <span className={`status-pill status-pill--${order.status}`}>
            {copy.label}
          </span>
        </div>
        {(order.status === "pending" || order.status === "processing") && (
          <Notice kind="info">
            <strong>Fulfillment is asynchronous.</strong> This page refreshes
            while the separate worker handles accepted work. You can safely
            leave and look up the order later.
          </Notice>
        )}
        {error && <Notice kind="error">{error}</Notice>}
        <div className="panel order-summary">
          <div className="order-meta">
            <div>
              <span>Order ID</span>
              <code>{order.id}</code>
            </div>
            <div>
              <span>Accepted</span>
              <strong>{formatDate(order.createdAt)}</strong>
            </div>
          </div>
          <h2>Items</h2>
          {order.items.map((item) => (
            <div className="line-item" key={item.id}>
              <div>
                <strong>{item.nameSnapshot}</strong>
                <span>
                  {item.skuSnapshot} · {item.quantity} ×{" "}
                  {formatMoney(item.unitPricePaise)}
                </span>
              </div>
              <strong>{formatMoney(item.lineTotalPaise)}</strong>
            </div>
          ))}
          <div className="total">
            <span>Total</span>
            <strong>{formatMoney(order.totalPaise)}</strong>
          </div>
          <div className="form-actions">
            <button
              className="secondary"
              onClick={() => void refreshOrder(order.id)}
            >
              Refresh status
            </button>
            <button
              className="text-button"
              onClick={() => {
                setOrder(null);
                setLookupId("");
              }}
            >
              Create or find another
            </button>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="narrow" aria-labelledby="order-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1 id="order-title">Create an order</h1>
          <p>Stock is reserved atomically when the API accepts the order.</p>
        </div>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="panel">
        {selected.length === 0 ? (
          <div className="empty-state compact">
            <h2>Your order is empty</h2>
            <p>
              Choose quantities from the inventory catalog, or find an existing
              order below.
            </p>
          </div>
        ) : (
          <>
            {selected.map((product) => (
              <div className="line-item" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>
                    {product.sku} · {formatMoney(product.pricePaise)} each
                  </span>
                </div>
                <label>
                  <span className="sr-only">Quantity for {product.name}</span>
                  <input
                    type="number"
                    min="0"
                    max={product.availableQuantity}
                    value={cart[product.id]}
                    onChange={(event) =>
                      onQuantity(product, Number(event.target.value))
                    }
                  />
                </label>
              </div>
            ))}
            <div className="total">
              <span>Order total</span>
              <strong>{formatMoney(total)}</strong>
            </div>
            <div className="form-actions">
              <button
                className="primary"
                disabled={submitting}
                onClick={() => void submitOrder()}
              >
                {submitting ? "Accepting order…" : "Place order"}
              </button>
              <button className="text-button" onClick={onClear}>
                Clear order
              </button>
            </div>
          </>
        )}
      </div>
      <form className="lookup" onSubmit={(event) => void lookup(event)}>
        <label htmlFor="order-lookup">Already have an order ID?</label>
        <div>
          <input
            id="order-lookup"
            value={lookupId}
            onChange={(event) => setLookupId(event.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
          />
          <button className="secondary">View status</button>
        </div>
      </form>
    </section>
  );
}

export function App() {
  const [view, setView] = useState<View>("inventory");
  const [products, setProducts] = useState<Product[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const load = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setCatalogError(null);
    try {
      const result = await listProducts(cursor);
      setProducts((current) =>
        cursor ? [...current, ...result.data] : result.data,
      );
      setNextCursor(result.pagination.nextCursor);
    } catch (caught) {
      setCatalogError(errorMessage(caught));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function setQuantity(product: Product, raw: number) {
    const quantity = Number.isFinite(raw)
      ? Math.max(0, Math.min(Math.trunc(raw), product.availableQuantity))
      : 0;
    setCart((current) => ({ ...current, [product.id]: quantity }));
  }
  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0),
    [cart],
  );
  return (
    <>
      <Header view={view} onNavigate={setView} cartCount={cartCount} />
      <main id="main-content">
        {view === "inventory" && (
          <Inventory
            products={products}
            loading={loading}
            loadingMore={loadingMore}
            nextCursor={nextCursor}
            error={catalogError}
            cart={cart}
            onQuantity={setQuantity}
            onReload={() => void load()}
            onLoadMore={() => nextCursor && void load(nextCursor)}
            onAddProduct={() => setView("add-product")}
          />
        )}
        {view === "add-product" && (
          <ProductForm
            onCreated={() => {
              setView("inventory");
              void load();
            }}
          />
        )}
        {view === "order" && (
          <OrderView
            products={products}
            cart={cart}
            onQuantity={setQuantity}
            onClear={() => setCart({})}
            onRefreshCatalog={() => load()}
          />
        )}
      </main>
      <footer>
        <span>Local learning environment</span>
        <span>API + PostgreSQL + separate worker</span>
      </footer>
    </>
  );
}
