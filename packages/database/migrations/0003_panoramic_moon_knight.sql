CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"content_type" varchar(32) NOT NULL,
	"checksum_sha256" varchar(44) NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_content_type_supported" CHECK ("product_images"."content_type" in ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "product_images_byte_size_positive" CHECK ("product_images"."byte_size" > 0)
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_product_id_unique" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_object_key_unique" ON "product_images" USING btree ("object_key");