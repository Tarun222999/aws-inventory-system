import type { IncomingMessage, ServerResponse } from "node:http";

const maximumBodyBytes = 16 * 1024;

export class InvalidJsonError extends Error {}
export class RequestBodyTooLargeError extends Error {}

export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let receivedBytes = 0;

  for await (const chunk of request as AsyncIterable<unknown>) {
    const buffer =
      typeof chunk === "string"
        ? Buffer.from(chunk)
        : Buffer.from(chunk as Uint8Array);
    receivedBytes += buffer.length;
    if (receivedBytes > maximumBodyBytes) {
      throw new RequestBodyTooLargeError("Request body exceeds 16 KiB");
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new InvalidJsonError("Request body must contain valid JSON");
  }
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  response.writeHead(statusCode, {
    "content-type": "application/json",
    ...headers,
  });
  response.end(JSON.stringify(body));
}
