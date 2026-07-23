import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./App";

const product = {
  id: "be6c1524-c202-476f-9fa4-667bd56c422f",
  sku: "TEA-1",
  name: "Assam tea",
  description: "Bold loose-leaf tea",
  pricePaise: 34900,
  availableQuantity: 4,
  createdAt: "2026-07-23T09:00:00.000Z",
  updatedAt: "2026-07-23T09:00:00.000Z",
};
const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

describe("App", () => {
  it("renders products and builds an order with accessible controls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        json({
          data: [product],
          pagination: { limit: 12, nextCursor: null },
        }),
      ),
    );
    const user = userEvent.setup();
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Assam tea" }),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Quantity for Assam tea"));
    await user.type(screen.getByLabelText("Quantity for Assam tea"), "2");
    await user.click(screen.getByRole("button", { name: /Create order 2/ }));
    expect(screen.getByText("₹698.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
  });

  it("shows the empty catalog state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          json({ data: [], pagination: { limit: 12, nextCursor: null } }),
        ),
    );
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "No products yet" }),
    ).toBeInTheDocument();
  });

  it("explains a dependency failure and offers retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          json(
            { error: { code: "database_unavailable", message: "offline" } },
            503,
          ),
        ),
    );
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "dependency is offline",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("creates a product and returns to the catalog", async () => {
    let created = false;
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          created = true;
          return json({ data: product }, 201);
        }
        return json({
          data: created ? [product] : [],
          pagination: { limit: 12, nextCursor: null },
        });
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("No products yet");
    await user.click(screen.getByRole("button", { name: "Add a product" }));
    await user.type(screen.getByLabelText(/SKU/), "TEA-1");
    await user.type(screen.getByLabelText(/Product name/), "Assam tea");
    await user.type(screen.getByLabelText(/Price/), "349");
    await user.type(screen.getByLabelText(/Opening stock/), "4");
    await user.click(screen.getByRole("button", { name: "Create product" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Assam tea" }),
      ).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/products",
      expect.objectContaining({ method: "POST" }),
    );
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith("/api/products?"),
      ),
    ).toHaveLength(2);
  });

  it("clears a later-page cart and refetches page one after a stock conflict", async () => {
    const laterProduct = {
      ...product,
      id: "cc01e0c6-fe8c-4ae6-8418-a1213541b612",
      sku: "COFFEE-2",
      name: "Nilgiri coffee",
    };
    let firstPageRequests = 0;
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url === "/api/orders") {
          return json(
            {
              error: {
                code: "insufficient_stock",
                message: "Insufficient stock",
              },
            },
            409,
          );
        }
        if (url.includes("cursor=next-page")) {
          return json({
            data: [laterProduct],
            pagination: { limit: 12, nextCursor: null },
          });
        }
        firstPageRequests += 1;
        return json({
          data: [product],
          pagination: { limit: 12, nextCursor: "next-page" },
        });
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Assam tea" });
    await user.click(
      screen.getByRole("button", { name: "Load more products" }),
    );
    await screen.findByRole("heading", { name: "Nilgiri coffee" });
    await user.clear(screen.getByLabelText("Quantity for Nilgiri coffee"));
    await user.type(screen.getByLabelText("Quantity for Nilgiri coffee"), "2");
    await user.click(screen.getByRole("button", { name: /Create order 2/ }));
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "selection was cleared; reselect from the refreshed catalog",
    );
    expect(
      screen.getByRole("button", { name: "Create order 0" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Your order is empty" }),
    ).toBeInTheDocument();
    expect(firstPageRequests).toBe(2);
  });

  it("retains the cart when order submission has a dependency failure", async () => {
    let catalogRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST" && url === "/api/orders") {
          return json(
            {
              error: {
                code: "database_unavailable",
                message: "temporarily offline",
              },
            },
            503,
          );
        }
        catalogRequests += 1;
        return json({
          data: [product],
          pagination: { limit: 12, nextCursor: null },
        });
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Assam tea" });
    await user.clear(screen.getByLabelText("Quantity for Assam tea"));
    await user.type(screen.getByLabelText("Quantity for Assam tea"), "2");
    await user.click(screen.getByRole("button", { name: /Create order 2/ }));
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "dependency is offline",
    );
    expect(
      screen.getByRole("button", { name: "Create order 2" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Assam tea")).toHaveValue(2);
    expect(catalogRequests).toBe(1);
  });

  it("serializes status polling, reports failure, and clears it after recovery", async () => {
    vi.useFakeTimers();
    const orderId = "187c3e2d-df60-4f9c-a556-627580b4e887";
    const pendingOrder = {
      id: orderId,
      status: "pending",
      totalPaise: 34900,
      createdAt: "2026-07-23T09:00:00.000Z",
      updatedAt: "2026-07-23T09:00:00.000Z",
      items: [],
    };
    let resolveSlowPoll: ((response: Response) => void) | undefined;
    let orderRequests = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("/api/products?")) {
        return json({ data: [], pagination: { limit: 12, nextCursor: null } });
      }
      orderRequests += 1;
      if (orderRequests === 1) return json({ data: pendingOrder });
      if (orderRequests === 2) {
        return new Promise<Response>((resolve) => {
          resolveSlowPoll = resolve;
        });
      }
      return json({ data: { ...pendingOrder, status: "ready_to_ship" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Create order 0" }));
    fireEvent.change(screen.getByLabelText("Already have an order ID?"), {
      target: { value: orderId },
    });
    fireEvent.click(screen.getByRole("button", { name: "View status" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen.getByRole("heading", { name: "Accepted" }),
    ).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(1500));
    expect(orderRequests).toBe(2);
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(orderRequests).toBe(2);

    await act(async () => {
      resolveSlowPoll?.(
        new Response(
          JSON.stringify({
            error: { code: "database_unavailable", message: "offline" },
          }),
          { status: 503 },
        ),
      );
      await Promise.resolve();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "dependency is offline",
    );
    expect(
      screen.getByRole("heading", { name: "Accepted" }),
    ).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(1500));
    expect(
      screen.getByRole("heading", { name: "Ready to ship" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(orderRequests).toBe(3);
    vi.useRealTimers();
  });
});
