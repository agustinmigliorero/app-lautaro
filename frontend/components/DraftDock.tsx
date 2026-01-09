"use client";

import { Minimize2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DraftDock({
  title,
  description,
  visible,
  onRestore,
  onDiscard,
  className,
}: {
  title: string;
  description?: string;
  visible: boolean;
  onRestore: () => void;
  onDiscard: () => void;
  className?: string;
}) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 w-[320px] rounded-lg border bg-background shadow-lg",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          {description ? (
            <div className="text-xs text-muted-foreground truncate">{description}</div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="secondary" onClick={onRestore} aria-label="Reabrir">
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDiscard} aria-label="Descartar borrador">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

