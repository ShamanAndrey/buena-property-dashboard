import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { properties, user } from "@/server/db/schema";

const propertyCreateSchema = z.object({
  name: z.string().min(1, "Property name is required"),
  type: z.enum(["WEG", "MV"]),
  // Property details
  totalLandSize: z.string().optional(),
  landRegistry: z.string().optional(),
  plotInfo: z.string().optional(),
  owner: z.string().optional(),
  energyStandard: z.string().optional(),
  heatingType: z.string().optional(),
  // Manager and Accountant
  managerName: z.string().optional(),
  accountantName: z.string().optional(),
  // Files
  declarationFileUrl: z.string().optional(),
  // Full extracted document (JSON)
  extractedDocument: z.any().optional(),
});

const propertyUpdateSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  type: z.enum(["WEG", "MV"]).optional(),
  totalLandSize: z.string().optional().nullable(),
  landRegistry: z.string().optional().nullable(),
  plotInfo: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  energyStandard: z.string().optional().nullable(),
  heatingType: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
  accountantName: z.string().optional().nullable(),
  extractedDocument: z.any().optional().nullable(),
  declarationFileUrl: z.string().optional().nullable(),
});

export const propertyRouter = createTRPCRouter({
  // List all properties with building and unit counts
  list: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        id: properties.id,
        propertyNumber: properties.propertyNumber,
        name: properties.name,
        type: properties.type,
        managerName: properties.managerName,
        accountantName: properties.accountantName,
        createdAt: properties.createdAt,
        buildingCount: sql<number>`(
					SELECT COUNT(*)::int FROM "pg-drizzle_building" b 
					WHERE b."propertyId" = "pg-drizzle_property".id
				)`,
        unitCount: sql<number>`(
					SELECT COUNT(*)::int FROM "pg-drizzle_unit" u 
					INNER JOIN "pg-drizzle_building" b ON u."buildingId" = b.id
					WHERE b."propertyId" = "pg-drizzle_property".id
				)`,
      })
      .from(properties)
      .orderBy(properties.createdAt);

    return result;
  }),

  // Get a single property with all related data
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const property = await ctx.db.query.properties.findFirst({
        where: eq(properties.id, input.id),
        with: {
          manager: true,
          accountant: true,
          buildings: {
            with: {
              units: true,
            },
          },
        },
      });

      return property ?? null;
    }),

  // Create a new property with full details
  create: publicProcedure
    .input(propertyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate a unique property number
      const propertyNumber = `PROP-${Date.now().toString(36).toUpperCase()}`;

      // Use the session user ID if available, or create a demo user
      let creatorId = ctx.session?.user?.id;

      if (!creatorId) {
        // Check if demo user exists, create if not
        const [demoUser] = await ctx.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, "demo@buena.com"))
          .limit(1);

        if (demoUser) {
          creatorId = demoUser.id;
        } else {
          // Create demo user
          const [newDemoUser] = await ctx.db
            .insert(user)
            .values({
              id: "demo-user-001",
              name: "Demo User",
              email: "demo@buena.com",
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          creatorId = newDemoUser?.id ?? "demo-user-001";
        }
      }

      const [newProperty] = await ctx.db
        .insert(properties)
        .values({
          propertyNumber,
          name: input.name,
          type: input.type,
          totalLandSize: input.totalLandSize,
          landRegistry: input.landRegistry,
          plotInfo: input.plotInfo,
          owner: input.owner,
          energyStandard: input.energyStandard,
          heatingType: input.heatingType,
          managerName: input.managerName,
          accountantName: input.accountantName,
          extractedDocument: input.extractedDocument,
          declarationFileUrl: input.declarationFileUrl,
          createdById: creatorId,
        })
        .returning();

      return newProperty;
    }),

  // Update an existing property
  update: publicProcedure
    .input(propertyUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Filter out undefined values
      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      const [updatedProperty] = await ctx.db
        .update(properties)
        .set(updateData)
        .where(eq(properties.id, id))
        .returning();

      return updatedProperty;
    }),

  // Delete a property (cascades to buildings and units)
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(properties).where(eq(properties.id, input.id));
      return { success: true };
    }),

  // Get all users for manager/accountant dropdowns
  getUsers: publicProcedure.query(async ({ ctx }) => {
    const users = await ctx.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .orderBy(user.name);

    return users;
  }),

  // Get unique manager and accountant names from existing properties
  getUniqueNames: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        managerName: properties.managerName,
        accountantName: properties.accountantName,
      })
      .from(properties);

    // Extract unique non-null names
    const managerNames = [
      ...new Set(
        result
          .map((r) => r.managerName)
          .filter((name): name is string => !!name && name.trim() !== "")
      ),
    ].sort();

    const accountantNames = [
      ...new Set(
        result
          .map((r) => r.accountantName)
          .filter((name): name is string => !!name && name.trim() !== "")
      ),
    ].sort();

    return { managerNames, accountantNames };
  }),
});
