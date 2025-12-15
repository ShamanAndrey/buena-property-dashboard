"use client";

import {
  ArrowLeftIcon,
  Building2Icon,
  CheckCircleIcon,
  FileTextIcon,
  HomeIcon,
  KeyIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
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

// Types for wizard state
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
  // Rich extracted document for storage
  extractedDocument: DeclarationOfDivision | null;
  // Additional property fields
  totalLandSize: string;
  landRegistry: string;
  plotInfo: string;
  owner: string;
  energyStandard: string;
  heatingType: string;
}

type EntryMode = "choose" | "manual" | "ai-upload" | "ai-extracting" | "form";

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

export default function NewPropertyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>("choose");
  const [wizardState, setWizardState] = useState<WizardState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "uploaded" | "error"
  >("idle");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: uniqueNames } = api.property.getUniqueNames.useQuery();
  const extractFromPdf = api.ai.extractFromPdf.useMutation();
  const createProperty = api.property.create.useMutation();
  const bulkCreateBuildings = api.building.bulkCreate.useMutation();
  const bulkUpsertUnits = api.unit.bulkUpsert.useMutation();

  // Use previously used names from existing properties for combobox options
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

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadStatus("error");
      setExtractionError("Please upload a PDF file");
      return;
    }

    setUploadStatus("uploading");
    setUploadedFileName(file.name);
    setExtractionError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      updateState({ declarationFileUrl: data.url });
      setUploadStatus("uploaded");
    } catch {
      setUploadStatus("error");
      setExtractionError("Failed to upload file");
    }
  };

  const handleAiExtraction = async () => {
    if (!wizardState.declarationFileUrl) return;

    setMode("ai-extracting");
    setExtractionError(null);

    try {
      const result = await extractFromPdf.mutateAsync({
        fileUrl: wizardState.declarationFileUrl,
      });

      // Use the flattened data for form, store declaration for database
      const { declaration, flattened } = result;

      // Transform flattened data to wizard state format
      const buildings: WizardBuilding[] = flattened.buildings.map((b) => ({
        tempId: crypto.randomUUID(),
        code: b.code,
        street: b.street,
        houseNumber: b.houseNumber,
        postalCode: b.postalCode || "",
        city: b.city || "",
      }));

      const units: WizardUnit[] = [];
      flattened.buildings.forEach((building, buildingIndex) => {
        const wizardBuilding = buildings[buildingIndex];
        if (!wizardBuilding) return;

        building.units.forEach((unit) => {
          // Rooms only applicable for apartment and office
          const hasRooms = unit.type === "apartment" || unit.type === "office";
          units.push({
            tempId: crypto.randomUUID(),
            buildingTempId: wizardBuilding.tempId,
            unitNumber: unit.unitNumber,
            type: unit.type,
            floor: unit.floor,
            entrance: unit.entrance || "",
            size: unit.size || "",
            coOwnershipShare: unit.coOwnershipShare || "",
            constructionYear: unit.yearBuilt,
            rooms: hasRooms ? unit.rooms || "" : "",
          });
        });
      });

      // Transform special rights from declaration
      const specialRights: WizardSpecialRight[] = (
        declaration.specialUseRights || []
      ).map((right) => ({
        tempId: crypto.randomUUID(),
        grantedToUnitNumber: right.grantedToUnitNumber,
        rightType: right.rightType,
        description: right.description,
      }));

      // Transform appointments from declaration
      const appointments: WizardAppointment[] = (
        declaration.appointments || []
      ).map((apt) => ({
        tempId: crypto.randomUUID(),
        role: apt.role,
        organizationName: apt.organizationName,
        durationYears: apt.term?.durationYears || null,
      }));

      setWizardState({
        propertyType: flattened.propertyType,
        propertyName: flattened.propertyName,
        managerName: flattened.managerName || "",
        accountantName: flattened.accountantName || "",
        declarationFileUrl: wizardState.declarationFileUrl,
        buildings,
        units,
        specialRights,
        appointments,
        // Store the rich document
        extractedDocument: declaration,
        // Additional property fields
        totalLandSize: flattened.totalLandSize || "",
        landRegistry: flattened.landRegistry || "",
        plotInfo: flattened.plotInfo || "",
        owner: flattened.owner || "",
        energyStandard: flattened.energyStandard || "",
        heatingType: flattened.heatingType || "",
      });

      setMode("form");
    } catch (error) {
      console.error("AI extraction error:", error);
      setExtractionError(
        "Failed to extract data from PDF. Please try again or use manual entry."
      );
      setMode("ai-upload");
    }
  };

  // Validation helpers
  const unitsWithMissingNumber = wizardState.units.filter(
    (u) => !u.unitNumber.trim()
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
        : undefined;

      // 1. Create the property with all extracted data
      const property = await createProperty.mutateAsync({
        name: wizardState.propertyName,
        type: wizardState.propertyType,
        totalLandSize: wizardState.totalLandSize || undefined,
        landRegistry: wizardState.landRegistry || undefined,
        plotInfo: wizardState.plotInfo || undefined,
        owner: wizardState.owner || undefined,
        energyStandard: wizardState.energyStandard || undefined,
        heatingType: wizardState.heatingType || undefined,
        managerName: wizardState.managerName || undefined,
        accountantName: wizardState.accountantName || undefined,
        extractedDocument: finalExtractedDocument,
        declarationFileUrl: wizardState.declarationFileUrl || undefined,
      });

      if (!property) throw new Error("Failed to create property");

      // 2. Create buildings
      const buildingsData = wizardState.buildings.map((b) => ({
        code: b.code || undefined,
        street: b.street,
        houseNumber: b.houseNumber,
        postalCode: b.postalCode || undefined,
        city: b.city || undefined,
      }));

      const createdBuildings = await bulkCreateBuildings.mutateAsync({
        propertyId: property.id,
        buildings: buildingsData,
      });

      // 3. Create a mapping from tempId to real building id
      const buildingIdMap = new Map<string, number>();
      wizardState.buildings.forEach((b, index) => {
        const createdBuilding = createdBuildings[index];
        if (createdBuilding) {
          buildingIdMap.set(b.tempId, createdBuilding.id);
        }
      });

      // Helper to parse MEA share format (e.g., "110.0/1.000" -> "0.11")
      const parseCoOwnershipShare = (value: string | null): string | null => {
        if (!value) return null;
        // Check if it's a fraction format like "110.0/1.000"
        if (value.includes("/")) {
          const [numerator, denominator] = value.split("/");
          // Parse numerator (e.g., "110.0" or "110,0")
          const num = parseFloat(numerator?.replace(",", ".") || "0");
          // Parse denominator - "1.000" in German means 1000 (period as thousands separator)
          // Remove periods used as thousands separators, then parse
          const denomStr = denominator?.replace(".", "") || "1000";
          const denom = parseFloat(denomStr.replace(",", "."));
          if (denom === 0) return null;
          // Convert to decimal (e.g., 110/1000 = 0.11)
          return (num / denom).toFixed(6);
        }
        // Already a decimal or plain number
        return value.replace(",", ".");
      };

      // 4. Create units with real building IDs
      const unitsToCreate = wizardState.units.map((u) => ({
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
        units: unitsToCreate,
      });

      // Navigate to the new property
      router.push(`/properties/${property.id}`);
    } catch (error) {
      console.error("Failed to create property:", error);
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

  // Mode selection screen
  if (mode === "choose") {
    return (
      <div className="flex min-h-full flex-col">
        <div className="border-b bg-card px-8 py-6">
          <h1 className="font-bold text-2xl tracking-tight">
            Create New Property
          </h1>
          <p className="mt-1 text-muted-foreground">
            Choose how you want to add your property
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center p-8">
          <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
            {/* AI Extraction Option */}
            <button
              className="group relative flex flex-col items-center rounded-2xl border-2 border-border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-lg"
              onClick={() => setMode("ai-upload")}
              type="button"
            >
              <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                <SparklesIcon className="size-10" />
              </div>
              <h2 className="mb-2 font-semibold text-xl">AI-Powered Entry</h2>
              <p className="mb-4 text-muted-foreground text-sm">
                Upload your Teilungserklärung (declaration of division) and let
                AI extract all property details automatically
              </p>
              <div className="flex items-center gap-2 text-primary text-sm">
                <FileTextIcon className="size-4" />
                <span>Supports PDF documents</span>
              </div>
              <div className="absolute top-4 right-4 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
                Recommended
              </div>
            </button>

            {/* Manual Entry Option */}
            <button
              className="group flex flex-col items-center rounded-2xl border-2 border-border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-lg"
              onClick={() => setMode("form")}
              type="button"
            >
              <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <PencilIcon className="size-10" />
              </div>
              <h2 className="mb-2 font-semibold text-xl">Manual Entry</h2>
              <p className="mb-4 text-muted-foreground text-sm">
                Enter property details, buildings, and units manually using our
                spreadsheet-style interface
              </p>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Building2Icon className="size-4" />
                <span>Full control over data entry</span>
              </div>
            </button>
          </div>
        </div>

        <div className="border-t bg-card px-8 py-4">
          <Button onClick={() => router.push("/")} variant="ghost">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // AI Upload screen
  if (mode === "ai-upload") {
    return (
      <div className="flex min-h-full flex-col">
        <div className="border-b bg-card px-8 py-6">
          <button
            className="mb-4 flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
            onClick={() => setMode("choose")}
            type="button"
          >
            <ArrowLeftIcon className="size-4" />
            Back to options
          </button>
          <h1 className="font-bold text-2xl tracking-tight">Upload Document</h1>
          <p className="mt-1 text-muted-foreground">
            Upload your Teilungserklärung to extract property data with AI
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center p-8">
          <Card className="w-full max-w-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white">
                <SparklesIcon className="size-8" />
              </div>
              <CardTitle>AI-Powered Extraction</CardTitle>
              <CardDescription>
                Upload your PDF and we&apos;ll extract buildings, units, and all
                property details automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadStatus === "idle" ? (
                <div className="relative">
                  <input
                    accept=".pdf,application/pdf"
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    id="pdf-upload"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    type="file"
                  />
                  <div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-muted-foreground/25 border-dashed p-10 transition-colors hover:border-primary/50 hover:bg-muted/50">
                    <UploadIcon className="mb-4 size-12 text-muted-foreground" />
                    <p className="mb-2 font-medium">Click to upload</p>
                    <p className="text-muted-foreground text-sm">
                      PDF files only, max 10MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border p-6">
                  <div className="flex items-center gap-4">
                    {uploadStatus === "uploading" && (
                      <Loader2Icon className="size-6 animate-spin text-primary" />
                    )}
                    {uploadStatus === "uploaded" && (
                      <CheckCircleIcon className="size-6 text-green-600" />
                    )}
                    {uploadStatus === "error" && (
                      <XCircleIcon className="size-6 text-destructive" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{uploadedFileName}</p>
                      <p className="text-muted-foreground text-sm">
                        {uploadStatus === "uploading" && "Uploading..."}
                        {uploadStatus === "uploaded" && "Ready to extract"}
                        {uploadStatus === "error" && extractionError}
                      </p>
                    </div>
                    {uploadStatus !== "uploading" && (
                      <Button
                        onClick={() => {
                          setUploadStatus("idle");
                          setUploadedFileName("");
                          updateState({ declarationFileUrl: "" });
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  {uploadStatus === "uploaded" && (
                    <Button
                      className="mt-6 w-full"
                      onClick={handleAiExtraction}
                      size="lg"
                    >
                      <SparklesIcon className="size-5" />
                      Extract Data with AI
                    </Button>
                  )}

                  {extractionError && (
                    <p className="mt-4 text-center text-destructive text-sm">
                      {extractionError}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 text-center">
                <button
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground hover:underline"
                  onClick={() => setMode("form")}
                  type="button"
                >
                  Skip and enter data manually
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // AI Extracting screen
  if (mode === "ai-extracting") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 text-white">
            <Loader2Icon className="size-10 animate-spin" />
          </div>
          <h2 className="mb-2 font-semibold text-xl">Analyzing Document</h2>
          <p className="text-muted-foreground">
            AI is extracting property details from your document...
          </p>
        </div>
      </div>
    );
  }

  // Form screen (after mode selection or AI extraction)
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-card px-8 py-6">
        <button
          className="mb-4 flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
          onClick={() => setMode("choose")}
          type="button"
        >
          <ArrowLeftIcon className="size-4" />
          Back to options
        </button>
        <h1 className="font-bold text-2xl tracking-tight">Property Details</h1>
        <p className="mt-1 text-muted-foreground">
          {wizardState.buildings.length > 0
            ? "Review and edit the extracted data"
            : "Enter property information"}
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
                        specialRights: [...wizardState.specialRights, newRight],
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
                              (r) => r.tempId !== right.tempId
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
                            ? parseInt(e.target.value, 10)
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
                              (a) => a.tempId !== appointment.tempId
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
            <Button onClick={() => router.push("/")} variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Creating..." : "Create Property"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
