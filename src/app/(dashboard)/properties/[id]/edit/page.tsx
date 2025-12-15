"use client";

import {
	ArrowLeftIcon,
	Building2Icon,
	HomeIcon,
	KeyIcon,
	Loader2Icon,
	PlusIcon,
	Trash2Icon,
	UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StepBuildings } from "@/components/wizard/step-buildings";
import { StepUnits } from "@/components/wizard/step-units";
import { api } from "@/trpc/react";
import type { DeclarationOfDivision } from "@/types/declaration-of-division";

// Types for wizard state (same as new page)
export type PropertyType = "WEG" | "MV";
export type UnitType = "apartment" | "office" | "garden" | "parking";
export type SpecialRightType =
	| "terrace"
	| "roofTerrace"
	| "garden"
	| "parkingSpace"
	| "other";
export type AppointmentRole = "propertyManager" | "accountant";

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

export interface WizardSpecialRight {
	tempId: string;
	grantedToUnitNumber: string;
	rightType: SpecialRightType;
	description: string;
}

export interface WizardAppointment {
	tempId: string;
	role: AppointmentRole;
	organizationName: string;
	durationYears: number | null;
}

export interface WizardState {
	propertyType: PropertyType | null;
	propertyName: string;
	managerName: string;
	accountantName: string;
	declarationFileUrl: string;
	buildings: WizardBuilding[];
	units: WizardUnit[];
	specialRights: WizardSpecialRight[];
	appointments: WizardAppointment[];
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
	specialRights: [],
	appointments: [],
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

		// Extract special rights from the stored document
		const extractedDoc = property.extractedDocument as DeclarationOfDivision | null;
		const specialRights: WizardSpecialRight[] = (
			extractedDoc?.specialUseRights || []
		).map((right) => ({
			tempId: crypto.randomUUID(),
			grantedToUnitNumber: right.grantedToUnitNumber,
			rightType: right.rightType as SpecialRightType,
			description: right.description,
		}));

		// Extract appointments from the stored document
		const appointments: WizardAppointment[] = (
			extractedDoc?.appointments || []
		).map((apt) => ({
			tempId: crypto.randomUUID(),
			role: apt.role as AppointmentRole,
			organizationName: apt.organizationName,
			durationYears: apt.term?.durationYears || null,
		}));

		setWizardState({
			propertyType: property.type as PropertyType,
			propertyName: property.name,
			managerName: property.managerName || "",
			accountantName: property.accountantName || "",
			declarationFileUrl: property.declarationFileUrl || "",
			buildings,
			units,
			specialRights,
			appointments,
			extractedDocument: extractedDoc,
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
			// Build the extracted document with updated special rights and appointments
			const finalExtractedDocument = wizardState.extractedDocument
				? {
						...wizardState.extractedDocument,
						specialUseRights: wizardState.specialRights.map((r) => ({
							grantedToUnitNumber: r.grantedToUnitNumber,
							rightType: r.rightType,
							description: r.description,
						})),
						appointments: wizardState.appointments.map((a) => ({
							role: a.role,
							organizationName: a.organizationName,
							term: a.durationYears
								? { durationYears: a.durationYears, startsFrom: "" }
								: undefined,
						})),
					}
				: wizardState.specialRights.length > 0 ||
					  wizardState.appointments.length > 0
					? {
							id: crypto.randomUUID(),
							specialUseRights: wizardState.specialRights.map((r) => ({
								grantedToUnitNumber: r.grantedToUnitNumber,
								rightType: r.rightType,
								description: r.description,
							})),
							appointments: wizardState.appointments.map((a) => ({
								role: a.role,
								organizationName: a.organizationName,
								term: a.durationYears
									? { durationYears: a.durationYears, startsFrom: "" }
									: undefined,
							})),
						}
					: null;

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
				extractedDocument: finalExtractedDocument,
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

						{/* Special Use Rights */}
						<Card>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<KeyIcon className="size-4 text-primary" />
										<CardTitle className="text-base">
											Special Use Rights
										</CardTitle>
									</div>
									<Button
										onClick={() => {
											const newRight: WizardSpecialRight = {
												tempId: crypto.randomUUID(),
												grantedToUnitNumber: "",
												rightType: "terrace",
												description: "",
											};
											updateState({
												specialRights: [
													...wizardState.specialRights,
													newRight,
												],
											});
										}}
										size="sm"
										type="button"
										variant="outline"
									>
										<PlusIcon className="size-4" />
										Add
									</Button>
								</div>
								<CardDescription>
									Sondernutzungsrechte - exclusive usage rights for units
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{wizardState.specialRights.length > 0 ? (
									wizardState.specialRights.map((right, index) => (
										<div
											className="group flex items-center gap-2 rounded-md border bg-muted/30 p-2"
											key={right.tempId}
										>
											<Input
												className="h-8 w-20 text-center"
												onChange={(e) => {
													const updated = [...wizardState.specialRights];
													updated[index] = {
														...right,
														grantedToUnitNumber: e.target.value,
													};
													updateState({ specialRights: updated });
												}}
												placeholder="Unit"
												value={right.grantedToUnitNumber}
											/>
											<Select
												onValueChange={(value: SpecialRightType) => {
													const updated = [...wizardState.specialRights];
													updated[index] = { ...right, rightType: value };
													updateState({ specialRights: updated });
												}}
												value={right.rightType}
											>
												<SelectTrigger className="h-8 w-[130px]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="terrace">Terrace</SelectItem>
													<SelectItem value="roofTerrace">
														Roof Terrace
													</SelectItem>
													<SelectItem value="garden">Garden</SelectItem>
													<SelectItem value="parkingSpace">Parking</SelectItem>
													<SelectItem value="other">Other</SelectItem>
												</SelectContent>
											</Select>
											<Input
												className="h-8 flex-1"
												onChange={(e) => {
													const updated = [...wizardState.specialRights];
													updated[index] = {
														...right,
														description: e.target.value,
													};
													updateState({ specialRights: updated });
												}}
												placeholder="Description..."
												value={right.description}
											/>
											<Button
												className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
												onClick={() => {
													updateState({
														specialRights: wizardState.specialRights.filter(
															(r) => r.tempId !== right.tempId,
														),
													});
												}}
												size="icon"
												type="button"
												variant="ghost"
											>
												<Trash2Icon className="size-4 text-muted-foreground hover:text-destructive" />
											</Button>
										</div>
									))
								) : (
									<p className="py-4 text-center text-muted-foreground text-sm">
										No special use rights. Click "Add" to define one.
									</p>
								)}
							</CardContent>
						</Card>

						{/* Appointments */}
						<Card>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<UserIcon className="size-4 text-primary" />
										<CardTitle className="text-base">Appointments</CardTitle>
									</div>
									<Button
										onClick={() => {
											const newAppointment: WizardAppointment = {
												tempId: crypto.randomUUID(),
												role: "propertyManager",
												organizationName: "",
												durationYears: 3,
											};
											updateState({
												appointments: [
													...wizardState.appointments,
													newAppointment,
												],
											});
										}}
										size="sm"
										type="button"
										variant="outline"
									>
										<PlusIcon className="size-4" />
										Add
									</Button>
								</div>
								<CardDescription>
									Erstbestellung - property manager and accountant
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{wizardState.appointments.length > 0 ? (
									wizardState.appointments.map((appointment, index) => (
										<div
											className="group flex items-center gap-2 rounded-md border bg-muted/30 p-2"
											key={appointment.tempId}
										>
											<Select
												onValueChange={(value: AppointmentRole) => {
													const updated = [...wizardState.appointments];
													updated[index] = { ...appointment, role: value };
													updateState({ appointments: updated });
												}}
												value={appointment.role}
											>
												<SelectTrigger className="h-8 w-[150px]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="propertyManager">
														Property Manager
													</SelectItem>
													<SelectItem value="accountant">Accountant</SelectItem>
												</SelectContent>
											</Select>
											<Input
												className="h-8 flex-1"
												onChange={(e) => {
													const updated = [...wizardState.appointments];
													updated[index] = {
														...appointment,
														organizationName: e.target.value,
													};
													updateState({ appointments: updated });
												}}
												placeholder="Organization name..."
												value={appointment.organizationName}
											/>
											<Input
												className="h-8 w-20 text-center"
												onChange={(e) => {
													const updated = [...wizardState.appointments];
													const value = e.target.value
														? Number.parseInt(e.target.value, 10)
														: null;
													updated[index] = {
														...appointment,
														durationYears: Number.isNaN(value) ? null : value,
													};
													updateState({ appointments: updated });
												}}
												placeholder="Years"
												type="number"
												value={appointment.durationYears ?? ""}
											/>
											<span className="text-muted-foreground text-xs">yrs</span>
											<Button
												className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
												onClick={() => {
													updateState({
														appointments: wizardState.appointments.filter(
															(a) => a.tempId !== appointment.tempId,
														),
													});
												}}
												size="icon"
												type="button"
												variant="ghost"
											>
												<Trash2Icon className="size-4 text-muted-foreground hover:text-destructive" />
											</Button>
										</div>
									))
								) : (
									<p className="py-4 text-center text-muted-foreground text-sm">
										No appointments. Click "Add" to define one.
									</p>
								)}
							</CardContent>
						</Card>
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

