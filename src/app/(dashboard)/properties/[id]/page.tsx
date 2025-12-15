import {
  ArrowLeftIcon,
  Building2Icon,
  CalendarIcon,
  FileTextIcon,
  GlobeIcon,
  HomeIcon,
  KeyIcon,
  LandPlotIcon,
  LeafIcon,
  ThermometerIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyActions } from "@/components/property-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/server";
import type { DeclarationOfDivision } from "@/types/declaration-of-division";

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { id } = await params;
  const propertyId = parseInt(id, 10);

  if (Number.isNaN(propertyId)) {
    notFound();
  }

  const property = await api.property.getById({ id: propertyId });

  // Debug: Check what's in extractedDocument
  console.log(
    "extractedDocument:",
    JSON.stringify(property?.extractedDocument, null, 2)
  );

  if (!property) {
    notFound();
  }

  const totalUnits = property.buildings.reduce(
    (acc, building) => acc + building.units.length,
    0
  );

  // Format MEA share for display
  const formatMEAShare = (share: string | null) => {
    if (!share) return "-";
    const value = parseFloat(share);
    if (Number.isNaN(value)) return share;
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
          href="/"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Properties
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-3xl tracking-tight">
                {property.name}
              </h1>
              <Badge
                variant={property.type === "WEG" ? "default" : "secondary"}
              >
                {property.type}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-muted-foreground text-sm">
              {property.propertyNumber}
            </p>
          </div>
          <PropertyActions
            property={{
              id: property.id,
              name: property.name,
            }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Buildings</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Building2Icon className="size-6 text-muted-foreground" />
              {property.buildings.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Units</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <HomeIcon className="size-6 text-muted-foreground" />
              {totalUnits}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Property Manager</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserIcon className="size-5 text-muted-foreground" />
              <span className="truncate">
                {property.managerName || "Not assigned"}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accountant</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserIcon className="size-5 text-muted-foreground" />
              <span className="truncate">
                {property.accountantName || "Not assigned"}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Property Details */}
      {(property.owner ||
        property.landRegistry ||
        property.totalLandSize ||
        property.energyStandard ||
        property.heatingType) && (
        <div className="mb-8">
          <h2 className="mb-4 font-semibold text-xl">Property Details</h2>
          <Card>
            <CardContent className="grid gap-6 pt-6 md:grid-cols-2 lg:grid-cols-3">
              {property.owner && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <UserIcon className="size-4" />
                    Owner
                  </div>
                  <p className="font-medium">{property.owner}</p>
                </div>
              )}
              {property.landRegistry && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <FileTextIcon className="size-4" />
                    Land Registry
                  </div>
                  <p className="font-medium">{property.landRegistry}</p>
                </div>
              )}
              {property.plotInfo && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <LandPlotIcon className="size-4" />
                    Plot Information
                  </div>
                  <p className="font-medium">{property.plotInfo}</p>
                </div>
              )}
              {property.totalLandSize && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <LandPlotIcon className="size-4" />
                    Total Land Size
                  </div>
                  <p className="font-medium">{property.totalLandSize} m²</p>
                </div>
              )}
              {property.energyStandard && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <LeafIcon className="size-4" />
                    Energy Standard
                  </div>
                  <p className="font-medium">{property.energyStandard}</p>
                </div>
              )}
              {property.heatingType && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <ThermometerIcon className="size-4" />
                    Heating Type
                  </div>
                  <p className="font-medium">{property.heatingType}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Special Use Rights */}
      {(property.extractedDocument as DeclarationOfDivision | null)
        ?.specialUseRights &&
        (property.extractedDocument as DeclarationOfDivision).specialUseRights
          .length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">Special Use Rights</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="divide-y">
                  {(
                    property.extractedDocument as DeclarationOfDivision
                  ).specialUseRights.map((right, index) => (
                    <div
                      className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
                      key={index}
                    >
                      <div className="rounded-lg bg-primary/10 p-2">
                        <KeyIcon className="size-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">
                            {right.rightType.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <Badge variant="outline">
                            Unit {right.grantedToUnitNumber}
                          </Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground text-sm">
                          {right.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Appointments */}
      {(property.extractedDocument as DeclarationOfDivision | null)
        ?.appointments &&
        (property.extractedDocument as DeclarationOfDivision).appointments
          .length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 font-semibold text-xl">Appointments</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {(
                property.extractedDocument as DeclarationOfDivision
              ).appointments.map((appointment, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardDescription className="capitalize">
                      {appointment.role === "propertyManager"
                        ? "Property Manager"
                        : "Accountant"}
                    </CardDescription>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserIcon className="size-5 text-muted-foreground" />
                      {appointment.organizationName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {appointment.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GlobeIcon className="size-4" />
                        <span>
                          {appointment.address.street}{" "}
                          {appointment.address.houseNumber},{" "}
                          {appointment.address.postalCode}{" "}
                          {appointment.address.city}
                        </span>
                      </div>
                    )}
                    {appointment.term && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="size-4" />
                        <span>
                          {appointment.term.durationYears} year term starting{" "}
                          {appointment.term.startsFrom}
                        </span>
                      </div>
                    )}
                    {appointment.authorityNotes && (
                      <p className="mt-2 text-muted-foreground">
                        {appointment.authorityNotes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      {/* Buildings */}
      <div className="space-y-6">
        <h2 className="font-semibold text-xl">Buildings & Units</h2>

        {property.buildings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2Icon className="mb-4 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">No buildings added yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {property.buildings.map((building) => (
              <Card key={building.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2Icon className="size-5 text-primary" />
                        {building.name ||
                          `${building.street} ${building.houseNumber}`}
                        {building.code && (
                          <Badge className="ml-2" variant="outline">
                            {building.code}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {building.street} {building.houseNumber},{" "}
                        {building.postalCode} {building.city}
                      </CardDescription>
                    </div>
                    <div className="flex gap-4 text-muted-foreground text-sm">
                      {building.floors && <span>{building.floors} floors</span>}
                      {building.hasElevator && (
                        <Badge variant="secondary">Elevator</Badge>
                      )}
                      {building.buildingType && (
                        <Badge className="capitalize" variant="outline">
                          {building.buildingType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {building.units.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No units in this building
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">
                              Unit
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Type
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Floor
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Size
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              MEA Share
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Rooms
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {building.units.map((unit) => (
                            <tr
                              className="transition-colors hover:bg-muted/50"
                              key={unit.id}
                            >
                              <td className="px-3 py-2 font-medium">
                                {unit.unitNumber}
                              </td>
                              <td className="px-3 py-2">
                                <Badge className="capitalize" variant="outline">
                                  {unit.type}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">{unit.floor ?? "-"}</td>
                              <td className="px-3 py-2">
                                {unit.size ? `${unit.size} m²` : "-"}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">
                                {formatMEAShare(unit.coOwnershipShare)}
                              </td>
                              <td className="px-3 py-2">
                                {unit.type === "parking" ||
                                unit.type === "garden"
                                  ? "—"
                                  : unit.rooms || "-"}
                              </td>
                              <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">
                                {unit.description || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
