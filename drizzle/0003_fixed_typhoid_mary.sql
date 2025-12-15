ALTER TABLE "pg-drizzle_building" ADD COLUMN "code" varchar(10);--> statement-breakpoint
ALTER TABLE "pg-drizzle_property" ADD COLUMN "extracted_document" jsonb;