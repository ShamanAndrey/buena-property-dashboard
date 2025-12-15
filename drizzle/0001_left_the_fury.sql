CREATE TYPE "public"."building_type" AS ENUM('residential', 'commercial', 'mixed');--> statement-breakpoint
ALTER TABLE "pg-drizzle_building" ADD COLUMN "name" varchar(256);--> statement-breakpoint
ALTER TABLE "pg-drizzle_building" ADD COLUMN "year_built" integer;--> statement-breakpoint
ALTER TABLE "pg-drizzle_building" ADD COLUMN "floors" integer;--> statement-breakpoint
ALTER TABLE "pg-drizzle_building" ADD COLUMN "has_elevator" boolean;--> statement-breakpoint
ALTER TABLE "pg-drizzle_building" ADD COLUMN "building_type" "building_type";--> statement-breakpoint
ALTER TABLE "pg-drizzle_property" ADD COLUMN "totalLandSize" varchar(50);--> statement-breakpoint
ALTER TABLE "pg-drizzle_property" ADD COLUMN "landRegistry" varchar(256);--> statement-breakpoint
ALTER TABLE "pg-drizzle_property" ADD COLUMN "plotInfo" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_property" ADD COLUMN "owner" varchar(256);--> statement-breakpoint
ALTER TABLE "pg-drizzle_property" ADD COLUMN "energyStandard" varchar(50);--> statement-breakpoint
ALTER TABLE "pg-drizzle_property" ADD COLUMN "heatingType" varchar(100);--> statement-breakpoint
ALTER TABLE "pg-drizzle_unit" ADD COLUMN "description" text;