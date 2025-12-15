import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { extractText } from "unpdf";
import { z } from "zod";
import type { DeclarationOfDivision } from "@/types/declaration-of-division";

// ============================================
// Zod Schemas matching DeclarationOfDivision types
// ============================================

const addressSchema = z.object({
	street: z.string(),
	houseNumber: z.string(),
	postalCode: z.string(),
	city: z.string(),
	country: z.string().optional().default("DE"),
});

const areaSchema = z.object({
	value: z.number(),
	unit: z.literal("m2"),
});

const fractionSchema = z.object({
	numerator: z.number(),
	denominator: z.number(),
});

const documentPartySchema = z.object({
	legalName: z.string(),
	registeredOffice: z.string().optional(),
	address: addressSchema.optional(),
});

const buildingSchema = z.object({
	code: z
		.string()
		.describe("Building code like 'A', 'B', or 'TG' for Tiefgarage"),
	name: z.string().describe("Building name like 'Parkside' or 'Cityside'"),
	address: addressSchema,
	completionYear: z.number().optional(),
	floors: z.object({
		minLevelLabel: z
			.string()
			.describe("Lowest floor label, e.g. 'Erdgeschoss' or 'Untergeschoss'"),
		maxLevelLabel: z
			.string()
			.describe("Highest floor label, e.g. '4 Obergeschoss'"),
		floorCount: z.number().describe("Total number of floors"),
	}),
	elevator: z.object({
		hasElevator: z.boolean(),
		stepFreeAccessAllFloors: z.boolean().optional(),
	}),
	usageCategory: z.enum(["residential", "commercial", "mixedUse", "parking"]),
	notes: z.string().optional(),
});

const unitSchema = z.object({
	unitNumber: z.string().describe("Unit identifier like '01', '02', etc."),
	usageType: z.enum(["apartment", "office", "parking", "garden"]),
	ownershipShareMEA: fractionSchema.describe(
		"Co-ownership share as fraction, e.g. {numerator: 110, denominator: 1000}",
	),
	buildingRef: z.discriminatedUnion("kind", [
		z.object({ kind: z.literal("building"), code: z.string() }),
		z.object({ kind: z.literal("undergroundGarage") }),
		z.object({ kind: z.literal("outdoorArea"), buildingCode: z.string() }),
	]),
	location: z.object({
		levelLabel: z
			.string()
			.describe("Floor description like 'Erdgeschoss', '1 Obergeschoss'"),
		floorNumber: z
			.number()
			.optional()
			.describe("Numeric floor: 0 for ground, -1 for basement, etc."),
		entrance: z
			.string()
			.optional()
			.describe("Entrance identifier like 'A' or 'B'"),
		accessNote: z.string().optional(),
	}),
	area: z.object({
		value: z.number(),
		unit: z.literal("m2"),
		areaType: z
			.enum(["residential", "usable"])
			.describe("Wohnfläche = residential, Nutzfläche = usable"),
	}),
	rooms: z
		.number()
		.nullable()
		.optional()
		.describe("Number of rooms (null for parking/garden)"),
	constructionYear: z.number().optional(),
	description: z.string().optional(),
	externalLabel: z
		.string()
		.optional()
		.describe("External label like 'TG-01' for parking"),
});

const specialUseRightSchema = z.object({
	grantedToUnitNumber: z.string(),
	rightType: z.enum([
		"terrace",
		"roofTerrace",
		"garden",
		"parkingSpace",
		"other",
	]),
	description: z.string(),
});

const appointmentSchema = z.object({
	role: z.enum(["propertyManager", "accountant"]),
	organizationName: z.string(),
	address: addressSchema.optional(),
	term: z
		.object({
			durationYears: z.number(),
			startsFrom: z.string(),
		})
		.optional(),
	authorityNotes: z.string().optional(),
});

const declarationOfDivisionSchema = z.object({
	id: z.string().describe("Generate a UUID for this document"),

	// Document header
	deedRecordNumber: z
		.string()
		.describe("Notarial deed number, e.g. 'URKUNDENROLLE NR. 2024/05-B'"),
	executedAt: z
		.string()
		.describe("Execution date in ISO format, e.g. '2024-03-15'"),
	executedCity: z.string().describe("City where document was executed"),
	title: z.string().default("Teilungserklärung"),
	legalBasis: z.object({
		lawName: z.literal("WEG"),
		section: z.string().describe("Legal section, e.g. '§ 8'"),
	}),

	// §1 Land register + ownership
	owner: documentPartySchema,

	landRegister: z.object({
		landRegisterOffice: z
			.string()
			.describe("e.g. 'Grundbuch von Berlin-Mitte'"),
		sheetNumber: z.string().describe("e.g. 'Blatt 12345'"),
		cadastralArea: z.object({
			district: z.string().describe("Gemarkung"),
			plot: z.string().describe("Flur"),
			parcel: z.string().describe("Flurstück"),
		}),
		propertyArea: areaSchema,
	}),

	project: z.object({
		name: z.string().describe("Project/property name"),
		internalObjectNumber: z.string().describe("Internal object number"),
		adminModel: z
			.enum(["WEG", "MV"])
			.describe("Administration model: WEG for condominium, MV for rental"),
	}),

	// §2 Buildings
	site: z.object({
		buildingComplex: z.object({
			connectedBy: z.string().optional(),
			energyStandard: z.string().optional(),
			heating: z.string().optional(),
		}),
		buildings: z.array(buildingSchema),
	}),

	// §3 Units
	ownershipSharesTotal: z
		.number()
		.default(1000)
		.describe("Total MEA shares, typically 1000"),
	units: z.array(unitSchema).describe("All units in the property"),

	// §4 Special rights (Sondernutzungsrechte)
	specialUseRights: z
		.array(specialUseRightSchema)
		.default([])
		.describe(
			"Special use rights like terrace, roof terrace, or garden rights",
		),

	// §5 Appointments (Verwaltung und Buchhaltung)
	appointments: z
		.array(appointmentSchema)
		.default([])
		.describe("Property manager and accountant appointments"),

	// §6 Final provisions
	finalProvisions: z
		.object({
			bindingOnFutureOwners: z.boolean().default(true),
			amendmentsRequireNotarialForm: z.boolean().default(true),
			amendmentsRequireConsentOfAffectedOwners: z.boolean().default(true),
			notes: z.string().optional(),
		})
		.default({}),

	// Source
	source: z
		.object({
			fileName: z.string(),
			pageCount: z.number().optional(),
			language: z.enum(["de", "en"]).default("de"),
		})
		.default({ fileName: "unknown.pdf", language: "de" }),
});

export type ExtractedDeclaration = z.infer<typeof declarationOfDivisionSchema>;

// ============================================
// AI Extraction Function
// ============================================

export async function extractDeclarationFromPdf(
	pdfText: string,
	fileName: string,
): Promise<DeclarationOfDivision> {
	const { object } = await generateObject({
		model: openai("gpt-5.1"),
		schema: declarationOfDivisionSchema,
		prompt: `You are an expert at extracting property data from German property documents (Teilungserklärung).

Analyze the following document text and extract ALL information into the structured format.

IMPORTANT: Extract ALL sections completely:

## §1 Land Register & Ownership
- Extract owner (Eigentümer), land registry (Grundbuch), plot info (Flurstück)

## §2 Buildings  
- Extract all buildings with addresses, floors, elevators
- Building usage: residential, mixedUse, commercial, or parking

## §3 Units (Einheiten)
- Extract EVERY unit with its:
  - Unit number, type (apartment/office/parking/garden)
  - MEA share as fraction: "110.0/1.000" → {numerator: 110, denominator: 1000}
  - Building reference: {kind: "building", code: "A"} or {kind: "undergroundGarage"}
  - Size, rooms, floor, entrance

## §4 Special Use Rights (Sondernutzungsrechte)
- Extract terrace rights, roof terrace rights, garden rights
- Format: {grantedToUnitNumber: "01", rightType: "terrace", description: "..."}

## §5 Appointments (Erstbestellung)
- Extract property manager (WEG-Verwalter): name, address, term
- Extract accountant (Buchhaltung): name, address, term
- Format: {role: "propertyManager", organizationName: "...", term: {durationYears: 3, startsFrom: "..."}}

## §6 Final Provisions
- bindingOnFutureOwners: usually true
- amendmentsRequireNotarialForm: usually true
- amendmentsRequireConsentOfAffectedOwners: usually true

Generate a UUID for the document id.
Parse dates to ISO format (YYYY-MM-DD).

Source file name: ${fileName}

Document text:
${pdfText}`,
	});

	return object as DeclarationOfDivision;
}

// ============================================
// PDF Text Extraction
// ============================================

export async function extractTextFromPdf(
	pdfBuffer: ArrayBuffer,
): Promise<string> {
	const { text } = await extractText(pdfBuffer, { mergePages: true });
	return text;
}

// ============================================
// Legacy type for backwards compatibility
// Used when mapping to flattened database tables
// ============================================

export type FlattenedPropertyData = {
	propertyName: string;
	propertyType: "WEG" | "MV";
	objectNumber: string | null;
	totalLandSize: string | null;
	landRegistry: string | null;
	plotInfo: string | null;
	owner: string | null;
	energyStandard: string | null;
	heatingType: string | null;
	managerName: string | null;
	accountantName: string | null;
	// Special use rights
	specialUseRights: {
		grantedToUnitNumber: string;
		rightType: string;
		description: string;
	}[];
	// Appointments with terms
	appointments: {
		role: string;
		organizationName: string;
		durationYears: number | null;
	}[];
	buildings: {
		name: string | null;
		code: string;
		street: string;
		houseNumber: string;
		postalCode: string | null;
		city: string | null;
		yearBuilt: number | null;
		floors: number | null;
		hasElevator: boolean | null;
		buildingType: "residential" | "commercial" | "mixed" | null;
		units: {
			unitNumber: string;
			type: "apartment" | "office" | "garden" | "parking";
			floor: number | null;
			entrance: string | null;
			size: string | null;
			coOwnershipShare: string | null;
			rooms: string | null;
			yearBuilt: number | null;
			description: string | null;
		}[];
	}[];
};

/**
 * Convert the rich DeclarationOfDivision to flattened format for database storage
 */
export function flattenDeclaration(
	declaration: DeclarationOfDivision,
): FlattenedPropertyData {
	// Find manager and accountant
	const manager = declaration.appointments.find(
		(a) => a.role === "propertyManager",
	);
	const accountant = declaration.appointments.find(
		(a) => a.role === "accountant",
	);

	// Map buildings
	const buildings = declaration.site.buildings.map((building) => {
		// Find units for this building
		const buildingUnits = declaration.units.filter((unit) => {
			if (unit.buildingRef.kind === "building") {
				return unit.buildingRef.code === building.code;
			}
			if (unit.buildingRef.kind === "outdoorArea") {
				return unit.buildingRef.buildingCode === building.code;
			}
			// Underground garage units go to the first building for simplicity
			if (unit.buildingRef.kind === "undergroundGarage") {
				return building.usageCategory === "parking";
			}
			return false;
		});

		return {
			name: building.name,
			code: building.code,
			street: building.address.street,
			houseNumber: building.address.houseNumber,
			postalCode: building.address.postalCode,
			city: building.address.city,
			yearBuilt: building.completionYear ?? null,
			floors: building.floors.floorCount,
			hasElevator: building.elevator.hasElevator,
			buildingType:
				building.usageCategory === "mixedUse"
					? ("mixed" as const)
					: building.usageCategory === "parking"
						? null
						: (building.usageCategory as "residential" | "commercial"),
			units: buildingUnits.map((unit) => ({
				unitNumber: unit.unitNumber,
				type: unit.usageType,
				floor: unit.location.floorNumber ?? null,
				entrance: unit.location.entrance ?? null,
				size: unit.area.value.toString(),
				coOwnershipShare: (
					unit.ownershipShareMEA.numerator / unit.ownershipShareMEA.denominator
				).toFixed(6),
				rooms: unit.rooms?.toString() ?? null,
				yearBuilt: unit.constructionYear ?? null,
				description: unit.description ?? null,
			})),
		};
	});

	// Handle units that belong to underground garage but have no parking building
	const unassignedParkingUnits = declaration.units.filter(
		(unit) =>
			unit.buildingRef.kind === "undergroundGarage" &&
			!declaration.site.buildings.some((b) => b.usageCategory === "parking"),
	);

	if (unassignedParkingUnits.length > 0 && buildings.length > 0) {
		// Add to the first building
		buildings[0]?.units.push(
			...unassignedParkingUnits.map((unit) => ({
				unitNumber: unit.unitNumber,
				type: unit.usageType,
				floor: unit.location.floorNumber ?? null,
				entrance: unit.location.entrance ?? null,
				size: unit.area.value.toString(),
				coOwnershipShare: (
					unit.ownershipShareMEA.numerator / unit.ownershipShareMEA.denominator
				).toFixed(6),
				rooms: null,
				yearBuilt: unit.constructionYear ?? null,
				description: unit.description ?? null,
			})),
		);
	}

	return {
		propertyName: declaration.project.name,
		propertyType: declaration.project.adminModel,
		objectNumber: declaration.project.internalObjectNumber,
		totalLandSize: declaration.landRegister.propertyArea.value.toString(),
		landRegistry: `${declaration.landRegister.landRegisterOffice}, ${declaration.landRegister.sheetNumber}`,
		plotInfo: `${declaration.landRegister.cadastralArea.district}, ${declaration.landRegister.cadastralArea.plot}, ${declaration.landRegister.cadastralArea.parcel}`,
		owner: declaration.owner.legalName,
		energyStandard: declaration.site.buildingComplex.energyStandard ?? null,
		heatingType: declaration.site.buildingComplex.heating ?? null,
		managerName: manager?.organizationName ?? null,
		accountantName: accountant?.organizationName ?? null,
		// Include special use rights
		specialUseRights: declaration.specialUseRights.map((right) => ({
			grantedToUnitNumber: right.grantedToUnitNumber,
			rightType: right.rightType,
			description: right.description,
		})),
		// Include appointments with terms
		appointments: declaration.appointments.map((appointment) => ({
			role: appointment.role,
			organizationName: appointment.organizationName,
			durationYears: appointment.term?.durationYears ?? null,
		})),
		buildings,
	};
}
