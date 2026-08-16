import {
  maximumProductImageBytes,
  sha256Checksum,
  validateProductImage,
} from "./product-image";

describe("product image", () => {
  it("creates the base64 SHA-256 checksum from the file bytes", async () => {
    const bytes = new TextEncoder().encode("abc");
    const file = {
      name: "demo.png",
      type: "image/png",
      size: bytes.length,
      arrayBuffer: () =>
        Promise.resolve(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
        ),
    } as File;

    await expect(sha256Checksum(file)).resolves.toBe(
      "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=",
    );
  });

  it("rejects unsupported and oversized files before product creation", () => {
    expect(() =>
      validateProductImage(
        new File(["gif"], "demo.gif", { type: "image/gif" }),
      ),
    ).toThrow(/JPEG, PNG, or WebP/);

    expect(() =>
      validateProductImage({
        type: "image/png",
        size: maximumProductImageBytes + 1,
      } as File),
    ).toThrow(/5 MiB/);
  });
});
