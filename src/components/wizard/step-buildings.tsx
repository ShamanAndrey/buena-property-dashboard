"use client";

import { Building2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import type {
  WizardBuilding,
  WizardState,
} from "@/app/(dashboard)/properties/new/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface StepBuildingsProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

interface BuildingFormData {
  code: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
}

const emptyBuilding: BuildingFormData = {
  code: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
};

export function StepBuildings({ state, updateState }: StepBuildingsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<WizardBuilding | null>(
    null
  );
  const [formData, setFormData] = useState<BuildingFormData>(emptyBuilding);

  const openAddDialog = () => {
    setEditingBuilding(null);
    setFormData(emptyBuilding);
    setIsDialogOpen(true);
  };

  const openEditDialog = (building: WizardBuilding) => {
    setEditingBuilding(building);
    setFormData({
      code: building.code,
      street: building.street,
      houseNumber: building.houseNumber,
      postalCode: building.postalCode,
      city: building.city,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.street.trim() || !formData.houseNumber.trim()) return;

    if (editingBuilding) {
      // Update existing building
      updateState({
        buildings: state.buildings.map((b) =>
          b.tempId === editingBuilding.tempId ? { ...b, ...formData } : b
        ),
      });
    } else {
      // Add new building - auto-generate code if not provided
      const newBuilding: WizardBuilding = {
        tempId: crypto.randomUUID(),
        code: formData.code || String.fromCharCode(65 + state.buildings.length), // A, B, C...
        street: formData.street,
        houseNumber: formData.houseNumber,
        postalCode: formData.postalCode,
        city: formData.city,
      };
      updateState({
        buildings: [...state.buildings, newBuilding],
      });
    }

    setIsDialogOpen(false);
    setFormData(emptyBuilding);
    setEditingBuilding(null);
  };

  const handleDelete = (tempId: string) => {
    // Also remove units associated with this building
    updateState({
      buildings: state.buildings.filter((b) => b.tempId !== tempId),
      units: state.units.filter((u) => u.buildingTempId !== tempId),
    });
  };

  const isFormValid = formData.street.trim() && formData.houseNumber.trim();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Buildings</CardTitle>
              <CardDescription>
                Add all buildings that belong to this property
              </CardDescription>
            </div>
            <Button onClick={openAddDialog}>
              <PlusIcon className="size-4" />
              Add Building
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {state.buildings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2Icon className="mb-4 size-12 text-muted-foreground" />
              <h3 className="mb-2 font-medium text-lg">No buildings yet</h3>
              <p className="mb-6 text-center text-muted-foreground text-sm">
                Add at least one building to continue
              </p>
              <Button onClick={openAddDialog}>
                <PlusIcon className="size-4" />
                Add Building
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {state.buildings.map((building, index) => (
                <div
                  className="flex items-center gap-4 rounded-lg border p-4"
                  key={building.tempId}
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
                    {building.code || index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {building.street} {building.houseNumber}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {building.postalCode && building.city
                        ? `${building.postalCode} ${building.city}`
                        : building.city ||
                          building.postalCode ||
                          "No city specified"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditDialog(building)}
                      size="icon"
                      variant="ghost"
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(building.tempId)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Building Dialog */}
      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBuilding ? "Edit Building" : "Add Building"}
            </DialogTitle>
            <DialogDescription>
              Enter the address details for this building
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isFormValid) {
                handleSave();
              }
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-sm" htmlFor="code">
                    Building Code
                  </label>
                  <Input
                    className="max-w-[300px]"
                    id="code"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g., A, B, TG (auto-generated if empty)"
                    value={formData.code}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Use codes like A, B, C for buildings or TG for underground
                  garage
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="street">
                    Street <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="street"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                    placeholder="e.g., Hauptstraße"
                    value={formData.street}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="houseNumber">
                    House Number <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="houseNumber"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        houseNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g., 42"
                    value={formData.houseNumber}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="postalCode">
                    Postal Code
                  </label>
                  <Input
                    id="postalCode"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        postalCode: e.target.value,
                      }))
                    }
                    placeholder="e.g., 10115"
                    value={formData.postalCode}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="city">
                    City
                  </label>
                  <Input
                    id="city"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="e.g., Berlin"
                    value={formData.city}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setIsDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={!isFormValid} type="submit">
                {editingBuilding ? "Save Changes" : "Add Building"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
