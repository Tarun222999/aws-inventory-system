import { randomUUID } from "crypto";
import { createSesOrderConfirmedConsumer } from "./ses-order-confirmed-consumer.js";

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const region = process.env.AWS_REGION?.trim() || "ap-south-1";
const emailAddress = requireEnvironmentVariable("SES_LAB_EMAIL");

const consumer = createSesOrderConfirmedConsumer({
  region,
  fromEmailAddress: emailAddress,
  toEmailAddress: emailAddress,
});

const eventId = randomUUID();
const orderId = randomUUID();
const occurredAt = new Date().toISOString();

const messageId = await consumer.handle({
  schemaVersion: 1,
  eventId,
  correlationId: randomUUID(),
  causationId: randomUUID(),
  occurredAt,
  order: {
    id: orderId,
    totalPaise: 12500,
    currency: "INR",
  },
});

console.log("SES test email accepted.");
console.log({
  messageId,
  eventId,
  orderId,
});
