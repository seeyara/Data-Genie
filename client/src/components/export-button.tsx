import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface ExportButtonProps {
  totalCount: number;
  isExporting: boolean;
  onExport: () => void;
}

export function ExportButton({ totalCount, isExporting, onExport }: ExportButtonProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <p className="text-sm text-muted-foreground" data-testid="text-results-count">
        {totalCount.toLocaleString()} customer{totalCount !== 1 ? "s" : ""} found
      </p>
      <Button
        onClick={onExport}
        disabled={isExporting || totalCount === 0}
        data-testid="button-export-csv"
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Export CSV
      </Button>
    </div>
  );
}
