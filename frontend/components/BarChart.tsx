"use client";

import { cn } from "@/lib/utils";

export type BarDatum = { label: string; value: number; colorClassName?: string };

export function BarChart({
  title,
  data,
  className,
}: {
  title: string;
  data: BarDatum[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-sm font-medium">{title}</div>
      <div className="space-y-2">
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sin datos.</div>
        ) : (
          data.map((d) => (
            <div key={d.label} className="grid grid-cols-[160px_1fr_56px] items-center gap-3">
              <div className="text-xs text-muted-foreground truncate">{d.label}</div>
              <div className="h-2 rounded bg-muted/40 overflow-hidden border">
                <div
                  className={cn("h-full rounded bg-primary/70", d.colorClassName)}
                  style={{ width: `${Math.round((d.value / max) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-right tabular-nums">{d.value}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

