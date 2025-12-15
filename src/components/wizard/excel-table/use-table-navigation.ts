"use client";

import { useCallback, useState, useEffect, type KeyboardEvent } from "react";
import type { CellPosition, SelectionRange, ColumnId, WizardUnit } from "./types";
import { COLUMNS, COLUMN_COUNT, isSelectColumn } from "./constants";

interface UseTableNavigationOptions {
  rowCount: number;
  units: WizardUnit[];
  onAddRow: () => number; // Returns the new row index
  getCellValue: (row: number, col: number) => string;
  setCellValue: (row: number, col: number, value: string) => void;
  isCellEditable: (row: number, col: number) => boolean;
}

interface UseTableNavigationReturn {
  // Selection state
  selectedCell: CellPosition | null;
  selectionRange: SelectionRange | null;
  selectedRows: Set<number>;
  isEditing: boolean;
  editValue: string;

  // Computed
  normalizedRange: { startRow: number; endRow: number; startCol: number; endCol: number } | null;

  // Actions
  selectCell: (row: number, col: number) => void;
  startEditing: (row: number, col: number) => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  setEditValue: (value: string) => void;

  // Navigation
  navigate: (direction: "up" | "down" | "left" | "right") => void;
  navigateNext: (reverse?: boolean) => void;
  navigateNextRow: () => void;

  // Selection
  extendSelection: (row: number, col: number) => void;
  selectRow: (row: number, extend?: boolean) => void;
  clearSelection: () => void;

  // Cell utilities
  isCellSelected: (row: number, col: number) => boolean;
  isPrimaryCell: (row: number, col: number) => boolean;
  isRowSelected: (row: number) => boolean;

  // Keyboard handler for the table container
  handleTableKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;

  // Actions for editing cells
  handleCellClick: (row: number, col: number, e: React.MouseEvent) => void;
  handleCellDoubleClick: (row: number, col: number) => void;
  handleRowNumberClick: (row: number, e: React.MouseEvent) => void;

  // For cell components to call
  onCellNavigate: (direction: "next" | "prev" | "nextRow") => void;
  onCellChange: (value: string) => void;
  onCellCancel: () => void;
}

export function useTableNavigation({
  rowCount,
  units,
  onAddRow,
  getCellValue,
  setCellValue,
  isCellEditable,
}: UseTableNavigationOptions): UseTableNavigationReturn {
  // Core state
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  // Computed normalized range
  const normalizedRange = selectionRange
    ? {
        startRow: Math.min(selectionRange.start.row, selectionRange.end.row),
        endRow: Math.max(selectionRange.start.row, selectionRange.end.row),
        startCol: Math.min(selectionRange.start.col, selectionRange.end.col),
        endCol: Math.max(selectionRange.start.col, selectionRange.end.col),
      }
    : null;

  // Select a cell (clears range and row selection)
  const selectCell = useCallback((row: number, col: number) => {
    if (!isCellEditable(row, col)) return;
    setSelectedCell({ row, col });
    setSelectionRange(null);
    setSelectedRows(new Set());
    setIsEditing(false);
  }, [isCellEditable]);

  // Start editing a cell
  const startEditing = useCallback((row: number, col: number) => {
    if (!isCellEditable(row, col)) return;
    setSelectedCell({ row, col });
    setSelectionRange(null);
    setSelectedRows(new Set());
    setIsEditing(true);
    setEditValue(getCellValue(row, col));
  }, [getCellValue, isCellEditable]);

  // Commit the current edit
  const commitEdit = useCallback(() => {
    if (isEditing && selectedCell) {
      setCellValue(selectedCell.row, selectedCell.col, editValue);
    }
    setIsEditing(false);
  }, [isEditing, selectedCell, editValue, setCellValue]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue("");
  }, []);

  // Navigate in a direction
  const navigate = useCallback((direction: "up" | "down" | "left" | "right") => {
    if (!selectedCell) return;

    let newRow = selectedCell.row;
    let newCol = selectedCell.col;

    switch (direction) {
      case "up":
        newRow = Math.max(0, selectedCell.row - 1);
        break;
      case "down":
        newRow = Math.min(rowCount - 1, selectedCell.row + 1);
        break;
      case "left":
        newCol = Math.max(0, selectedCell.col - 1);
        break;
      case "right":
        newCol = Math.min(COLUMN_COUNT - 1, selectedCell.col + 1);
        break;
    }

    // Skip non-editable cells
    if (!isCellEditable(newRow, newCol)) {
      // Try to find next editable cell in same direction
      if (direction === "right" && newCol < COLUMN_COUNT - 1) {
        newCol++;
      } else if (direction === "left" && newCol > 0) {
        newCol--;
      }
    }

    setSelectedCell({ row: newRow, col: newCol });
    setSelectionRange(null);
    setSelectedRows(new Set());
  }, [selectedCell, rowCount, isCellEditable]);

  // Navigate to next/prev cell (Tab behavior)
  const navigateNext = useCallback((reverse = false) => {
    if (!selectedCell) return;

    let newRow = selectedCell.row;
    let newCol = selectedCell.col;

    if (reverse) {
      // Move backwards
      if (newCol > 0) {
        newCol--;
      } else if (newRow > 0) {
        newRow--;
        newCol = COLUMN_COUNT - 1;
      }
    } else {
      // Move forwards
      if (newCol < COLUMN_COUNT - 1) {
        newCol++;
      } else if (newRow < rowCount - 1) {
        newRow++;
        newCol = 0;
      } else {
        // At the end, add a new row
        newRow = onAddRow();
        newCol = 0;
      }
    }

    // Skip non-editable cells
    if (!isCellEditable(newRow, newCol)) {
      // Recursively find next editable
      setSelectedCell({ row: newRow, col: newCol });
      setSelectionRange(null);
      setSelectedRows(new Set());
      // Schedule another navigation
      setTimeout(() => navigateNext(reverse), 0);
      return;
    }

    // Start editing the new cell
    startEditing(newRow, newCol);
  }, [selectedCell, rowCount, onAddRow, isCellEditable, startEditing]);

  // Navigate to next row (Enter behavior)
  const navigateNextRow = useCallback(() => {
    if (!selectedCell) return;

    let newRow = selectedCell.row;
    const newCol = selectedCell.col;

    if (newRow < rowCount - 1) {
      newRow++;
    } else {
      // Add new row
      newRow = onAddRow();
    }

    startEditing(newRow, newCol);
  }, [selectedCell, rowCount, onAddRow, startEditing]);

  // Extend selection to a cell
  const extendSelection = useCallback((row: number, col: number) => {
    if (!selectedCell) return;
    setSelectionRange({
      start: selectedCell,
      end: { row, col },
    });
  }, [selectedCell]);

  // Select a row
  const selectRow = useCallback((row: number, extend = false) => {
    if (extend && selectedRows.size > 0) {
      const minRow = Math.min(row, ...selectedRows);
      const maxRow = Math.max(row, ...selectedRows);
      const newRows = new Set<number>();
      for (let r = minRow; r <= maxRow; r++) {
        newRows.add(r);
      }
      setSelectedRows(newRows);
    } else {
      setSelectedRows(new Set([row]));
    }
    setSelectedCell({ row, col: 0 });
    setSelectionRange({
      start: { row, col: 0 },
      end: { row, col: COLUMN_COUNT - 1 },
    });
  }, [selectedRows]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCell(null);
    setSelectionRange(null);
    setSelectedRows(new Set());
    setIsEditing(false);
  }, []);

  // Check if a cell is selected
  const isCellSelected = useCallback((row: number, col: number) => {
    if (selectedRows.has(row)) return true;
    if (!normalizedRange) {
      return selectedCell?.row === row && selectedCell?.col === col;
    }
    return (
      row >= normalizedRange.startRow &&
      row <= normalizedRange.endRow &&
      col >= normalizedRange.startCol &&
      col <= normalizedRange.endCol
    );
  }, [selectedCell, normalizedRange, selectedRows]);

  // Check if a cell is the primary (anchor) cell
  const isPrimaryCell = useCallback((row: number, col: number) => {
    return selectedCell?.row === row && selectedCell?.col === col;
  }, [selectedCell]);

  // Check if a row is selected
  const isRowSelected = useCallback((row: number) => {
    return selectedRows.has(row);
  }, [selectedRows]);

  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (isEditing) {
      commitEdit();
    }

    if (e.shiftKey && selectedCell) {
      // Extend selection
      extendSelection(row, col);
    } else {
      selectCell(row, col);
    }
  }, [isEditing, selectedCell, commitEdit, extendSelection, selectCell]);

  // Handle cell double-click
  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    startEditing(row, col);
  }, [startEditing]);

  // Handle row number click
  const handleRowNumberClick = useCallback((row: number, e: React.MouseEvent) => {
    if (isEditing) {
      commitEdit();
    }
    selectRow(row, e.shiftKey);
  }, [isEditing, commitEdit, selectRow]);

  // Callbacks for cell components
  const onCellNavigate = useCallback((direction: "next" | "prev" | "nextRow") => {
    switch (direction) {
      case "next":
        navigateNext(false);
        break;
      case "prev":
        navigateNext(true);
        break;
      case "nextRow":
        navigateNextRow();
        break;
    }
  }, [navigateNext, navigateNextRow]);

  const onCellChange = useCallback((value: string) => {
    if (selectedCell) {
      setCellValue(selectedCell.row, selectedCell.col, value);
    }
    setIsEditing(false);
  }, [selectedCell, setCellValue]);

  const onCellCancel = useCallback(() => {
    cancelEdit();
  }, [cancelEdit]);

  // Main keyboard handler for the table container
  const handleTableKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    // If editing, only handle Escape at this level
    // Other keys are handled by the cell components
    if (isEditing) {
      // Check if current cell is a Select column
      // If so, don't handle any keys here - let the cell handle them
      if (selectedCell && isSelectColumn(selectedCell.col)) {
        return;
      }

      if (e.key === "Escape") {
        cancelEdit();
        e.preventDefault();
        return;
      }

      // For text cells, Enter and Tab are handled by CellInput
      // Don't handle them here to avoid double-processing
      return;
    }

    // Not editing - handle navigation
    if (!selectedCell) return;

    switch (e.key) {
      case "F2":
        startEditing(selectedCell.row, selectedCell.col);
        e.preventDefault();
        break;

      case "Delete":
      case "Backspace":
        // Clear selected cells
        if (normalizedRange) {
          for (let row = normalizedRange.startRow; row <= normalizedRange.endRow; row++) {
            for (let col = normalizedRange.startCol; col <= normalizedRange.endCol; col++) {
              if (isCellEditable(row, col)) {
                setCellValue(row, col, "");
              }
            }
          }
        } else if (selectedCell) {
          if (isCellEditable(selectedCell.row, selectedCell.col)) {
            setCellValue(selectedCell.row, selectedCell.col, "");
          }
        }
        e.preventDefault();
        break;

      case "ArrowUp":
        if (e.shiftKey) {
          extendSelection(
            Math.max(0, (selectionRange?.end.row ?? selectedCell.row) - 1),
            selectionRange?.end.col ?? selectedCell.col
          );
        } else {
          navigate("up");
        }
        e.preventDefault();
        break;

      case "ArrowDown":
        if (e.shiftKey) {
          extendSelection(
            Math.min(rowCount - 1, (selectionRange?.end.row ?? selectedCell.row) + 1),
            selectionRange?.end.col ?? selectedCell.col
          );
        } else {
          navigate("down");
        }
        e.preventDefault();
        break;

      case "ArrowLeft":
        if (e.shiftKey) {
          extendSelection(
            selectionRange?.end.row ?? selectedCell.row,
            Math.max(0, (selectionRange?.end.col ?? selectedCell.col) - 1)
          );
        } else {
          navigate("left");
        }
        e.preventDefault();
        break;

      case "ArrowRight":
        if (e.shiftKey) {
          extendSelection(
            selectionRange?.end.row ?? selectedCell.row,
            Math.min(COLUMN_COUNT - 1, (selectionRange?.end.col ?? selectedCell.col) + 1)
          );
        } else {
          navigate("right");
        }
        e.preventDefault();
        break;

      case "Tab":
        navigateNext(e.shiftKey);
        e.preventDefault();
        break;

      case "Enter":
        if (selectedCell.row < rowCount - 1) {
          selectCell(selectedCell.row + 1, selectedCell.col);
        } else {
          const newRow = onAddRow();
          selectCell(newRow, selectedCell.col);
        }
        e.preventDefault();
        break;

      default:
        // Start typing to edit (single printable character)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          // Don't start editing for select columns
          if (!isSelectColumn(selectedCell.col)) {
            startEditing(selectedCell.row, selectedCell.col);
            setEditValue(e.key);
            e.preventDefault();
          }
        }
        break;
    }
  }, [
    isEditing,
    selectedCell,
    selectionRange,
    normalizedRange,
    rowCount,
    cancelEdit,
    startEditing,
    navigate,
    navigateNext,
    selectCell,
    extendSelection,
    setCellValue,
    isCellEditable,
    onAddRow,
  ]);

  return {
    // State
    selectedCell,
    selectionRange,
    selectedRows,
    isEditing,
    editValue,
    normalizedRange,

    // Actions
    selectCell,
    startEditing,
    commitEdit,
    cancelEdit,
    setEditValue,

    // Navigation
    navigate,
    navigateNext,
    navigateNextRow,

    // Selection
    extendSelection,
    selectRow,
    clearSelection,

    // Utilities
    isCellSelected,
    isPrimaryCell,
    isRowSelected,

    // Handlers
    handleTableKeyDown,
    handleCellClick,
    handleCellDoubleClick,
    handleRowNumberClick,

    // For cell components
    onCellNavigate,
    onCellChange,
    onCellCancel,
  };
}

