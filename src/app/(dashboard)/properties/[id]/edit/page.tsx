"use client";

import {
	ArrowLeftIcon,
	Building2Icon,
	HomeIcon,
	Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { StepBuildings } from "@/components/wizard/step-buildings";
import { StepUnits } from "@/components/wizard/step-units";
import { api } from "@/trpc/react";
import type { DeclarationOfDivision } from "@/types/declaration-of-division";

// Types for wizard state (same as new page)
export type PropertyType = "WEG" | "MV";
export type UnitType = "apartment" | "office" | "garden" | "parking";

export interface WizardBuilding {
	id?: number;
	tempId: string;
	code: string;
	street: string;
	houseNumber: string;
	postalCode: string;
	city: string;
}

export interface WizardUnit {
	id?: number;
	tempId: string;
	buildingTempId: string;
	unitNumber: string;
	type: UnitType;
	floor: number | null;
	entrance: string;
	size: string;
	coOwnershipShare: string;
	constructionYear: number | null;
	rooms: string;
}

export interface WizardState {
	propertyType: PropertyType | null;
	propertyName: string;
	managerName: string;
	accountantName: string;
	declarationFileUrl: string;
	buildings: WizardBuilding[];
	units: WizardUnit[];
	extractedDocument: DeclarationOfDivision | null;
	totalLandSize: string;
	landRegistry: string;
	plotInfo: string;
	owner: string;
	energyStandard: string;
	heatingType: string;
}

const initialState: WizardState = {
	propertyType: null,
	propertyName: "",
	managerName: "",
	accountantName: "",
	declarationFileUrl: "",
	buildings: [],
	units: [],
	extractedDocument: null,
	totalLandSize: "",
	landRegistry: "",
	plotInfo: "",
	owner: "",
	energyStandard: "",
	heatingType: "",
};

export default function EditPropertyPage() {
	const router = useRouter();
	const params = useParams();
	const propertyId = Number(params.id);

	const [wizardState, setWizardState] = useState<WizardState>(initialState);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [originalBuildingIds, setOriginalBuildingIds] = useState<number[]>([]);
	const [originalUnitIds, setOriginalUnitIds] = useState<number[]>([]);

	// Fetch property data
	const { data: property, isLoading: isPropertyLoading } =
		api.property.getById.useQuery(
			{ id: propertyId },
			{ enabled: !Number.isNaN(propertyId) },
		);

	const { data: uniqueNames } = api.property.getUniqueNames.useQuery();
	const updateProperty = api.property.update.useMutation();
	const bulkUpsertBuildings = api.building.bulkUpsert.useMutation();
	const bulkUpsertUnits = api.unit.bulkUpsert.useMutation();

	// Use previously used names for combobox options
	const managerOptions =
		uniqueNames?.managerNames.map((name) => ({
			value: name,
			label: name,
		})) || [];

	const accountantOptions =
		uniqueNames?.accountantNames.map((name) => ({
			value: name,
			label: name,
		})) || [];

	// Populate wizard state from property data
	useEffect(() => {
		if (property && isLoading) {
			// Create a mapping from building ID to tempId
			const buildingIdToTempId = new Map<number, string>();
			const buildings: WizardBuilding[] = property.buildings.map((b) => {
				const tempId = crypto.randomUUID();
				buildingIdToTempId.set(b.id, tempId);
				return {
					id: b.id,
					tempId,
					code: b.code || "",
					street: b.street,
					houseNumber: b.houseNumber,
					postalCode: b.postalCode || "",
					city: b.city || "",
				};
			});

			const units: WizardUnit[] = [];
			property.buildings.forEach((building) => {
				const buildingTempId = buildingIdToTempId.get(building.id) || "";
				building.units.forEach((unit) => {
					units.push({
						id: unit.id,
						tempId: crypto.randomUUID(),
						buildingTempId,
						unitNumber: unit.unitNumber,
						type: unit.type as UnitType,
						floor: unit.floor,
						entrance: unit.entrance || "",
						size: unit.size || "",
						coOwnershipShare: unit.coOwnershipShare || "",
						constructionYear: unit.constructionYear,
						rooms: unit.rooms || "",
					});
				});
			});

			// Store original IDs for detecting deletions
			setOriginalBuildingIds(property.buildings.map((b) => b.id));
			setOriginalUnitIds(
				property.buildings.flatMap((b) => b.units.map((u) => u.id)),
			);

			setWizardState({
				propertyType: property.type as PropertyType,
				propertyName: property.name,
				managerName: property.managerName || "",
				accountantName: property.accountantName || "",
				declarationFileUrl: property.declarationFileUrl || "",
				buildings,
				units,
				extractedDocument:
					(property.extractedDocument as DeclarationOfDivision) || null,
				totalLandSize: property.totalLandSize || "",
				landRegistry: property.landRegistry || "",
				plotInfo: property.plotInfo || "",
				owner: property.owner || "",
				energyStandard: property.energyStandard || "",
				heatingType: property.heatingType || "",
			});

			setIsLoading(false);
		}
	}, [property, isLoading]);

	const updateState = useCallback((updates: Partial<WizardState>) => {
		setWizardState((prev) => ({ ...prev, ...updates }));
	}, []);

	// Validation helpers
	const unitsWithMissingNumber = wizardState.units.filter(
		(u) => !u.unitNumber.trim(),
	);
	const hasAllUnitNumbers = unitsWithMissingNumber.length === 0;

	const canSubmit =
		wizardState.propertyType !== null &&
		wizardState.propertyName.trim() !== "" &&
		wizardState.buildings.length > 0 &&
		wizardState.units.length > 0 &&
		hasAllUnitNumbers;

	const handleSubmit = async () => {
		if (!wizardState.propertyType) return;

		setIsSubmitting(true);

		try {
			// 1. Update the property
			await updateProperty.mutateAsync({
				id: propertyId,
				name: wizardState.propertyName,
				type: wizardState.propertyType,
				totalLandSize: wizardState.totalLandSize || null,
				landRegistry: wizardState.landRegistry || null,
				plotInfo: wizardState.plotInfo || null,
				owner: wizardState.owner || null,
				energyStandard: wizardState.energyStandard || null,
				heatingType: wizardState.heatingType || null,
				managerName: wizardState.managerName || null,
				accountantName: wizardState.accountantName || null,
				extractedDocument: wizardState.extractedDocument || null,
				declarationFileUrl: wizardState.declarationFileUrl || null,
			});

			// 2. Find deleted building IDs
			const currentBuildingIds = wizardState.buildings
				.filter((b) => b.id)
				.map((b) => b.id as number);
			const deletedBuildingIds = originalBuildingIds.filter(
				(id) => !currentBuildingIds.includes(id),
			);

			// 3. Upsert buildings
			const buildingsData = wizardState.buildings.map((b) => ({
				id: b.id,
				code: b.code || undefined,
				street: b.street,
				houseNumber: b.houseNumber,
				postalCode: b.postalCode || undefined,
				city: b.city || undefined,
			}));

			const upsertedBuildings = await bulkUpsertBuildings.mutateAsync({
				propertyId,
				buildings: buildingsData,
				deletedIds: deletedBuildingIds,
			});

			// 4. Create a mapping from tempId to real building id
			const buildingIdMap = new Map<string, number>();

			// First, map existing buildings (those with IDs)
			wizardState.buildings.forEach((b) => {
				if (b.id) {
					buildingIdMap.set(b.tempId, b.id);
				}
			});

			// Then, map new buildings (match by order of those without IDs)
			const newBuildingsInState = wizardState.buildings.filter((b) => !b.id);
			const newBuildingsFromDb = upsertedBuildings.filter(
				(b) => !originalBuildingIds.includes(b.id),
			);
			newBuildingsInState.forEach((b, index) => {
				const dbBuilding = newBuildingsFromDb[index];
				if (dbBuilding) {
					buildingIdMap.set(b.tempId, dbBuilding.id);
				}
			});

			// Helper to parse MEA share format
			const parseCoOwnershipShare = (value: string | null): string | null => {
				if (!value) return null;
				if (value.includes("/")) {
					const [numerator, denominator] = value.split("/");
					const num = Number.parseFloat(numerator?.replace(",", ".") || "0");
					const denomStr = denominator?.replace(".", "") || "1000";
					const denom = Number.parseFloat(denomStr.replace(",", "."));
					if (denom === 0) return null;
					return (num / denom).toFixed(6);
				}
				return value.replace(",", ".");
			};

			// 5. Find deleted unit IDs
			const currentUnitIds = wizardState.units
				.filter((u) => u.id)
				.map((u) => u.id as number);
			const deletedUnitIds = originalUnitIds.filter(
				(id) => !currentUnitIds.includes(id),
			);

			// 6. Upsert units with real building IDs
			const unitsToUpsert = wizardState.units.map((u) => ({
				id: u.id,
				buildingId: buildingIdMap.get(u.buildingTempId) ?? 0,
				unitNumber: u.unitNumber,
				type: u.type,
				floor: u.floor,
				entrance: u.entrance || null,
				size: u.size || null,
				coOwnershipShare: parseCoOwnershipShare(u.coOwnershipShare),
				constructionYear: u.constructionYear,
				rooms: u.rooms || null,
			}));

			await bulkUpsertUnits.mutateAsync({
				units: unitsToUpsert,
				deletedIds: deletedUnitIds,
			});

			// Navigate back to the property
			router.push(`/properties/${propertyId}`);
		} catch (error) {
			console.error("Failed to update property:", error);
			setIsSubmitting(false);
		}
	};

	const propertyTypes: {
		type: PropertyType;
		title: string;
		description: string;
	}[] = [
		{
			type: "WEG",
			title: "WEG Property",
			description: "Communities of owners sharing common areas",
		},
		{
			type: "MV",
			title: "MV Property",
			description: "Rental properties managed for landlords",
		},
	];

	// Loading state
	if (isPropertyLoading || isLoading) {
		return (
			<div className="flex min-h-full items-center justify-center">
				<div className="text-center">
					<Loader2Icon className="mx-auto size-8 animate-spin text-primary" />
					<p className="mt-2 text-muted-foreground">Loading property...</p>
				</div>
			</div>
		);
	}

	// Not found state
	if (!property) {
		return (
			<div className="flex min-h-full flex-col items-center justify-center">
				<h1 className="font-semibold text-xl">Property not found</h1>
				<p className="mt-2 text-muted-foreground">
					The property you&apos;re looking for doesn&apos;t exist.
				</p>
				<Button asChild className="mt-4">
					<Link href="/">Go back</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex min-h-full flex-col">
			<div className="border-b bg-card px-8 py-6">
				<Link
					className="mb-4 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
					href={`/properties/${propertyId}`}
				>
					<ArrowLeftIcon className="size-4" />
					Back to Property
				</Link>
				<h1 className="font-bold text-2xl tracking-tight">Edit Property</h1>
				<p className="mt-1 text-muted-foreground">
					Update property information, buildings, and units
				</p>
			</div>

			<div className="flex-1 overflow-y-auto p-8 pb-24">
				<div className="mx-auto max-w-5xl space-y-8">
					{/* General Info */}
					<div className="space-y-6">
						{/* Property Type Selection */}
						<div>
							<label className="mb-3 block font-medium text-sm">
								Property Type <span className="text-destructive">*</span>
							</label>
							<div className="grid gap-4 sm:grid-cols-2">
								{propertyTypes.map((pt) => (
									<button
										className={`group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-primary/50 ${
											wizardState.propertyType === pt.type
												? "border-primary bg-primary/5"
												: "border-border"
										}`}
										key={pt.type}
										onClick={() => updateState({ propertyType: pt.type })}
										type="button"
									>
										<div
											className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
												wizardState.propertyType === pt.type
													? "bg-primary text-primary-foreground"
													: "bg-muted text-muted-foreground"
											}`}
										>
											{pt.type === "WEG" ? (
												<Building2Icon className="size-5" />
											) : (
												<HomeIcon className="size-5" />
											)}
										</div>
										<div>
											<h3 className="font-medium">{pt.title}</h3>
											<p className="text-muted-foreground text-sm">
												{pt.description}
											</p>
										</div>
										{wizardState.propertyType === pt.type && (
											<div className="absolute top-3 right-3 size-2 rounded-full bg-primary" />
										)}
									</button>
								))}
							</div>
						</div>

						{/* Property Name & Manager/Accountant in one row */}
						<div className="grid gap-6 sm:grid-cols-3">
							<div className="space-y-2">
								<label className="font-medium text-sm" htmlFor="propertyName">
									Property Name <span className="text-destructive">*</span>
								</label>
								<Input
									id="propertyName"
									onChange={(e) =>
										updateState({ propertyName: e.target.value })
									}
									placeholder="e.g., Parkview Residence"
									value={wizardState.propertyName}
								/>
							</div>

							<div className="space-y-2">
								<label className="font-medium text-sm">Property Manager</label>
								<Combobox
									emptyText="No previous managers found"
									onChange={(value) => updateState({ managerName: value })}
									options={managerOptions}
									placeholder="Type or select manager..."
									value={wizardState.managerName}
								/>
							</div>

							<div className="space-y-2">
								<label className="font-medium text-sm">Accountant</label>
								<Combobox
									emptyText="No previous accountants found"
									onChange={(value) => updateState({ accountantName: value })}
									options={accountantOptions}
									placeholder="Type or select accountant..."
									value={wizardState.accountantName}
								/>
							</div>
						</div>

						{/* Special Use Rights (from AI extraction) */}
						{wizardState.extractedDocument?.specialUseRights &&
							wizardState.extractedDocument.specialUseRights.length > 0 && (
								<div className="space-y-4">
									<h3 className="font-medium text-sm">
										Special Use Rights (Sondernutzungsrechte)
									</h3>
									<div className="space-y-3 rounded-lg border p-4">
										{wizardState.extractedDocument.specialUseRights.map(
											(right, index) => (
												<div
													className="flex items-start gap-3 text-sm"
													key={index}
												>
													<span className="rounded bg-primary/10 px-2 py-1 font-medium text-xs">
														Unit {right.grantedToUnitNumber}
													</span>
													<span className="text-muted-foreground capitalize">
														{right.rightType.replace(/([A-Z])/g, " $1").trim()}:
													</span>
													<span className="flex-1">{right.description}</span>
												</div>
											),
										)}
									</div>
								</div>
							)}

						{/* Appointments (from AI extraction) */}
						{wizardState.extractedDocument?.appointments &&
							wizardState.extractedDocument.appointments.length > 0 && (
								<div className="space-y-4">
									<h3 className="font-medium text-sm">
										Appointments (Erstbestellung)
									</h3>
									<div className="grid gap-4 sm:grid-cols-2">
										{wizardState.extractedDocument.appointments.map(
											(appointment, index) => (
												<div className="rounded-lg border p-4" key={index}>
													<p className="text-muted-foreground text-xs capitalize">
														{appointment.role === "propertyManager"
															? "Property Manager"
															: "Accountant"}
													</p>
													<p className="font-medium">
														{appointment.organizationName}
													</p>
													{appointment.term && (
														<p className="text-muted-foreground text-sm">
															{appointment.term.durationYears} year term
														</p>
													)}
												</div>
											),
										)}
									</div>
								</div>
							)}
					</div>

					{/* Buildings */}
					<StepBuildings state={wizardState} updateState={updateState} />

					{/* Units */}
					<StepUnits state={wizardState} updateState={updateState} />
				</div>
			</div>

			<div className="sticky bottom-0 z-20 border-t bg-card px-8 py-4">
				<div className="flex items-center justify-between">
					<div className="text-muted-foreground text-sm">
						{!wizardState.propertyType && "Select a property type"}
						{wizardState.propertyType &&
							!wizardState.propertyName.trim() &&
							"Enter property name"}
						{wizardState.propertyType &&
							wizardState.propertyName.trim() &&
							wizardState.buildings.length === 0 &&
							"Add at least one building"}
						{wizardState.propertyType &&
							wizardState.propertyName.trim() &&
							wizardState.buildings.length > 0 &&
							wizardState.units.length === 0 &&
							"Add at least one unit"}
						{wizardState.propertyType &&
							wizardState.propertyName.trim() &&
							wizardState.buildings.length > 0 &&
							wizardState.units.length > 0 &&
							!hasAllUnitNumbers &&
							`${unitsWithMissingNumber.length} unit${
								unitsWithMissingNumber.length > 1 ? "s" : ""
							} missing unit number`}
					</div>
					<div className="flex gap-3">
						<Button asChild variant="ghost">
							<Link href={`/properties/${propertyId}`}>Cancel</Link>
						</Button>
						<Button
							disabled={!canSubmit || isSubmitting}
							onClick={handleSubmit}
						>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

