import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { buildings } from "@/server/db/schema";

const buildingSchema = z.object({
  code: z.string().optional(), // e.g., "A", "B", "TG"
  street: z.string().min(1, "Street is required"),
  houseNumber: z.string().min(1, "House number is required"),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});

const buildingCreateSchema = buildingSchema.extend({
  propertyId: z.number(),
});

const buildingUpdateSchema = buildingSchema.partial().extend({
  id: z.number(),
});

export const buildingRouter = createTRPCRouter({
  // Get buildings for a property
  getByProperty: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.buildings.findMany({
        where: eq(buildings.propertyId, input.propertyId),
        with: {
          units: true,
        },
        orderBy: buildings.createdAt,
      });

      return result;
    }),

  // Create a single building
  create: publicProcedure
    .input(buildingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [newBuilding] = await ctx.db
        .insert(buildings)
        .values({
          propertyId: input.propertyId,
          code: input.code,
          street: input.street,
          houseNumber: input.houseNumber,
          postalCode: input.postalCode,
          city: input.city,
        })
        .returning();

      return newBuilding;
    }),

  // Update a building
  update: publicProcedure
    .input(buildingUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [updatedBuilding] = await ctx.db
        .update(buildings)
        .set(data)
        .where(eq(buildings.id, id))
        .returning();

      return updatedBuilding;
    }),

  // Delete a building (cascades to units)
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(buildings).where(eq(buildings.id, input.id));
      return { success: true };
    }),

  // Bulk create buildings for a property
  bulkCreate: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        buildings: z.array(buildingSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.buildings.length === 0) {
        return [];
      }

      const newBuildings = await ctx.db
        .insert(buildings)
        .values(
          input.buildings.map((b) => ({
            propertyId: input.propertyId,
            code: b.code,
            street: b.street,
            houseNumber: b.houseNumber,
            postalCode: b.postalCode,
            city: b.city,
          }))
        )
        .returning();

      return newBuildings;
    }),

  // Bulk upsert buildings (for edit page)
  bulkUpsert: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        buildings: z.array(
          buildingSchema.extend({
            id: z.number().optional(),
          })
        ),
        deletedIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results: Array<typeof buildings.$inferSelect> = [];

      // Delete removed buildings
      if (input.deletedIds && input.deletedIds.length > 0) {
        await ctx.db
          .delete(buildings)
          .where(inArray(buildings.id, input.deletedIds));
      }

      // Separate new and existing buildings
      const newBuildings = input.buildings.filter((b) => !b.id);
      const existingBuildings = input.buildings.filter((b) => b.id);

      // Insert new buildings
      if (newBuildings.length > 0) {
        const inserted = await ctx.db
          .insert(buildings)
          .values(
            newBuildings.map((b) => ({
              propertyId: input.propertyId,
              code: b.code,
              street: b.street,
              houseNumber: b.houseNumber,
              postalCode: b.postalCode,
              city: b.city,
            }))
          )
          .returning();
        results.push(...inserted);
      }

      // Update existing buildings
      for (const building of existingBuildings) {
        const [updated] = await ctx.db
          .update(buildings)
          .set({
            code: building.code,
            street: building.street,
            houseNumber: building.houseNumber,
            postalCode: building.postalCode,
            city: building.city,
          })
          .where(eq(buildings.id, building.id as number))
          .returning();
        if (updated) {
          results.push(updated);
        }
      }

      return results;
    }),
});
