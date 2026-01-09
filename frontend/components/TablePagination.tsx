"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TablePagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 20],
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="text-sm text-muted-foreground">
        {total === 0 ? "0 resultados" : `${from}–${to} de ${total}`}
      </div>
      <div className="flex items-center gap-3">
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage - 1)}
            disabled={!canPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[90px] text-center text-sm text-muted-foreground">
            {safePage}/{totalPages}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage + 1)}
            disabled={!canNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

