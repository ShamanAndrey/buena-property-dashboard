"use client";

import {
  CopyIcon,
  PlusIcon,
  Trash2Icon,
  ClipboardPasteIcon,
  ArrowDownIcon,
  CopyPlusIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type MouseEvent,
  type ClipboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

import type { ExcelTableProps, WizardUnit, ColumnId, SelectOption } from "./types";
import { COLUMNS, COLUMN_COUNT, UNIT_TYPES, getUnitTypeLabel } from "./constants";
import { useTableNavigation } from "./use-table-navigation";
import { CellSelect } from "./cell-select";
import { CellInput } from "./cell-input";

// Create an empty unit
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

export function ExcelTable({ buildings, units, onUnitsChange }: ExcelTableProps) {
  // Column widths state for resizing
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(COLUMNS.map((col) => [col.id, col.width]))
  );

  // Resizing state
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Auto-fill drag state
  const [isDraggingFill, setIsDraggingFill] = useState(false);
  const [fillPreviewEnd, setFillPreviewEnd] = useState<number | null>(null);

  // Clipboard state
  const [clipboard, setClipboard] = useState<string[][] | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  // Get cell value from unit
  const getCellValue = useCallback(
    (row: number, col: number): string => {
      const unit = units[row];
      if (!unit) return "";

      const colId = COLUMNS[col]?.id;
      switch (colId) {
        case "unitNumber":
          return unit.unitNumber;
        case "type":
          return unit.type;
        case "building":
          return unit.buildingTempId;
        case "floor":
          return unit.floor?.toString() ?? "";
        case "entrance":
          return unit.entrance;
        case "size":
          return unit.size;
        case "coOwnershipShare":
          return unit.coOwnershipShare;
        case "constructionYear":
          return unit.constructionYear?.toString() ?? "";
        case "rooms":
          return unit.rooms;
        default:
          return "";
      }
    },
    [units]
  );

  // Set cell value on unit
  const setCellValue = useCallback(
    (row: number, col: number, value: string) => {
      const unit = units[row];
      if (!unit) return;

      const colId = COLUMNS[col]?.id;
      const newUnits = [...units];
      const newUnit = { ...unit };

      switch (colId) {
        case "unitNumber":
          newUnit.unitNumber = value;
          break;
        case "type":
          if (["apartment", "office", "garden", "parking"].includes(value)) {
            newUnit.type = value as "apartment" | "office" | "garden" | "parking";
            // Clear rooms for non-room types
            if (value === "parking" || value === "garden") {
              newUnit.rooms = "";
            }
          }
          break;
        case "building":
          newUnit.buildingTempId = value;
          break;
        case "floor":
          newUnit.floor = value ? parseInt(value, 10) : null;
          break;
        case "entrance":
          newUnit.entrance = value;
          break;
        case "size":
          newUnit.size = value;
          break;
        case "coOwnershipShare":
          newUnit.coOwnershipShare = value;
          break;
        case "constructionYear":
          newUnit.constructionYear = value ? parseInt(value, 10) : null;
          break;
        case "rooms":
          newUnit.rooms = value;
          break;
      }

      newUnits[row] = newUnit;
      onUnitsChange(newUnits);
    },
    [units, onUnitsChange]
  );

  // Check if cell is editable (rooms not editable for parking/garden)
  const isCellEditable = useCallback(
    (row: number, col: number): boolean => {
      const unit = units[row];
      const colId = COLUMNS[col]?.id;
      if (colId === "rooms" && (unit?.type === "parking" || unit?.type === "garden")) {
        return false;
      }
      return true;
    },
    [units]
  );

  // Add a new row
  const addRow = useCallback(
    (atIndex?: number): number => {
      const defaultBuilding = buildings[0];
      if (!defaultBuilding) return units.length;

      const newUnit = createEmptyUnit(defaultBuilding.tempId);
      const newUnits = [...units];

      if (atIndex !== undefined) {
        newUnits.splice(atIndex, 0, newUnit);
        return atIndex;
      } else {
        newUnits.push(newUnit);
        return newUnits.length - 1;
      }
    },
    [buildings, units]
  );

  // Wrapper for addRow that also updates state
  const handleAddRow = useCallback(
    (atIndex?: number): number => {
      const defaultBuilding = buildings[0];
      if (!defaultBuilding) return units.length;

      const newUnit = createEmptyUnit(defaultBuilding.tempId);
      const newUnits = [...units];

      let insertIndex: number;
      if (atIndex !== undefined) {
        newUnits.splice(atIndex, 0, newUnit);
        insertIndex = atIndex;
      } else {
        newUnits.push(newUnit);
        insertIndex = newUnits.length - 1;
      }

      onUnitsChange(newUnits);
      return insertIndex;
    },
    [buildings, units, onUnitsChange]
  );

  // Delete row
  const deleteRow = useCallback(
    (index: number) => {
      const newUnits = units.filter((_, i) => i !== index);
      onUnitsChange(newUnits);
    },
    [units, onUnitsChange]
  );

  // Duplicate row
  const duplicateRow = useCallback(
    (index: number) => {
      const unit = units[index];
      if (!unit) return;

      const newUnit: WizardUnit = {
        ...unit,
        tempId: crypto.randomUUID(),
      };

      const newUnits = [...units];
      newUnits.splice(index + 1, 0, newUnit);
      onUnitsChange(newUnits);
    },
    [units, onUnitsChange]
  );

  // Use the navigation hook
  const navigation = useTableNavigation({
    rowCount: units.length,
    units,
    onAddRow: handleAddRow,
    getCellValue,
    setCellValue,
    isCellEditable,
  });

  const {
    selectedCell,
    selectionRange,
    selectedRows,
    isEditing,
    editValue,
    normalizedRange,
    isCellSelected,
    isPrimaryCell,
    isRowSelected,
    handleTableKeyDown,
    handleCellClick,
    handleCellDoubleClick,
    handleRowNumberClick,
    onCellNavigate,
    onCellChange,
    onCellCancel,
    setEditValue,
    startEditing,
  } = navigation;

  // Delete selected rows
  const deleteSelectedRows = useCallback(() => {
    if (selectedRows.size > 0) {
      const newUnits = units.filter((_, i) => !selectedRows.has(i));
      onUnitsChange(newUnits);
    } else if (selectedCell) {
      deleteRow(selectedCell.row);
    }
  }, [selectedRows, selectedCell, units, onUnitsChange, deleteRow]);

  // Copy selection to clipboard
  const copySelection = useCallback(() => {
    if (!normalizedRange && !selectedCell) return;

    const range = normalizedRange ?? {
      startRow: selectedCell!.row,
      endRow: selectedCell!.row,
      startCol: selectedCell!.col,
      endCol: selectedCell!.col,
    };

    const data: string[][] = [];
    for (let row = range.startRow; row <= range.endRow; row++) {
      const rowData: string[] = [];
      for (let col = range.startCol; col <= range.endCol; col++) {
        rowData.push(getCellValue(row, col));
      }
      data.push(rowData);
    }

    setClipboard(data);

    // Also copy to system clipboard as TSV
    const text = data.map((row) => row.join("\t")).join("\n");
    navigator.clipboard.writeText(text).catch(() => {
      // Ignore clipboard errors
    });
  }, [normalizedRange, selectedCell, getCellValue]);

  // Paste from clipboard
  const pasteClipboard = useCallback(() => {
    if (!clipboard || !selectedCell) return;

    const newUnits = [...units];

    for (let i = 0; i < clipboard.length; i++) {
      const targetRow = selectedCell.row + i;
      if (targetRow >= newUnits.length) {
        const defaultBuilding = buildings[0];
        if (defaultBuilding) {
          newUnits.push(createEmptyUnit(defaultBuilding.tempId));
        } else {
          break;
        }
      }

      const rowData = clipboard[i];
      if (!rowData) continue;

      for (let j = 0; j < rowData.length; j++) {
        const targetCol = selectedCell.col + j;
        if (targetCol >= COLUMN_COUNT) break;

        const value = rowData[j];
        if (value !== undefined && isCellEditable(targetRow, targetCol)) {
          const unit = newUnits[targetRow];
          if (unit) {
            const colId = COLUMNS[targetCol]?.id;
            if (colId) {
              switch (colId) {
                case "unitNumber":
                  unit.unitNumber = value;
                  break;
                case "type":
                  if (["apartment", "office", "garden", "parking"].includes(value.toLowerCase())) {
                    unit.type = value.toLowerCase() as "apartment" | "office" | "garden" | "parking";
                  }
                  break;
                case "building":
                  const matchingBuilding = buildings.find(
                    (b) => b.tempId === value || `${b.street} ${b.houseNumber}` === value
                  );
                  if (matchingBuilding) {
                    unit.buildingTempId = matchingBuilding.tempId;
                  }
                  break;
                case "floor":
                  unit.floor = value ? parseInt(value, 10) : null;
                  break;
                case "entrance":
                  unit.entrance = value;
                  break;
                case "size":
                  unit.size = value;
                  break;
                case "coOwnershipShare":
                  unit.coOwnershipShare = value;
                  break;
                case "constructionYear":
                  unit.constructionYear = value ? parseInt(value, 10) : null;
                  break;
                case "rooms":
                  unit.rooms = value;
                  break;
              }
            }
          }
        }
      }
    }

    onUnitsChange(newUnits);
  }, [clipboard, selectedCell, units, buildings, onUnitsChange, isCellEditable]);

  // Fill down (Ctrl+D)
  const fillDown = useCallback(() => {
    if (!normalizedRange || normalizedRange.startRow === normalizedRange.endRow) return;

    for (let col = normalizedRange.startCol; col <= normalizedRange.endCol; col++) {
      const sourceValue = getCellValue(normalizedRange.startRow, col);
      for (let row = normalizedRange.startRow + 1; row <= normalizedRange.endRow; row++) {
        if (isCellEditable(row, col)) {
          setCellValue(row, col, sourceValue);
        }
      }
    }
  }, [normalizedRange, getCellValue, setCellValue, isCellEditable]);

  // Handle paste from system clipboard
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      if (isEditing) return;
      if (!selectedCell) return;

      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      e.preventDefault();

      const data = text.split("\n").map((row) => row.split("\t"));
      setClipboard(data);

      // Paste immediately
      const newUnits = [...units];

      for (let i = 0; i < data.length; i++) {
        const targetRow = selectedCell.row + i;
        if (targetRow >= newUnits.length) {
          const defaultBuilding = buildings[0];
          if (defaultBuilding) {
            newUnits.push(createEmptyUnit(defaultBuilding.tempId));
          } else {
            break;
          }
        }

        const rowData = data[i];
        if (!rowData) continue;

        for (let j = 0; j < rowData.length; j++) {
          const targetCol = selectedCell.col + j;
          if (targetCol >= COLUMN_COUNT) break;

          const value = rowData[j]?.trim();
          if (value !== undefined && isCellEditable(targetRow, targetCol)) {
            const unit = newUnits[targetRow];
            if (unit) {
              const colId = COLUMNS[targetCol]?.id;
              if (colId) {
                switch (colId) {
                  case "unitNumber":
                    unit.unitNumber = value;
                    break;
                  case "type":
                    if (["apartment", "office", "garden", "parking"].includes(value.toLowerCase())) {
                      unit.type = value.toLowerCase() as "apartment" | "office" | "garden" | "parking";
                    }
                    break;
                  case "building":
                    const matchingBuilding = buildings.find(
                      (b) => b.tempId === value || `${b.street} ${b.houseNumber}` === value
                    );
                    if (matchingBuilding) {
                      unit.buildingTempId = matchingBuilding.tempId;
                    }
                    break;
                  case "floor":
                    unit.floor = value ? parseInt(value, 10) : null;
                    break;
                  case "entrance":
                    unit.entrance = value;
                    break;
                  case "size":
                    unit.size = value;
                    break;
                  case "coOwnershipShare":
                    unit.coOwnershipShare = value;
                    break;
                  case "constructionYear":
                    unit.constructionYear = value ? parseInt(value, 10) : null;
                    break;
                  case "rooms":
                    unit.rooms = value;
                    break;
                }
              }
            }
          }
        }
      }

      onUnitsChange(newUnits);
    },
    [isEditing, selectedCell, units, buildings, onUnitsChange, isCellEditable]
  );

  // Column resize handlers
  const handleResizeStart = useCallback(
    (colId: string, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingColumn(colId);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = columnWidths[colId] ?? 100;
    },
    [columnWidths]
  );

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const col = COLUMNS.find((c) => c.id === resizingColumn);
      const minWidth = col?.minWidth ?? 50;
      const newWidth = Math.max(minWidth, resizeStartWidth.current + delta);
      setColumnWidths((prev) => ({ ...prev, [resizingColumn]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumn]);

  // Auto-fill drag handlers
  const handleFillDragStart = useCallback(() => {
    setIsDraggingFill(true);
  }, []);

  useEffect(() => {
    if (!isDraggingFill || !selectedCell) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!tableRef.current) return;

      const rows = tableRef.current.querySelectorAll("tbody tr");
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row) {
          const rect = row.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            if (i > selectedCell.row) {
              setFillPreviewEnd(i);
            }
            break;
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (fillPreviewEnd !== null && selectedCell) {
        const sourceValue = getCellValue(selectedCell.row, selectedCell.col);
        for (let row = selectedCell.row + 1; row <= fillPreviewEnd; row++) {
          if (isCellEditable(row, selectedCell.col)) {
            setCellValue(row, selectedCell.col, sourceValue);
          }
        }
      }

      setIsDraggingFill(false);
      setFillPreviewEnd(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingFill, selectedCell, fillPreviewEnd, getCellValue, setCellValue, isCellEditable]);

  // Enhanced keyboard handler that includes copy/paste/filldown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Handle Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        copySelection();
        e.preventDefault();
        return;
      }

      // Handle Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        pasteClipboard();
        e.preventDefault();
        return;
      }

      // Handle Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        fillDown();
        e.preventDefault();
        return;
      }

      // Delegate to navigation hook
      handleTableKeyDown(e);
    },
    [copySelection, pasteClipboard, fillDown, handleTableKeyDown]
  );

  // Building options for select
  const buildingOptions: SelectOption[] = useMemo(
    () =>
      buildings.map((b) => ({
        value: b.tempId,
        label: `[${b.code}] ${b.street} ${b.houseNumber}`,
      })),
    [buildings]
  );

  // Render cell content
  const renderCellContent = (
    unit: WizardUnit,
    colId: ColumnId,
    rowIndex: number,
    colIndex: number
  ) => {
    const isEditingThis = isEditing && isPrimaryCell(rowIndex, colIndex);
    const isSelected = isCellSelected(rowIndex, colIndex);
    const isPrimary = isPrimaryCell(rowIndex, colIndex);

    // Common cell styles
    const cellClassName = cn(
      "h-8 px-2 text-sm transition-colors flex items-center",
      isSelected && "bg-blue-50 dark:bg-blue-950",
      isPrimary && !isEditingThis && "ring-2 ring-blue-500 ring-inset",
      !isEditingThis && "cursor-cell"
    );

    // Rooms is not applicable for parking/garden
    if (colId === "rooms" && (unit.type === "parking" || unit.type === "garden")) {
      return (
        <div
          className={cn(cellClassName, "justify-center text-muted-foreground bg-muted/30")}
          onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
        >
          —
        </div>
      );
    }

    // Editing mode
    if (isEditingThis) {
      // Type column - use CellSelect
      if (colId === "type") {
        return (
          <CellSelect
            value={unit.type}
            options={UNIT_TYPES}
            onChange={(value) => {
              onCellChange(value);
              onCellNavigate("next");
            }}
            onNavigate={onCellNavigate}
            onCancel={onCellCancel}
          />
        );
      }

      // Building column - use CellSelect
      if (colId === "building") {
        return (
          <CellSelect
            value={unit.buildingTempId}
            options={buildingOptions}
            onChange={(value) => {
              onCellChange(value);
              onCellNavigate("next");
            }}
            onNavigate={onCellNavigate}
            onCancel={onCellCancel}
          />
        );
      }

      // Text/number input for other columns
      return (
        <CellInput
          value={editValue}
          onChange={onCellChange}
          onNavigate={onCellNavigate}
          onCancel={onCellCancel}
          type={colId === "floor" || colId === "constructionYear" ? "number" : "text"}
        />
      );
    }

    // Non-editing display
    let displayValue = "";
    switch (colId) {
      case "unitNumber":
        displayValue = unit.unitNumber;
        break;
      case "type":
        displayValue = getUnitTypeLabel(unit.type);
        break;
      case "building":
        const building = buildings.find((b) => b.tempId === unit.buildingTempId);
        displayValue = building ? `[${building.code}] ${building.street} ${building.houseNumber}` : "";
        break;
      case "floor":
        displayValue = unit.floor?.toString() ?? "";
        break;
      case "entrance":
        displayValue = unit.entrance;
        break;
      case "size":
        displayValue = unit.size;
        break;
      case "coOwnershipShare":
        displayValue = unit.coOwnershipShare;
        break;
      case "constructionYear":
        displayValue = unit.constructionYear?.toString() ?? "";
        break;
      case "rooms":
        displayValue = unit.rooms;
        break;
    }

    return (
      <div
        className={cn(cellClassName, "truncate")}
        onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
        onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
      >
        {displayValue || <span className="text-muted-foreground/50">—</span>}
      </div>
    );
  };

  if (buildings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Please add at least one building first</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {units.length} unit{units.length !== 1 ? "s" : ""} added
          {selectedCell && (
            <span className="ml-2 text-xs">
              | Cell {String.fromCharCode(65 + selectedCell.col)}
              {selectedCell.row + 1}
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => handleAddRow()} size="sm" variant="outline">
            <PlusIcon className="size-4" />
            Add Row
          </Button>
        </div>
      </div>

      {/* Table */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={tableRef}
            className="overflow-auto rounded-lg border focus:outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          >
            <table className="w-full border-collapse text-sm" style={{ minWidth: "max-content" }}>
              {/* Sticky header */}
              <thead className="sticky top-0 z-[5] bg-muted/80 backdrop-blur-sm">
                <tr>
                  {/* Row number header */}
                  <th className="w-10 border-b border-r bg-muted/80 px-2 py-2 text-center font-medium text-muted-foreground">
                    #
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.id}
                      className="relative border-b border-r px-2 py-2 text-left font-medium select-none"
                      style={{ width: columnWidths[col.id], minWidth: col.minWidth }}
                    >
                      {col.label}
                      {/* Resize handle */}
                      <div
                        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                        onMouseDown={(e) => handleResizeStart(col.id, e)}
                      />
                    </th>
                  ))}
                  {/* Actions header */}
                  <th className="w-20 border-b px-2 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit, rowIndex) => {
                  const rowSelected = isRowSelected(rowIndex);
                  const isInFillPreview =
                    isDraggingFill &&
                    selectedCell &&
                    fillPreviewEnd !== null &&
                    rowIndex > selectedCell.row &&
                    rowIndex <= fillPreviewEnd;

                  return (
                    <tr
                      key={unit.tempId}
                      className={cn(
                        "transition-colors",
                        rowSelected && "bg-blue-100 dark:bg-blue-900",
                        isInFillPreview && "bg-blue-50 dark:bg-blue-950"
                      )}
                    >
                      {/* Row number */}
                      <td
                        className={cn(
                          "border-b border-r bg-muted/50 px-2 py-0 text-center text-xs text-muted-foreground cursor-pointer select-none hover:bg-muted",
                          rowSelected && "bg-blue-200 dark:bg-blue-800"
                        )}
                        onClick={(e) => handleRowNumberClick(rowIndex, e)}
                      >
                        {rowIndex + 1}
                      </td>
                      {COLUMNS.map((col, colIndex) => (
                        <td
                          key={col.id}
                          className="relative border-b border-r p-0"
                          style={{ width: columnWidths[col.id] }}
                        >
                          {renderCellContent(unit, col.id, rowIndex, colIndex)}
                          {/* Fill handle */}
                          {isPrimaryCell(rowIndex, colIndex) && !isEditing && (
                            <div
                              className="absolute bottom-0 right-0 size-2 cursor-crosshair bg-blue-500"
                              onMouseDown={handleFillDragStart}
                            />
                          )}
                        </td>
                      ))}
                      {/* Actions */}
                      <td className="border-b px-1 py-0">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            onClick={() => duplicateRow(rowIndex)}
                            size="icon-sm"
                            title="Duplicate row"
                            variant="ghost"
                          >
                            <CopyIcon className="size-3.5" />
                          </Button>
                          <Button
                            onClick={() => deleteRow(rowIndex)}
                            size="icon-sm"
                            title="Delete row"
                            variant="ghost"
                          >
                            <Trash2Icon className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {units.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="mb-4 text-muted-foreground text-sm">
                  No units yet. Add your first unit to get started.
                </p>
                <Button onClick={() => handleAddRow()}>
                  <PlusIcon className="size-4" />
                  Add Unit
                </Button>
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => handleAddRow(selectedCell?.row ?? units.length)}>
            <PlusIcon className="mr-2 size-4" />
            Insert Row Above
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAddRow((selectedCell?.row ?? units.length - 1) + 1)}>
            <ArrowDownIcon className="mr-2 size-4" />
            Insert Row Below
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => selectedCell && duplicateRow(selectedCell.row)}>
            <CopyPlusIcon className="mr-2 size-4" />
            Duplicate Row
          </ContextMenuItem>
          <ContextMenuItem onClick={deleteSelectedRows} className="text-destructive focus:text-destructive">
            <Trash2Icon className="mr-2 size-4" />
            Delete Row
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={copySelection}>
            <CopyIcon className="mr-2 size-4" />
            Copy
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={pasteClipboard}>
            <ClipboardPasteIcon className="mr-2 size-4" />
            Paste
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+V</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Keyboard hints */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          <kbd className="rounded bg-muted px-1">Tab</kbd> Next cell
        </span>
        <span>
          <kbd className="rounded bg-muted px-1">Enter</kbd> Next row
        </span>
        <span>
          <kbd className="rounded bg-muted px-1">F2</kbd> Edit
        </span>
        <span>
          <kbd className="rounded bg-muted px-1">Esc</kbd> Cancel
        </span>
        <span>
          <kbd className="rounded bg-muted px-1">Del</kbd> Clear
        </span>
        <span>
          <kbd className="rounded bg-muted px-1">Ctrl+D</kbd> Fill down
        </span>
      </div>
    </div>
  );
}

