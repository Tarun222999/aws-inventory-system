import type { IncomingMessage, ServerResponse } from "node:http";
import { setTimeout as wait } from "node:timers/promises";

import { sendJson } from "../../http/json.js";

type OperationalRouteOptions = {
  appVersion: string;
  healthMode: "healthy" | "unhealthy";
  instanceId: string;
  maximumSlowRequestMs: number;
};

function parseDelay(
  value: string | null,
  maximumSlowRequestMs: number,
): number | undefined {
  const rawValue = value ?? "5000";

  if (!/^\d+$/.test(rawValue)) return undefined;

  const delayMs = Number(rawValue);
  if (delayMs < 1 || delayMs > maximumSlowRequestMs) return undefined;

  return delayMs;
}

export async function handleOperationalRoute(
  request: IncomingMessage,
  response: ServerResponse,
  options: OperationalRouteOptions,
): Promise<boolean> {
  if (request.method !== "GET") return false;

  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    const healthy = options.healthMode === "healthy";
    sendJson(response, healthy ? 200 : 503, {
      status: healthy ? "ok" : "unhealthy",
      version: options.appVersion,
    });
    return true;
  }

  if (url.pathname === "/version") {
    sendJson(response, 200, {
      status: "ok",
      version: options.appVersion,
      instance: options.instanceId,
    });
    return true;
  }

  if (url.pathname === "/phase4/slow") {
    const delayMs = parseDelay(
      url.searchParams.get("delayMs"),
      options.maximumSlowRequestMs,
    );

    if (delayMs === undefined) {
      sendJson(response, 400, {
        error: {
          code: "invalid_delay",
          message: `delayMs must be an integer from 1 to ${options.maximumSlowRequestMs}`,
        },
      });
      return true;
    }

    await wait(delayMs);
    sendJson(response, 200, {
      status: "completed",
      version: options.appVersion,
      instance: options.instanceId,
      delayMs,
    });
    return true;
  }

  return false;
}
