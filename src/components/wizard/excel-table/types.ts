import type { UnitType, WizardBuilding, WizardUnit } from "@/app/(dashboard)/properties/new/page";

// Re-export for convenience
export type { UnitType, WizardBuilding, WizardUnit };

export interface CellPosition {
  row: number;
  col: number;
}

export interface SelectionRange {
  start: CellPosition;
  end: CellPosition;
}

export interface ColumnDefinition {
  id: ColumnId;
  label: string;
  width: number;
  minWidth: number;
  type: "text" | "number" | "select";
}

export type ColumnId =
  | "unitNumber"
  | "type"
  | "building"
  | "floor"
  | "entrance"
  | "size"
  | "coOwnershipShare"
  | "constructionYear"
  | "rooms";

export type NavigationDirection = "up" | "down" | "left" | "right" | "next" | "prev" | "nextRow";

export interface NavigationAction {
  type: "navigate" | "startEdit" | "commitEdit" | "cancelEdit" | "clear" | "copy" | "paste";
  direction?: NavigationDirection;
  shiftKey?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ExcelTableProps {
  buildings: WizardBuilding[];
  units: WizardUnit[];
  onUnitsChange: (units: WizardUnit[]) => void;
}


