"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CellInputProps {
  value: string;
  onChange: (value: string) => void;
  onNavigate: (direction: "next" | "prev" | "nextRow") => void;
  onCancel: () => void;
  type?: "text" | "number";
  className?: string;
}

export function CellInput({
  value,
  onChange,
  onNavigate,
  onCancel,
  type = "text",
  className,
}: CellInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select all on mount
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const commitAndNavigate = (direction: "next" | "prev" | "nextRow") => {
    onChange(localValue);
    onNavigate(direction);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Tab":
        e.preventDefault();
        e.stopPropagation();
        commitAndNavigate(e.shiftKey ? "prev" : "next");
        break;

      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        commitAndNavigate("nextRow");
        break;

      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        break;

      case "ArrowUp":
        // Only handle if at start of input or it's a number field
        if (type === "number" || inputRef.current?.selectionStart === 0) {
          e.preventDefault();
          e.stopPropagation();
          onChange(localValue);
          onNavigate("prev"); // This is a bit of a hack - we'll handle arrow navigation in the hook
        }
        break;

      case "ArrowDown":
        // Only handle if at end of input or it's a number field
        if (
          type === "number" ||
          inputRef.current?.selectionStart === localValue.length
        ) {
          e.preventDefault();
          e.stopPropagation();
          onChange(localValue);
          onNavigate("next"); // This is a bit of a hack
        }
        break;
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        // Commit value on blur (when clicking elsewhere)
        onChange(localValue);
      }}
      className={cn(
        "h-8 w-full px-2 bg-white dark:bg-gray-900 border-2 border-blue-500 rounded text-sm outline-none",
        "focus:ring-0",
        className
      )}
    />
  );
}


