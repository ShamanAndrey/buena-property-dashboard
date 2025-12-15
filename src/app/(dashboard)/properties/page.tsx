import { Building2Icon, PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/server";

export default async function PropertiesPage() {
  const properties = await api.property.list();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Properties</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your property portfolio
          </p>
        </div>
        <Button asChild>
          <Link href="/properties/new">
            <PlusIcon className="size-4" />
            Create Property
          </Link>
        </Button>
      </div>

      {/* Properties table */}
      {properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Properties</CardTitle>
            <CardDescription>
              A list of all properties in your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Property Number</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Buildings</th>
                    <th className="px-4 py-3 font-medium">Units</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {properties.map((property) => (
                    <tr
                      className="transition-colors hover:bg-muted/50"
                      key={property.id}
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {property.propertyNumber}
                      </td>
                      <td className="px-4 py-3 font-medium">{property.name}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            property.type === "WEG" ? "default" : "secondary"
                          }
                        >
                          {property.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2Icon className="size-3.5 text-muted-foreground" />
                          {property.buildingCount}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <UsersIcon className="size-3.5 text-muted-foreground" />
                          {property.unitCount}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {property.createdAt
                          ? new Date(property.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/properties/${property.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
