import { createOrder, listProducts, uploadProductImageBytes } from "./api";
import type { ProductImageUploadGrant } from "./types";

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

  it("uploads image bytes directly to the presigned S3 URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["image-bytes"], "tea.png", { type: "image/png" });
    const grant: ProductImageUploadGrant = {
      objectKey:
        "products/be6c1524-c202-476f-9fa4-667bd56c422f/" +
        "11111111-1111-4111-8111-111111111111.png",
      url: "https://example-bucket.s3.ap-south-1.amazonaws.com/signed",
      expiresInSeconds: 60,
      requiredHeaders: {
        "content-type": "image/png",
        "x-amz-checksum-sha256": "checksum",
        "if-none-match": "*",
      },
    };

    await uploadProductImageBytes(grant, file);

    expect(fetchMock).toHaveBeenCalledWith(grant.url, {
      method: "PUT",
      headers: grant.requiredHeaders,
      body: file,
    });
  });
});
