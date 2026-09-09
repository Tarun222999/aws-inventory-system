import { z } from "zod";

export const ORDER_EVENT_SOURCE = "com.order-platform.orders" as const;
export const ORDER_CONFIRMED_DETAIL_TYPE = "OrderConfirmed" as const;
export const ORDER_CONFIRMED_SCHEMA_VERSION = 1 as const;

export const orderConfirmedDetailV1Schema = z
  .object({
    schemaVersion: z.literal(ORDER_CONFIRMED_SCHEMA_VERSION),
    eventId: z.string().uuid(),
    correlationId: z.string().uuid(),
    causationId: z.string().uuid(),
    occurredAt: z.string().datetime({ offset: true }),
    order: z.object({
      id: z.string().uuid(),
      totalPaise: z.number().int().nonnegative(),
      currency: z.literal("INR"),
    }),
  })
  .passthrough();

export type OrderConfirmedDetailV1 = z.infer<
  typeof orderConfirmedDetailV1Schema
>;

export const orderConfirmedPublicationV1Schema = z
  .object({
    source: z.literal(ORDER_EVENT_SOURCE),
    detailType: z.literal(ORDER_CONFIRMED_DETAIL_TYPE),
    time: z.date(),
    detail: orderConfirmedDetailV1Schema,
  })
  .strict()
  .superRefine((publication, context) => {
    const occurredAt = Date.parse(publication.detail.occurredAt);

    if (publication.time.getTime() !== occurredAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["time"],
        message: "Publication time must equal detail.occurredAt",
      });
    }
  });

export type OrderConfirmedPublicationV1 = z.infer<
  typeof orderConfirmedPublicationV1Schema
>;

export function createOrderConfirmedPublicationV1(
  detail: unknown,
): OrderConfirmedPublicationV1 {
  const parsedDetail = orderConfirmedDetailV1Schema.parse(detail);

  return orderConfirmedPublicationV1Schema.parse({
    source: ORDER_EVENT_SOURCE,
    detailType: ORDER_CONFIRMED_DETAIL_TYPE,
    time: new Date(parsedDetail.occurredAt),
    detail: parsedDetail,
  });
}
