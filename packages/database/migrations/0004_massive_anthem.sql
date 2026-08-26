CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'publishing', 'published');--> statement-breakpoint
CREATE TABLE "outbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"message_type" varchar(100) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"publish_attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp (3) with time zone,
	"locked_by" varchar(200),
	"published_at" timestamp (3) with time zone,
	"last_error" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_messages_publish_attempts_non_negative" CHECK ("outbox_messages"."publish_attempts" >= 0),
	CONSTRAINT "outbox_messages_type_not_blank" CHECK (length(trim("outbox_messages"."message_type")) > 0),
	CONSTRAINT "outbox_messages_lock_fields_together" CHECK (("outbox_messages"."locked_at" is null) = ("outbox_messages"."locked_by" is null))
);
--> statement-breakpoint
ALTER TABLE "outbox_messages" ADD CONSTRAINT "outbox_messages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_messages" ADD CONSTRAINT "outbox_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_messages_claim_index" ON "outbox_messages" USING btree ("status","available_at","created_at");--> statement-breakpoint
CREATE INDEX "outbox_messages_order_id_index" ON "outbox_messages" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_messages_job_type_unique" ON "outbox_messages" USING btree ("job_id","message_type");