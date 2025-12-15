import {
  ArrowRightIcon,
  Building2Icon,
  HomeIcon,
  PlusIcon,
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
import { api } from "@/trpc/server";

export default async function DashboardPage() {
  const properties = await api.property.list();

  const totalUnits = properties.reduce((acc, p) => acc + p.unitCount, 0);
  const totalBuildings = properties.reduce(
    (acc, p) => acc + p.buildingCount,
    0
  );
  const wegCount = properties.filter((p) => p.type === "WEG").length;
  const mvCount = properties.filter((p) => p.type === "MV").length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your property portfolio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Properties</CardDescription>
            <Building2Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">{properties.length}</div>
            <p className="text-muted-foreground text-xs">
              {wegCount} WEG · {mvCount} MV
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Buildings</CardDescription>
            <HomeIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">{totalBuildings}</div>
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
            <div className="font-bold text-3xl">{totalUnits}</div>
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
