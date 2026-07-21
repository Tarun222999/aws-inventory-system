import { loadApiConfig } from "@order-platform/config";

const config = loadApiConfig();

console.log(
  JSON.stringify({
    level: "info",
    component: "api",
    message: "API configuration validated",
    port: config.API_PORT,
    environment: config.NODE_ENV,
  }),
);

// The HTTP server and lifecycle hooks are added in Step 3.
