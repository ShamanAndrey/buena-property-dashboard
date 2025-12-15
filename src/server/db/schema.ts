import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { DeclarationOfDivision } from "@/types/declaration-of-division";

// Enums
export const propertyTypeEnum = pgEnum("property_type", ["WEG", "MV"]);
export const unitTypeEnum = pgEnum("unit_type", [
  "apartment",
  "office",
  "garden",
  "parking",
]);
export const buildingTypeEnum = pgEnum("building_type", [
  "residential",
  "commercial",
  "mixed",
]);

export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ]
);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

// ============================================
// Property Management Tables
// ============================================

export const properties = createTable(
  "property",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    propertyNumber: d.varchar({ length: 50 }).notNull().unique(),
    name: d.varchar({ length: 256 }).notNull(),
    type: propertyTypeEnum("type").notNull(),
    // New fields from Teilungserklärung
    totalLandSize: d.varchar({ length: 50 }), // e.g., "2,450 m²"
    landRegistry: d.varchar({ length: 256 }), // e.g., "Berlin-Mitte, Blatt 12345"
    plotInfo: d.text(), // e.g., "Gemarkung Berlin-Mitte, Flur 12, Flurstück 456/78"
    owner: d.varchar({ length: 256 }), // e.g., "Urban Future Development GmbH"
    energyStandard: d.varchar({ length: 50 }), // e.g., "KfW 40"
    heatingType: d.varchar({ length: 100 }), // e.g., "Fernwärme"
    // Manager and Accountant - text fields for names (from AI or user input)
    managerName: d.varchar({ length: 256 }), // e.g., "ImmoGuard Berlin GmbH"
    accountantName: d.varchar({ length: 256 }), // e.g., "FinanzExpertise Müller & Co KG"
    // Legacy user reference fields (optional, for linking to system users)
    managerId: d.varchar({ length: 255 }).references(() => user.id),
    accountantId: d.varchar({ length: 255 }).references(() => user.id),
    // Full extracted document (JSON) for audit and rich data access
    extractedDocument:
      jsonb("extracted_document").$type<DeclarationOfDivision>(),
    declarationFileUrl: d.text(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("property_number_idx").on(t.propertyNumber),
    index("property_type_idx").on(t.type),
    index("property_created_by_idx").on(t.createdById),
  ]
);

export const buildings = createTable(
  "building",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    propertyId: d
      .integer()
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    // New fields from Teilungserklärung
    code: d.varchar({ length: 10 }), // e.g., "A", "B", "TG"
    name: d.varchar({ length: 256 }), // e.g., "Haus A - Parkside"
    yearBuilt: integer("year_built"), // e.g., 2023
    floors: integer("floors"), // e.g., 5
    hasElevator: boolean("has_elevator"), // e.g., true
    buildingType: buildingTypeEnum("building_type"), // residential, commercial, mixed
    // Existing fields
    street: d.varchar({ length: 256 }).notNull(),
    houseNumber: d.varchar({ length: 50 }).notNull(),
    postalCode: d.varchar({ length: 20 }),
    city: d.varchar({ length: 100 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [index("building_property_idx").on(t.propertyId)]
);

export const units = createTable(
  "unit",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    buildingId: d
      .integer()
      .notNull()
      .references(() => buildings.id, { onDelete: "cascade" }),
    unitNumber: d.varchar({ length: 50 }).notNull(),
    type: unitTypeEnum("type").notNull(),
    floor: d.integer(),
    entrance: d.varchar({ length: 50 }),
    size: numeric("size", { precision: 10, scale: 2 }),
    coOwnershipShare: numeric("co_ownership_share", {
      precision: 10,
      scale: 6,
    }),
    constructionYear: d.integer(),
    rooms: numeric("rooms", { precision: 4, scale: 1 }),
    // New field from Teilungserklärung
    description: d.text(), // e.g., "Erdgeschosswohnung links gelegen, inklusive Terrasse"
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("unit_building_idx").on(t.buildingId),
    index("unit_type_idx").on(t.type),
  ]
);

// ============================================
// Property Relations
// ============================================

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  manager: one(user, {
    fields: [properties.managerId],
    references: [user.id],
    relationName: "propertyManager",
  }),
  accountant: one(user, {
    fields: [properties.accountantId],
    references: [user.id],
    relationName: "propertyAccountant",
  }),
  createdBy: one(user, {
    fields: [properties.createdById],
    references: [user.id],
    relationName: "propertyCreator",
  }),
  buildings: many(buildings),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  property: one(properties, {
    fields: [buildings.propertyId],
    references: [properties.id],
  }),
  units: many(units),
}));

export const unitsRelations = relations(units, ({ one }) => ({
  building: one(buildings, {
    fields: [units.buildingId],
    references: [buildings.id],
  }),
}));
