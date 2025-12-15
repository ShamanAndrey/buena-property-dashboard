"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import type { SelectOption } from "./types";

interface CellSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  onNavigate: (direction: "next" | "prev" | "nextRow") => void;
  onCancel: () => void;
  className?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

export function CellSelect({
  value,
  options,
  onChange,
  onNavigate,
  onCancel,
  className,
}: CellSelectProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value))
  );
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position on mount and when container changes
  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px gap
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();

    // Update on scroll or resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const items = list.querySelectorAll("[data-option]");
    const highlightedItem = items[highlightedIndex] as HTMLElement | undefined;
    if (highlightedItem) {
      highlightedItem.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const selectAndMove = (optionValue: string) => {
    onChange(optionValue);
    // onChange will trigger navigation via parent
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((i) => Math.min(options.length - 1, i + 1));
        break;

      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((i) => Math.max(0, i - 1));
        break;

      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        const selected = options[highlightedIndex];
        if (selected) {
          selectAndMove(selected.value);
        }
        break;

      case "Tab":
        e.preventDefault();
        e.stopPropagation();
        // Commit current highlighted value if different, then navigate
        const current = options[highlightedIndex];
        if (current && current.value !== value) {
          onChange(current.value);
        }
        onNavigate(e.shiftKey ? "prev" : "next");
        break;

      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        break;

      case " ": // Space - select like Enter
        e.preventDefault();
        e.stopPropagation();
        const spaceSelected = options[highlightedIndex];
        if (spaceSelected) {
          selectAndMove(spaceSelected.value);
        }
        break;
    }
  };

  const currentLabel = options.find((o) => o.value === value)?.label ?? value;

  // Render dropdown in a portal
  const dropdownContent = dropdownPosition && typeof document !== "undefined" && createPortal(
    <div
      ref={listRef}
      className="fixed z-[9999] max-h-48 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        minWidth: 120,
      }}
    >
      {options.map((option, index) => (
        <div
          key={option.value}
          data-option
          className={cn(
            "relative flex cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none transition-colors",
            index === highlightedIndex && "bg-accent text-accent-foreground",
            option.value === value && "font-medium"
          )}
          onMouseEnter={() => setHighlightedIndex(index)}
          onMouseDown={(e) => {
            // Prevent blur before click completes
            e.preventDefault();
          }}
          onClick={() => {
            selectAndMove(option.value);
          }}
        >
          {option.value === value && (
            <span className="absolute left-0.5 flex h-3.5 w-3.5 items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </span>
          )}
          <span className="ml-4">{option.label}</span>
        </div>
      ))}
    </div>,
    document.body
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn("relative h-8 w-full outline-none", className)}
      onKeyDown={handleKeyDown}
    >
      {/* Current value display with dropdown indicator */}
      <div className="flex h-full items-center justify-between px-2 bg-white dark:bg-gray-900 border-2 border-blue-500 rounded text-sm">
        <span className="truncate">{currentLabel}</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />
      </div>

      {/* Dropdown rendered in portal */}
      {dropdownContent}
    </div>
  );
}

