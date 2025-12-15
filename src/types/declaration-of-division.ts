// ============================================
// Declaration of Division (Teilungserklärung) Types
// Based on German WEG (Wohnungseigentumsgesetz)
// ============================================

// ---- Common helpers ----
export type ISODate = string; // e.g. "2024-03-15"
export type UUID = string;

export type Address = {
	street: string;
	houseNumber: string;
	postalCode: string;
	city: string;
	country?: string; // default "DE"
};

export type Area = {
	value: number; // 2450
	unit: "m2";
};

export type Fraction = {
	numerator: number; // 110
	denominator: number; // 1000
};

export type DocumentParty = {
	legalName: string; // "Urban Future Development GmbH"
	registeredOffice?: string; // "Berlin"
	address?: Address;
};

// ---- Core document ----
export type DeclarationOfDivision = {
	id: UUID;

	// Document header / notarial record
	deedRecordNumber: string; // "URKUNDENROLLE NR. 2024/05-B"
	executedAt: ISODate; // "2024-03-15"
	executedCity: string; // "Berlin"
	title: string; // "Teilungserklärung"
	legalBasis: {
		lawName: "WEG";
		section: string; // "§ 8"
	};

	// §1 Land register + ownership
	owner: DocumentParty;

	landRegister: {
		landRegisterOffice: string; // "Grundbuch von Berlin-Mitte"
		sheetNumber: string; // "Blatt 12345"
		cadastralArea: {
			district: string; // "Berlin-Mitte"
			plot: string; // "Flur 12"
			parcel: string; // "Flurstück 456/78"
		};
		propertyArea: Area; // 2450 m2
	};

	project: {
		name: string; // "Parkview Residences Berlin"
		internalObjectNumber: string; // "10.557PRB"
		adminModel: "WEG" | "MV"; // condominium association model
	};

	// §2 Buildings
	site: {
		buildingComplex: {
			connectedBy?: string; // "undergroundGarage"
			energyStandard?: string; // "KfW 40"
			heating?: string; // "district heating" / "Fernwärme"
		};
		buildings: Building[];
	};

	// §3 Units
	ownershipSharesTotal: number; // 1000 (MEA total)
	units: Unit[];

	// §4 Special rights of use
	specialUseRights: SpecialUseRight[];

	// §5 Appointments
	appointments: Appointment[];

	// §6 Final provisions
	finalProvisions: {
		bindingOnFutureOwners: boolean;
		amendmentsRequireNotarialForm: boolean;
		amendmentsRequireConsentOfAffectedOwners: boolean;
		notes?: string;
	};

	// Source file provenance
	source: {
		fileName: string;
		pageCount?: number;
		language: "de" | "en";
	};
};

// ---- Buildings ----
export type Building = {
	code: string; // "A" / "B" / "TG" (Tiefgarage)
	name: string; // "Parkside" / "Cityside"
	address: Address;
	completionYear?: number; // 2023
	floors: {
		minLevelLabel: string; // "Erdgeschoss" / "Untergeschoss"
		maxLevelLabel: string; // "4 Obergeschoss/Staffelgeschoss"
		floorCount: number; // 5 for A, 4 for B
	};
	elevator: {
		hasElevator: boolean;
		stepFreeAccessAllFloors?: boolean;
	};
	usageCategory: "residential" | "commercial" | "mixedUse" | "parking";
	notes?: string;
};

// ---- Units ----
export type UnitUsageType = "apartment" | "office" | "parking" | "garden";

export type Unit = {
	unitNumber: string; // "01".."14"
	usageType: UnitUsageType;

	ownershipShareMEA: Fraction; // e.g. {numerator:110, denominator:1000}

	buildingRef:
		| { kind: "building"; code: string }
		| { kind: "undergroundGarage" }
		| { kind: "outdoorArea"; buildingCode: string };

	location: {
		levelLabel: string; // "Erdgeschoss", "1 Obergeschoss", "Untergeschoss"
		floorNumber?: number; // 0, 1, -1, etc.
		entrance?: string; // "A" / "B"
		accessNote?: string; // e.g. "separate entrance"
	};

	area: {
		value: number;
		unit: "m2";
		areaType: "residential" | "usable"; // Wohnfläche vs Nutzfläche
	};

	rooms?: number | null; // apartments: 2-4; office/parking/garden: null
	constructionYear?: number; // 2023

	description?: string;

	// Useful for parking mapping like TG-01 <-> unit 09
	externalLabel?: string; // "TG-01"
};

// ---- Special use rights (Sondernutzungsrechte) ----
export type SpecialUseRight = {
	grantedToUnitNumber: string; // "01"
	rightType: "terrace" | "roofTerrace" | "garden" | "parkingSpace" | "other";
	description: string; // "exclusive use of adjacent terrace area"
};

// ---- Appointments (§5) ----
export type Appointment = {
	role: "propertyManager" | "accountant";
	organizationName: string; // "ImmoGuard Berlin GmbH"
	address?: Address;
	term?: {
		durationYears: number; // 3
		startsFrom: string; // "registration of first priority notice"
	};
	authorityNotes?: string; // e.g. "representation in/out of court"
};

// ============================================
// Helper functions for working with fractions
// ============================================

export function fractionToDecimal(fraction: Fraction): number {
	return fraction.numerator / fraction.denominator;
}

export function fractionToPercentage(fraction: Fraction): number {
	return (fraction.numerator / fraction.denominator) * 100;
}

export function fractionToString(fraction: Fraction): string {
	return `${fraction.numerator}/${fraction.denominator}`;
}

export function parseFractionFromMEAString(meaString: string): Fraction | null {
	// Parse formats like "110.0/1.000" or "110/1000"
	const match = meaString.match(/^([\d.,]+)\s*\/\s*([\d.,]+)$/);
	if (!match?.[1] || !match[2]) return null;

	const numerator = parseFloat(match[1].replace(",", "."));
	// Handle German notation where "1.000" means 1000
	const denomStr = match[2].replace(".", "").replace(",", ".");
	const denominator = parseFloat(denomStr);

	if (Number.isNaN(numerator) || Number.isNaN(denominator)) return null;

	return { numerator, denominator };
}
