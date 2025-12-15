"use client";

import {
  Building2Icon,
  CheckCircleIcon,
  HomeIcon,
  Loader2Icon,
  SparklesIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import type {
  PropertyType,
  WizardBuilding,
  WizardState,
  WizardUnit,
} from "@/app/(dashboard)/properties/new/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

interface StepGeneralProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export function StepGeneral({ state, updateState }: StepGeneralProps) {
  const { data: users } = api.property.getUsers.useQuery();
  const extractFromPdf = api.ai.extractFromPdf.useMutation();

  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "uploaded" | "error"
  >("idle");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!state.declarationFileUrl) return;

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const extractedData = await extractFromPdf.mutateAsync({
        fileUrl: state.declarationFileUrl,
      });

      // Transform extracted data to wizard state format
      const { flattened } = extractedData;
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
          units.push({
            tempId: crypto.randomUUID(),
            buildingTempId: wizardBuilding.tempId,
            unitNumber: unit.unitNumber,
            type: unit.type,
            floor: unit.floor,
            entrance: unit.entrance || "",
            size: unit.size || "",
            coOwnershipShare: unit.coOwnershipShare || "",
            constructionYear: null,
            rooms: unit.rooms || "",
          });
        });
      });

      updateState({
        propertyType: flattened.propertyType,
        propertyName: flattened.propertyName,
        buildings,
        units,
      });
    } catch (error) {
      console.error("AI extraction error:", error);
      setExtractionError(
        "Failed to extract data from PDF. Please fill in the form manually."
      );
    } finally {
      setIsExtracting(false);
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
      description:
        "Wohnungseigentümergemeinschaft - Communities of owners who share responsibility for common areas",
    },
    {
      type: "MV",
      title: "MV Property",
      description:
        "Mietverwaltung - Rental properties managed for landlords, focused on tenant contracts",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Property Type Selection */}
      <div>
        <h2 className="mb-4 font-semibold text-lg">Select Property Type</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {propertyTypes.map((pt) => (
            <button
              className={`group relative flex flex-col items-start rounded-xl border-2 p-6 text-left transition-all hover:border-primary/50 ${
                state.propertyType === pt.type
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
              key={pt.type}
              onClick={() => updateState({ propertyType: pt.type })}
              type="button"
            >
              <div
                className={`mb-4 flex size-12 items-center justify-center rounded-lg ${
                  state.propertyType === pt.type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {pt.type === "WEG" ? (
                  <Building2Icon className="size-6" />
                ) : (
                  <HomeIcon className="size-6" />
                )}
              </div>
              <h3 className="mb-1 font-semibold">{pt.title}</h3>
              <p className="text-muted-foreground text-sm">{pt.description}</p>
              {state.propertyType === pt.type && (
                <div className="absolute top-4 right-4 size-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
          <CardDescription>
            Enter the basic information about this property
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property Name */}
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="propertyName">
              Property Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="propertyName"
              onChange={(e) => updateState({ propertyName: e.target.value })}
              placeholder="e.g., Parkview Residence"
              value={state.propertyName}
            />
          </div>

          {/* Manager & Accountant */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="manager">
                Property Manager
              </label>
              <Select
                onValueChange={(value) => updateState({ managerName: value })}
                value={state.managerName}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="accountant">
                Accountant
              </label>
              <Select
                onValueChange={(value) =>
                  updateState({ accountantName: value })
                }
                value={state.accountantName}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select accountant" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Declaration of Division</CardTitle>
          <CardDescription>
            Upload the Teilungserklärung document (optional). AI can extract
            property data from this document.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            accept=".pdf,application/pdf"
            className="absolute h-0 w-0 opacity-0"
            id="pdf-upload"
            onChange={handleFileUpload}
            ref={fileInputRef}
            type="file"
          />

          {uploadStatus === "idle" ? (
            <label
              className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed p-8 transition-colors hover:border-primary/50 hover:bg-muted/50"
              htmlFor="pdf-upload"
              onClick={(e) => {
                // Fallback: directly click the input if label association fails
                e.preventDefault();
                fileInputRef.current?.click();
              }}
            >
              <UploadIcon className="mb-4 size-10 text-muted-foreground" />
              <p className="mb-2 font-medium text-sm">
                Click to upload or drag and drop
              </p>
              <p className="text-muted-foreground text-xs">
                PDF files only, max 10MB
              </p>
            </label>
          ) : (
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {uploadStatus === "uploading" && (
                  <Loader2Icon className="size-5 animate-spin text-primary" />
                )}
                {uploadStatus === "uploaded" && (
                  <CheckCircleIcon className="size-5 text-green-600" />
                )}
                {uploadStatus === "error" && (
                  <XCircleIcon className="size-5 text-destructive" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{uploadedFileName}</p>
                  <p className="text-muted-foreground text-xs">
                    {uploadStatus === "uploading" && "Uploading..."}
                    {uploadStatus === "uploaded" && "Upload complete"}
                    {uploadStatus === "error" && extractionError}
                  </p>
                </div>
                {uploadStatus === "uploaded" && (
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
                <div className="mt-4 border-t pt-4">
                  <Button
                    className="w-full"
                    disabled={isExtracting}
                    onClick={handleAiExtraction}
                  >
                    {isExtracting ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Extracting data...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="size-4" />
                        Extract Data with AI
                      </>
                    )}
                  </Button>
                  <p className="mt-2 text-center text-muted-foreground text-xs">
                    AI will analyze the document and pre-fill property details
                  </p>
                  {extractionError && (
                    <p className="mt-2 text-center text-destructive text-xs">
                      {extractionError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
