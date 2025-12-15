import {
  AlertTriangleIcon,
  ArrowRightIcon,
  Building2Icon,
  CalendarIcon,
  GaugeIcon,
  HomeIcon,
  LeafIcon,
  LifeBuoyIcon,
  MapPinIcon,
  PlusIcon,
  RulerIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/server";

export default async function DashboardPage() {
  const stats = await api.dashboard.getStats();
  const properties = await api.property.list();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your property portfolio
        </p>
      </div>

      {/* Primary Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Properties</CardDescription>
            <Building2Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">{stats.totalProperties}</div>
            <p className="text-muted-foreground text-xs">
              {stats.wegCount} WEG · {stats.mvCount} MV
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Buildings</CardDescription>
            <HomeIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">{stats.totalBuildings}</div>
            <p className="text-muted-foreground text-xs">
              Across all properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Units</CardDescription>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">{stats.totalUnits}</div>
            <p className="text-muted-foreground text-xs">
              Apartments, offices, parking
            </p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Quick Action</CardDescription>
            <PlusIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="sm">
              <Link href="/properties/new">
                <PlusIcon className="size-4" />
                New Property
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Unit Type Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GaugeIcon className="size-4 text-primary" />
              <CardTitle className="text-base">Unit Breakdown</CardTitle>
            </div>
            <CardDescription>Distribution by unit type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-chart-1" />
                  Apartments
                </span>
                <span className="font-medium">
                  {stats.unitTypeBreakdown.apartment}
                </span>
              </div>
              <Progress
                className="h-2 *:data-[slot=progress-indicator]:bg-chart-1"
                value={
                  stats.totalUnits > 0
                    ? (stats.unitTypeBreakdown.apartment / stats.totalUnits) *
                      100
                    : 0
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-chart-2" />
                  Offices
                </span>
                <span className="font-medium">
                  {stats.unitTypeBreakdown.office}
                </span>
              </div>
              <Progress
                className="h-2 *:data-[slot=progress-indicator]:bg-chart-2"
                value={
                  stats.totalUnits > 0
                    ? (stats.unitTypeBreakdown.office / stats.totalUnits) * 100
                    : 0
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-chart-3" />
                  Parking
                </span>
                <span className="font-medium">
                  {stats.unitTypeBreakdown.parking}
                </span>
              </div>
              <Progress
                className="h-2 *:data-[slot=progress-indicator]:bg-chart-3"
                value={
                  stats.totalUnits > 0
                    ? (stats.unitTypeBreakdown.parking / stats.totalUnits) * 100
                    : 0
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-chart-4" />
                  Gardens
                </span>
                <span className="font-medium">
                  {stats.unitTypeBreakdown.garden}
                </span>
              </div>
              <Progress
                className="h-2 *:data-[slot=progress-indicator]:bg-chart-4"
                value={
                  stats.totalUnits > 0
                    ? (stats.unitTypeBreakdown.garden / stats.totalUnits) * 100
                    : 0
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Area */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <RulerIcon className="size-4 text-primary" />
              <CardTitle className="text-base">Total Area</CardTitle>
            </div>
            <CardDescription>Managed square meters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground text-sm">Unit Area</p>
                <p className="font-bold text-2xl">
                  {stats.totalUnitArea.toLocaleString("de-DE")} m²
                </p>
              </div>
              {stats.totalLandSize > 0 && (
                <div>
                  <p className="text-muted-foreground text-sm">Land Size</p>
                  <p className="font-bold text-2xl">
                    {stats.totalLandSize.toLocaleString("de-DE")} m²
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Building Age Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-primary" />
              <CardTitle className="text-base">Building Age</CardTitle>
            </div>
            <CardDescription>Construction year distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>New (0-5 yrs)</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 text-xs dark:bg-emerald-900/30 dark:text-emerald-400">
                {stats.buildingAgeDistribution.new}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Recent (6-15 yrs)</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-400">
                {stats.buildingAgeDistribution.recent}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Established (16-30 yrs)</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400">
                {stats.buildingAgeDistribution.established}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Historic (30+ yrs)</span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700 text-xs dark:bg-purple-900/30 dark:text-purple-400">
                {stats.buildingAgeDistribution.historic}
              </span>
            </div>
            {stats.buildingAgeDistribution.unknown > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unknown</span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
                  {stats.buildingAgeDistribution.unknown}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Energy, Data Quality, Elevator */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Energy Standards */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <LeafIcon className="size-4 text-primary" />
              <CardTitle className="text-base">Energy Standards</CardTitle>
            </div>
            <CardDescription>Sustainability overview</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.energyStandards).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.energyStandards)
                  .sort((a, b) => b[1] - a[1])
                  .map(([standard, count]) => (
                    <div
                      className="flex items-center justify-between text-sm"
                      key={standard}
                    >
                      <span
                        className={
                          standard === "Not specified"
                            ? "text-muted-foreground"
                            : ""
                        }
                      >
                        {standard}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No energy data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Data Quality / Missing Data */}
        <Card
          className={
            stats.propertiesMissingData.total > 0
              ? "border-amber-200 dark:border-amber-800/50"
              : ""
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon
                className={`size-4 ${
                  stats.propertiesMissingData.total > 0
                    ? "text-amber-500"
                    : "text-primary"
                }`}
              />
              <CardTitle className="text-base">Data Quality</CardTitle>
            </div>
            <CardDescription>Properties with missing info</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.propertiesMissingData.total > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Missing Manager</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400">
                    {stats.propertiesMissingData.noManager}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Missing Accountant</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400">
                    {stats.propertiesMissingData.noAccountant}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Missing Document</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400">
                    {stats.propertiesMissingData.noDocument}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                <span className="mb-2 text-2xl">✓</span>
                <p className="font-medium text-emerald-600 text-sm dark:text-emerald-400">
                  All properties complete
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Elevator Availability */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <LifeBuoyIcon className="size-4 text-primary" />
              <CardTitle className="text-base">Accessibility</CardTitle>
            </div>
            <CardDescription>Elevator availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  With Elevator
                </span>
                <span className="font-medium">
                  {stats.elevatorStats.withElevator}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-slate-400" />
                  Without Elevator
                </span>
                <span className="font-medium">
                  {stats.elevatorStats.withoutElevator}
                </span>
              </div>
              {stats.elevatorStats.unknown > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2.5 rounded-full bg-muted" />
                    Unknown
                  </span>
                  <span className="font-medium text-muted-foreground">
                    {stats.elevatorStats.unknown}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fourth Row - Geographic & Manager Load */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {/* Geographic Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MapPinIcon className="size-4 text-primary" />
              <CardTitle className="text-base">
                Geographic Distribution
              </CardTitle>
            </div>
            <CardDescription>Buildings by city</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topCities.length > 0 ? (
              <div className="space-y-3">
                {stats.topCities.map(({ city, count }) => (
                  <div className="flex items-center justify-between" key={city}>
                    <span
                      className={`text-sm ${
                        city === "Unknown" ? "text-muted-foreground" : ""
                      }`}
                    >
                      {city}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(count / stats.totalBuildings) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 font-medium text-right text-sm">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No location data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Manager/Accountant Load */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UsersIcon className="size-4 text-primary" />
              <CardTitle className="text-base">Team Workload</CardTitle>
            </div>
            <CardDescription>Properties per manager/accountant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Managers
                </p>
                {stats.topManagers.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topManagers.map(({ name, count }) => (
                      <div
                        className="flex items-center justify-between text-sm"
                        key={name}
                      >
                        <span className="truncate pr-2" title={name}>
                          {name}
                        </span>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-xs">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No managers assigned
                  </p>
                )}
              </div>
              <div>
                <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Accountants
                </p>
                {stats.topAccountants.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topAccountants.map(({ name, count }) => (
                      <div
                        className="flex items-center justify-between text-sm"
                        key={name}
                      >
                        <span className="truncate pr-2" title={name}>
                          {name}
                        </span>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-xs">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No accountants assigned
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Properties */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Properties</CardTitle>
            <CardDescription>
              Your most recently added properties
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/properties">
              View All
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2Icon className="mb-4 size-12 text-muted-foreground" />
              <h3 className="mb-2 font-semibold text-lg">No properties yet</h3>
              <p className="mb-6 text-center text-muted-foreground">
                Get started by creating your first property.
              </p>
              <Button asChild>
                <Link href="/properties/new">
                  <PlusIcon className="size-4" />
                  Create Property
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.slice(0, 5).map((property) => (
                <Link
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  href={`/properties/${property.id}`}
                  key={property.id}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2Icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {property.buildingCount} buildings ·{" "}
                        {property.unitCount} units
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium text-xs">
                      {property.type}
                    </span>
                    <ArrowRightIcon className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
