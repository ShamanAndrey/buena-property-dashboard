import type { ColumnDefinition, SelectOption, UnitType } from "./types";

export const UNIT_TYPES: SelectOption[] = [
  { value: "apartment", label: "Apartment" },
  { value: "office", label: "Office" },
  { value: "garden", label: "Garden" },
  { value: "parking", label: "Parking" },
];

export const COLUMNS: ColumnDefinition[] = [
  { id: "unitNumber", label: "Unit #", width: 80, minWidth: 60, type: "text" },
  { id: "type", label: "Type", width: 110, minWidth: 90, type: "select" },
  { id: "building", label: "Building", width: 150, minWidth: 100, type: "select" },
  { id: "floor", label: "Floor", width: 70, minWidth: 50, type: "number" },
  { id: "entrance", label: "Entrance", width: 80, minWidth: 60, type: "text" },
  { id: "size", label: "Size (m²)", width: 90, minWidth: 70, type: "text" },
  { id: "coOwnershipShare", label: "MEA Share", width: 100, minWidth: 80, type: "text" },
  { id: "constructionYear", label: "Year", width: 80, minWidth: 60, type: "number" },
  { id: "rooms", label: "Rooms", width: 70, minWidth: 50, type: "text" },
];

export const COLUMN_COUNT = COLUMNS.length;

export function getColumnById(id: string): ColumnDefinition | undefined {
  return COLUMNS.find((col) => col.id === id);
}

export function getColumnType(colIndex: number): "text" | "number" | "select" {
  return COLUMNS[colIndex]?.type ?? "text";
}

export function isSelectColumn(colIndex: number): boolean {
  const type = getColumnType(colIndex);
  return type === "select";
}

export function getUnitTypeLabel(value: UnitType): string {
  return UNIT_TYPES.find((t) => t.value === value)?.label ?? value;
}


