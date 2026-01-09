"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export function SortableHead({
  label,
  active,
  dir,
  onToggle,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onToggle: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-8 px-2 -ml-2 font-medium", className)}
      onClick={onToggle}
    >
      <span>{label}</span>
      <Icon className="ml-2 h-4 w-4 opacity-70" />
    </Button>
  );
}

