"use client";

import { CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	UnitType,
	WizardBuilding,
	WizardUnit,
} from "@/app/(dashboard)/properties/new/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface SpreadsheetTableProps {
	buildings: WizardBuilding[];
	units: WizardUnit[];
	onUnitsChange: (units: WizardUnit[]) => void;
}

const UNIT_TYPES: { value: UnitType; label: string }[] = [
	{ value: "apartment", label: "Apartment" },
	{ value: "office", label: "Office" },
	{ value: "garden", label: "Garden" },
	{ value: "parking", label: "Parking" },
];

const createEmptyUnit = (buildingTempId: string): WizardUnit => ({
	tempId: crypto.randomUUID(),
	buildingTempId,
	unitNumber: "",
	type: "apartment",
	floor: null,
	entrance: "",
	size: "",
	coOwnershipShare: "",
	constructionYear: null,
	rooms: "",
});

export function SpreadsheetTable({
	buildings,
	units,
	onUnitsChange,
}: SpreadsheetTableProps) {
	const [focusedCell, setFocusedCell] = useState<{
		row: number;
		col: number;
	} | null>(null);
	const tableRef = useRef<HTMLTableElement>(null);

	const updateUnit = useCallback(
		(tempId: string, field: keyof WizardUnit, value: unknown) => {
			onUnitsChange(
				units.map((unit) => {
					if (unit.tempId !== tempId) return unit;

					const updates: Partial<WizardUnit> = { [field]: value };

					// Clear rooms when changing to parking or garden type
					if (field === "type" && (value === "parking" || value === "garden")) {
						updates.rooms = "";
					}

					return { ...unit, ...updates };
				}),
			);
		},
		[units, onUnitsChange],
	);

	const addRow = useCallback(() => {
		const defaultBuilding = buildings[0];
		if (!defaultBuilding) return;

		onUnitsChange([...units, createEmptyUnit(defaultBuilding.tempId)]);
	}, [buildings, units, onUnitsChange]);

	const duplicateRow = useCallback(
		(index: number) => {
			const unitToDuplicate = units[index];
			if (!unitToDuplicate) return;

			const newUnit: WizardUnit = {
				...unitToDuplicate,
				tempId: crypto.randomUUID(),
				unitNumber: `${unitToDuplicate.unitNumber}-copy`,
			};

			const newUnits = [...units];
			newUnits.splice(index + 1, 0, newUnit);
			onUnitsChange(newUnits);
		},
		[units, onUnitsChange],
	);

	const deleteRow = useCallback(
		(tempId: string) => {
			onUnitsChange(units.filter((unit) => unit.tempId !== tempId));
		},
		[units, onUnitsChange],
	);

	// Handle paste from Excel/spreadsheet
	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			const pastedData = e.clipboardData.getData("text");
			const rows = pastedData.split("\n").filter((row) => row.trim());

			if (rows.length === 0) return;

			const defaultBuilding = buildings[0];
			if (!defaultBuilding) return;

			// Parse pasted rows (tab-separated values)
			const newUnits: WizardUnit[] = rows.map((row) => {
				const cells = row.split("\t");
				return {
					tempId: crypto.randomUUID(),
					buildingTempId: defaultBuilding.tempId,
					unitNumber: cells[0]?.trim() || "",
					type: (cells[1]?.trim().toLowerCase() as UnitType) || "apartment",
					floor: cells[2] ? parseInt(cells[2], 10) || null : null,
					entrance: cells[3]?.trim() || "",
					size: cells[4]?.trim() || "",
					coOwnershipShare: cells[5]?.trim() || "",
					constructionYear: cells[6] ? parseInt(cells[6], 10) || null : null,
					rooms: cells[7]?.trim() || "",
				};
			});

			// If pasting multiple rows, replace or append
			if (newUnits.length > 1) {
				e.preventDefault();
				onUnitsChange([...units, ...newUnits]);
			}
		},
		[buildings, units, onUnitsChange],
	);

	// Keyboard navigation
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
			const totalRows = units.length;
			const totalCols = 9; // Number of editable columns

			switch (e.key) {
				case "Tab":
					e.preventDefault();
					if (e.shiftKey) {
						// Move backwards
						if (colIndex > 0) {
							setFocusedCell({ row: rowIndex, col: colIndex - 1 });
						} else if (rowIndex > 0) {
							setFocusedCell({ row: rowIndex - 1, col: totalCols - 1 });
						}
					} else {
						// Move forwards
						if (colIndex < totalCols - 1) {
							setFocusedCell({ row: rowIndex, col: colIndex + 1 });
						} else if (rowIndex < totalRows - 1) {
							setFocusedCell({ row: rowIndex + 1, col: 0 });
						} else {
							// Add new row at the end
							addRow();
							setFocusedCell({ row: totalRows, col: 0 });
						}
					}
					break;
				case "Enter":
					e.preventDefault();
					if (rowIndex < totalRows - 1) {
						setFocusedCell({ row: rowIndex + 1, col: colIndex });
					} else {
						addRow();
						setFocusedCell({ row: totalRows, col: colIndex });
					}
					break;
				case "ArrowUp":
					if (rowIndex > 0) {
						setFocusedCell({ row: rowIndex - 1, col: colIndex });
					}
					break;
				case "ArrowDown":
					if (rowIndex < totalRows - 1) {
						setFocusedCell({ row: rowIndex + 1, col: colIndex });
					}
					break;
			}
		},
		[units.length, addRow],
	);

	// Focus management
	useEffect(() => {
		if (focusedCell && tableRef.current) {
			const input = tableRef.current.querySelector(
				`[data-row="${focusedCell.row}"][data-col="${focusedCell.col}"]`,
			) as HTMLInputElement | null;
			input?.focus();
		}
	}, [focusedCell]);

	if (buildings.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<p className="text-muted-foreground">
					Please add at least one building first
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{units.length} unit{units.length !== 1 ? "s" : ""} added
				</p>
				<div className="flex gap-2">
					<Button onClick={addRow} size="sm" variant="outline">
						<PlusIcon className="size-4" />
						Add Row
					</Button>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto rounded-lg border">
				<table className="w-full text-sm" onPaste={handlePaste} ref={tableRef}>
					<thead className="border-b bg-muted/50">
						<tr>
							<th className="px-3 py-2 text-left font-medium">Unit #</th>
							<th className="px-3 py-2 text-left font-medium">Type</th>
							<th className="px-3 py-2 text-left font-medium">Building</th>
							<th className="px-3 py-2 text-left font-medium">Floor</th>
							<th className="px-3 py-2 text-left font-medium">Entrance</th>
							<th className="px-3 py-2 text-left font-medium">Size (m²)</th>
							<th className="px-3 py-2 text-left font-medium">MEA Share</th>
							<th className="px-3 py-2 text-left font-medium">Year</th>
							<th className="px-3 py-2 text-left font-medium">Rooms</th>
							<th className="w-20 px-3 py-2 text-left font-medium">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{units.map((unit, rowIndex) => (
							<tr
								className="transition-colors hover:bg-muted/30"
								key={unit.tempId}
							>
								{/* Unit Number */}
								<td className="px-1 py-1">
									<Input
										className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-1"
										data-col={0}
										data-row={rowIndex}
										onChange={(e) =>
											updateUnit(unit.tempId, "unitNumber", e.target.value)
										}
										onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
										placeholder="e.g., 101"
										value={unit.unitNumber}
									/>
								</td>

								{/* Type */}
								<td className="px-1 py-1">
									<Select
										onValueChange={(value: UnitType) =>
											updateUnit(unit.tempId, "type", value)
										}
										value={unit.type}
									>
										<SelectTrigger className="h-8 w-28 border-0 bg-transparent shadow-none focus:ring-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{UNIT_TYPES.map((t) => (
												<SelectItem key={t.value} value={t.value}>
													{t.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</td>

								{/* Building */}
								<td className="px-1 py-1">
									<Select
										onValueChange={(value) =>
											updateUnit(unit.tempId, "buildingTempId", value)
										}
										value={unit.buildingTempId}
									>
										<SelectTrigger className="h-8 w-36 border-0 bg-transparent shadow-none focus:ring-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{buildings.map((b) => (
												<SelectItem key={b.tempId} value={b.tempId}>
													{b.street} {b.houseNumber}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</td>

								{/* Floor */}
								<td className="px-1 py-1">
									<Input
										className="h-8 w-16 border-0 bg-transparent shadow-none focus-visible:ring-1"
										data-col={3}
										data-row={rowIndex}
										onChange={(e) =>
											updateUnit(
												unit.tempId,
												"floor",
												e.target.value ? parseInt(e.target.value, 10) : null,
											)
										}
										onKeyDown={(e) => handleKeyDown(e, rowIndex, 3)}
										placeholder="0"
										type="number"
										value={unit.floor ?? ""}
									/>
								</td>

								{/* Entrance */}
								<td className="px-1 py-1">
									<Input
										className="h-8 w-16 border-0 bg-transparent shadow-none focus-visible:ring-1"
										data-col={4}
										data-row={rowIndex}
										onChange={(e) =>
											updateUnit(unit.tempId, "entrance", e.target.value)
										}
										onKeyDown={(e) => handleKeyDown(e, rowIndex, 4)}
										placeholder="A"
										value={unit.entrance}
									/>
								</td>

								{/* Size */}
								<td className="px-1 py-1">
									<Input
										className="h-8 w-20 border-0 bg-transparent shadow-none focus-visible:ring-1"
										data-col={5}
										data-row={rowIndex}
										onChange={(e) =>
											updateUnit(unit.tempId, "size", e.target.value)
										}
										onKeyDown={(e) => handleKeyDown(e, rowIndex, 5)}
										placeholder="75.5"
										value={unit.size}
									/>
								</td>

								{/* Co-ownership Share */}
								<td className="px-1 py-1">
									<Input
										className="h-8 w-24 border-0 bg-transparent shadow-none focus-visible:ring-1"
										data-col={6}
										data-row={rowIndex}
										onChange={(e) =>
											updateUnit(
												unit.tempId,
												"coOwnershipShare",
												e.target.value,
											)
										}
										onKeyDown={(e) => handleKeyDown(e, rowIndex, 6)}
										placeholder="0.0123"
										value={unit.coOwnershipShare}
									/>
								</td>

								{/* Construction Year */}
								<td className="px-1 py-1">
									<Input
										className="h-8 w-20 border-0 bg-transparent shadow-none focus-visible:ring-1"
										data-col={7}
										data-row={rowIndex}
										onChange={(e) =>
											updateUnit(
												unit.tempId,
												"constructionYear",
												e.target.value ? parseInt(e.target.value, 10) : null,
											)
										}
										onKeyDown={(e) => handleKeyDown(e, rowIndex, 7)}
										placeholder="2020"
										type="number"
										value={unit.constructionYear ?? ""}
									/>
								</td>

								{/* Rooms - only applicable for apartment and office */}
								<td className="px-1 py-1">
									{unit.type === "parking" || unit.type === "garden" ? (
										<span className="flex h-8 w-16 items-center justify-center text-muted-foreground">
											—
										</span>
									) : (
										<Input
											className="h-8 w-16 border-0 bg-transparent shadow-none focus-visible:ring-1"
											data-col={8}
											data-row={rowIndex}
											onChange={(e) =>
												updateUnit(unit.tempId, "rooms", e.target.value)
											}
											onKeyDown={(e) => handleKeyDown(e, rowIndex, 8)}
											placeholder="2.5"
											value={unit.rooms}
										/>
									)}
								</td>

								{/* Actions */}
								<td className="px-1 py-1">
									<div className="flex gap-1">
										<Button
											onClick={() => duplicateRow(rowIndex)}
											size="icon-sm"
											title="Duplicate row"
											variant="ghost"
										>
											<CopyIcon className="size-3.5" />
										</Button>
										<Button
											onClick={() => deleteRow(unit.tempId)}
											size="icon-sm"
											title="Delete row"
											variant="ghost"
										>
											<Trash2Icon className="size-3.5 text-destructive" />
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>

				{units.length === 0 && (
					<div className="flex flex-col items-center justify-center py-12">
						<p className="mb-4 text-muted-foreground text-sm">
							No units yet. Add your first unit to get started.
						</p>
						<Button onClick={addRow}>
							<PlusIcon className="size-4" />
							Add Unit
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
