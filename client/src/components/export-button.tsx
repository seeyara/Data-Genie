import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";

export type ExportFormat = "interakt" | "meta";

interface ExportButtonProps {
  totalCount: number;
  isExporting: boolean;
  onExport: (format: ExportFormat) => void;
}

export function ExportButton({ totalCount, isExporting, onExport }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("interakt");

  const handleConfirm = () => {
    onExport(format);
    setOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <p className="text-sm text-muted-foreground" data-testid="text-results-count">
        {totalCount.toLocaleString()} customer{totalCount !== 1 ? "s" : ""} found
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            onClick={() => setOpen(true)}
            disabled={isExporting || totalCount === 0}
            data-testid="button-export-csv"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export customers</DialogTitle>
            <DialogDescription>
              Choose an export format to download the filtered customer list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium">Format</p>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interakt">Interakt</SelectItem>
                <SelectItem value="meta">Meta Lookalike Audience</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button onClick={handleConfirm} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
