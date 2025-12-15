import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { units } from "@/server/db/schema";

const unitSchema = z.object({
	unitNumber: z.string().min(1, "Unit number is required"),
	type: z.enum(["apartment", "office", "garden", "parking"]),
	floor: z.number().optional().nullable(),
	entrance: z.string().optional().nullable(),
	size: z.string().optional().nullable(), // Stored as string for decimal
	coOwnershipShare: z.string().optional().nullable(), // Stored as string for decimal
	constructionYear: z.number().optional().nullable(),
	rooms: z.string().optional().nullable(), // Stored as string for decimal
});

const unitCreateSchema = unitSchema.extend({
	buildingId: z.number(),
});

const unitWithIdSchema = unitSchema.extend({
	id: z.number().optional(), // Optional for new units
	buildingId: z.number(),
});

export const unitRouter = createTRPCRouter({
	// Get units for a building
	getByBuilding: publicProcedure
		.input(z.object({ buildingId: z.number() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.query.units.findMany({
				where: eq(units.buildingId, input.buildingId),
				orderBy: units.unitNumber,
			});

			return result;
		}),

	// Create a single unit
	create: publicProcedure
		.input(unitCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const [newUnit] = await ctx.db
				.insert(units)
				.values({
					buildingId: input.buildingId,
					unitNumber: input.unitNumber,
					type: input.type,
					floor: input.floor,
					entrance: input.entrance,
					size: input.size,
					coOwnershipShare: input.coOwnershipShare,
					constructionYear: input.constructionYear,
					rooms: input.rooms,
				})
				.returning();

			return newUnit;
		}),

	// Delete a unit
	delete: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(units).where(eq(units.id, input.id));
			return { success: true };
		}),

	// Bulk upsert units (for spreadsheet saves)
	// This handles creating new units and updating existing ones efficiently
	bulkUpsert: publicProcedure
		.input(
			z.object({
				units: z.array(unitWithIdSchema),
				deletedIds: z.array(z.number()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const results: Array<typeof units.$inferSelect> = [];

			// Delete removed units
			if (input.deletedIds && input.deletedIds.length > 0) {
				await ctx.db.delete(units).where(inArray(units.id, input.deletedIds));
			}

			// Separate new and existing units
			const newUnits = input.units.filter((u) => !u.id);
			const existingUnits = input.units.filter((u) => u.id);

			// Insert new units
			if (newUnits.length > 0) {
				const inserted = await ctx.db
					.insert(units)
					.values(
						newUnits.map((u) => ({
							buildingId: u.buildingId,
							unitNumber: u.unitNumber,
							type: u.type,
							floor: u.floor,
							entrance: u.entrance,
							size: u.size,
							coOwnershipShare: u.coOwnershipShare,
							constructionYear: u.constructionYear,
							rooms: u.rooms,
						})),
					)
					.returning();
				results.push(...inserted);
			}

			// Update existing units one by one (batch update with different values is complex)
			for (const unit of existingUnits) {
				const [updated] = await ctx.db
					.update(units)
					.set({
						buildingId: unit.buildingId,
						unitNumber: unit.unitNumber,
						type: unit.type,
						floor: unit.floor,
						entrance: unit.entrance,
						size: unit.size,
						coOwnershipShare: unit.coOwnershipShare,
						constructionYear: unit.constructionYear,
						rooms: unit.rooms,
					})
					.where(eq(units.id, unit.id as number))
					.returning();
				if (updated) {
					results.push(updated);
				}
			}

			return results;
		}),

	// Bulk create units for initial import
	bulkCreate: publicProcedure
		.input(
			z.object({
				buildingId: z.number(),
				units: z.array(unitSchema),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.units.length === 0) {
				return [];
			}

			const newUnits = await ctx.db
				.insert(units)
				.values(
					input.units.map((u) => ({
						buildingId: input.buildingId,
						unitNumber: u.unitNumber,
						type: u.type,
						floor: u.floor,
						entrance: u.entrance,
						size: u.size,
						coOwnershipShare: u.coOwnershipShare,
						constructionYear: u.constructionYear,
						rooms: u.rooms,
					})),
				)
				.returning();

			return newUnits;
		}),
});
