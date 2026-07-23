import { createOrder, listProducts } from "./api";

describe("API client", () => {
  it("sends the opaque product cursor without inspecting it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          pagination: { limit: 12, nextCursor: null },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await listProducts("opaque+/cursor=");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/products?limit=12&cursor=opaque%2B%2Fcursor%3D",
      expect.any(Object),
    );
  });

  it("preserves intentional conflict details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "insufficient_stock", message: "Not enough" },
          }),
          { status: 409 },
        ),
      ),
    );
    await expect(
      createOrder([
        { productId: "be6c1524-c202-476f-9fa4-667bd56c422f", quantity: 2 },
      ]),
    ).rejects.toMatchObject({
      status: 409,
      code: "insufficient_stock",
      message: "Not enough",
    });
  });

  it("distinguishes an unreachable API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(listProducts()).rejects.toMatchObject({
      status: 0,
      code: "network_unavailable",
    });
  });
});
